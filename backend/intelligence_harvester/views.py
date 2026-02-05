from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import *
from .serializers import *
from .filters import *
from rest_framework.response import Response
from rest_framework import status
from django.http import FileResponse
import openpyxl
import io
from scripts.identifier import get_indicator_type
from scripts.engine import collect_data, generate_excel
from scripts import (
    whois,
    geolocation,
    reputation,
    vulnerability,
    email_validator,
    web_status,
    passive_dns,
    whois_history,
    dns,
    reverse_dns,
    web_search,
    screenshot,
)
from rest_framework.renderers import BaseRenderer, JSONRenderer
from api.response import error, success


# Lookup routing functions
def normalize_indicator_kind(indicator_type: str) -> str:
    """
    Normalize backend indicator type to lookup kind.
    
    Maps detailed indicator types to broader categories used for lookup routing.
    """
    if indicator_type in ["ipv4", "ipv6"]:
        return "ip"
    if indicator_type in ["domain", "url", "url_with_http", "url_without_http"]:
        return "domain"
    if indicator_type == "email":
        return "email"
    if indicator_type == "cve":
        return "cve"
    if indicator_type in ["md5", "sha1", "sha256", "sha512"]:
        return "hash"
    if indicator_type == "keyword":
        return "keyword"
    return "unknown"


def is_lookup_applicable(lookup_type: str, indicator_kind: str) -> bool:
    """
    Check if a lookup type is applicable for an indicator kind.
    """
    if lookup_type in [
        "whois",
        "whois_history",
        "dns",
        "passive_dns",
        "screenshot",
        "web_search",
        "website_status",
    ]:
        return (
            indicator_kind in ["domain", "keyword"]
            if lookup_type == "web_search"
            else indicator_kind == "domain"
        )
    if lookup_type in ["ip_info", "reverse_dns"]:
        return indicator_kind == "ip"
    if lookup_type == "email_validator":
        return indicator_kind == "email"
    if lookup_type == "vulnerability":
        return indicator_kind == "cve"
    if lookup_type == "reputation":
        return indicator_kind in ["ip", "domain", "hash"]
    return False


# Lookup type to function mapping
LOOKUP_HANDLERS = {
    "whois": lambda val, prov: whois.get(val, provider=prov),
    "ip_info": lambda val, prov: geolocation.get(val, provider=prov),
    "passive_dns": lambda val, prov: passive_dns.get(val, provider=prov),
    "whois_history": lambda val, prov: whois_history.get(val, provider=prov),
    "dns": lambda val, prov: dns.get(val, provider=prov),
    "reverse_dns": lambda val, prov: reverse_dns.get(val, provider=prov),
    "screenshot": lambda val, prov: screenshot.get(val, provider=prov),
    "email_validator": lambda val, prov: email_validator.get(val, provider=prov),
    "vulnerability": lambda val, prov: vulnerability.get(val, provider=prov),
    "web_search": lambda val, prov: web_search.get(val, provider=prov),
    "website_status": lambda val, prov: web_status.get(val, provider=prov),
}


def execute_lookup(lookup_type: str, indicator_value: str, indicator_kind: str, provider=None) -> dict:
    """
    Execute a single lookup for the given type and indicator.
    
    Returns a dictionary with the result or error information.
    Always includes _lookup_type and _provider metadata.
    """
    try:
        # Handle reputation lookups with kind-specific logic
        if lookup_type == "reputation":
            if indicator_kind == "ip":
                result = reputation.get_ip(indicator_value, provider=provider, aggregate=False)
            elif indicator_kind == "domain":
                result = reputation.get_domain(indicator_value, provider=provider)
            elif indicator_kind == "hash":
                result = reputation.get_hash(indicator_value, provider=provider)
            else:
                return {"error": f"Unsupported indicator kind for reputation: {indicator_kind}"}
        # Handle all other lookup types via lookup table
        elif lookup_type in LOOKUP_HANDLERS:
            result = LOOKUP_HANDLERS[lookup_type](indicator_value, provider)
        else:
            return {"error": f"Unsupported lookup type: {lookup_type}"}
        
        # Ensure result is a dictionary
        if not isinstance(result, dict):
            result = {}
        
        # Add metadata
        result["_lookup_type"] = lookup_type
        result["_provider"] = provider or "auto"
        
        return result
        
    except Exception as exc:
        return {
            "error": str(exc),
            "_lookup_type": lookup_type,
            "_provider": provider or "auto",
        }

class SourceViewSet(viewsets.ModelViewSet):
    queryset = Source.objects.all()
    serializer_class = SourceSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = SourceFilter


class IdentifierViewSet(viewsets.ViewSet):
    serializer_class = IndicatorSerializer

    def create(self, request, *args, **kwargs):
        indicators = {"indicators": request.data.get("indicators", [])}
        serializer = self.serializer_class(data=indicators)
        if serializer.is_valid():
            indicators = serializer.validated_data["indicators"]
            context = {"query_list": get_indicator_type(indicators)}
            return success(context["query_list"])
        else:
            return error(
                "Invalid indicators payload",
                code="validation_error",
                details=serializer.errors,
                status_code=400,
            )


# Constants
EXCEL_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
EXCEL_FILENAME = 'attachment; filename="Intelligence_Harvester_Export.xlsx"'


class ExcelRenderer(BaseRenderer):
    media_type = EXCEL_CONTENT_TYPE
    format = "xlsx"
    charset = None
    render_style = "binary"

    def render(self, data, media_type=None, renderer_context=None):
        wb = openpyxl.Workbook()
        wb = generate_excel(wb, data)

        if not wb.sheetnames:
            wb.create_sheet("No Results")

        # Save workbook to a BytesIO object
        output = io.BytesIO()
        wb.save(output)

        output.seek(0)

        # Create a FileResponse with the correct content type and headers
        response = FileResponse(output, content_type=self.media_type)
        response["Content-Disposition"] = "attachment; filename=download.xlsx"
        return response


class IndicatorLookupViewSet(viewsets.ViewSet):
    """
    ViewSet for performing batch indicator lookups across multiple types and providers.
    
    This endpoint accepts indicators and requested lookup types, then returns
    aggregated results from the configured providers.
    
    Attributes:
        serializer_class: Serializer for individual item-based lookups
        renderer_classes: JSON and Excel output formats
        permission_classes: Requires authentication
    """
    serializer_class = IndicatorLookupSerializer
    renderer_classes = [JSONRenderer, ExcelRenderer]
    permission_classes = [IsAuthenticated]

    def create(self, request):
        """
        Execute indicator lookups with specified providers.
        
        Expected request format:
        {
            "indicators": ["example.com"],
            "providers_by_type": {
                "whois": ["whoisxml"],
                "reputation": ["abuseipdb"]
            }
        }
        """
        indicators_payload = request.data.get("indicators", [])
        
        # Check if this is a batch lookup request (with providers_by_type)
        is_batch_request = (
            isinstance(indicators_payload, list)
            and (len(indicators_payload) == 0 or isinstance(indicators_payload[0], str))
            and "providers_by_type" in request.data
        )

        if is_batch_request:
            serializer = BatchIndicatorLookupSerializer(data=request.data)
            if not serializer.is_valid():
                return error(
                    "Invalid batch lookup payload",
                    code="validation_error",
                    details=serializer.errors,
                    status_code=400,
                )

            indicators = serializer.validated_data["indicators"]
            providers_by_type = serializer.validated_data["providers_by_type"]
            
            # Validate providers_by_type is not empty
            if not providers_by_type:
                return error(
                    "No lookup types requested",
                    code="validation_error",
                    status_code=400,
                )
            
            # Lookup types are determined by the keys in providers_by_type
            lookup_types = list(providers_by_type.keys())

            detected = get_indicator_type(indicators)
            indicator_types = {item["value"]: item["type"] for item in detected}

            # Build results for each indicator
            results = []
            for indicator_value in indicators:
                indicator_type = indicator_types.get(indicator_value, "unknown")
                indicator_kind = normalize_indicator_kind(indicator_type)
                indicator_results = []

                # Run applicable lookups for this indicator
                for lookup_type in lookup_types:
                    if not is_lookup_applicable(lookup_type, indicator_kind):
                        continue

                    providers = providers_by_type.get(lookup_type) or [None]
                    for provider in providers:
                        result = execute_lookup(lookup_type, indicator_value, indicator_kind, provider)
                        indicator_results.append(result)

                results.append(
                    {
                        "indicator": indicator_value,
                        "indicator_type": indicator_type,
                        "results": indicator_results,
                    }
                )

            return success({"results": results, "indicator_types": indicator_types})

        # Handle traditional item-based lookups (legacy support)
        serializer = self.serializer_class(data={"indicators": indicators_payload})
        if not serializer.is_valid():
            return error(
                "Invalid indicators payload",
                code="validation_error",
                details=serializer.errors,
                status_code=400,
            )

        indicators = serializer.validated_data["indicators"]

        indicator_data_list = [
            {
                "id": indicator.get("id"),
                "value": indicator.get("value"),
                "value_type": indicator.get("type"),
                "sources": indicator.get("checklist"),
            }
            for indicator in indicators
        ]

        results = collect_data(indicator_data_list)

        return success(results)
