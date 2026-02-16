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
import logging
from scripts.utils.identifier import get_indicator_type
from scripts.core.engine import collect_data, generate_excel
from scripts.field_schema import apply_mapping, categorize_fields
from scripts.aggregators import (
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
from scripts.PROVIDER_METADATA import get_category_providers, get_presets
from scripts.constants import SOURCES, ADDITIONAL_SOURCES

logger = logging.getLogger(__name__)


# Helper functions for provider management
def _get_providers_safe(module, category_name):
    """
    Safely get available providers from a module with error handling.
    
    Args:
        module: The provider module with get_available_providers() method
        category_name: Display name for logging
    
    Returns:
        List of available provider IDs, or empty list on error
    """
    try:
        return module.get_available_providers()
    except Exception as e:
        logger.error(f"Failed to get {category_name} providers: {e}")
        return []


def _build_provider_list(category, available_providers):
    """
    Build provider list with metadata and availability status.
    
    Args:
        category: Provider category name
        available_providers: List of currently available provider IDs
    
    Returns:
        List of provider dictionaries with metadata and availability
    """
    return [
        {**meta, 'available': provider_id in available_providers}
        for provider_id, meta in get_category_providers(category).items()
    ]


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
    
    Flow:
    1. Call provider function to get raw data
    2. Apply optional provider-specific field mappings (normalization)
    3. Categorize into essential/additional based on central ESSENTIAL_FIELDS schema
    4. Return with metadata
    """
    try:
        logger.debug(f"Executing lookup: type={lookup_type}, provider={provider}, indicator_kind={indicator_kind}")
        
        # Handle reputation lookups with kind-specific logic
        if lookup_type == "reputation":
            if indicator_kind == "ip":
                result = reputation.get_ip(indicator_value, provider=provider, aggregate=False)
            elif indicator_kind == "domain":
                result = reputation.get_domain(indicator_value, provider=provider)
            elif indicator_kind == "hash":
                result = reputation.get_hash(indicator_value, provider=provider)
            else:
                logger.warning(f"Unsupported indicator kind for reputation: {indicator_kind}")
                return {"error": f"Unsupported indicator kind for reputation: {indicator_kind}"}
        # Handle all other lookup types via lookup table
        elif lookup_type in LOOKUP_HANDLERS:
            result = LOOKUP_HANDLERS[lookup_type](indicator_value, provider)
        else:
            logger.warning(f"Unsupported lookup type: {lookup_type}")
            return {"error": f"Unsupported lookup type: {lookup_type}"}
        
        # Ensure result is a dictionary
        if not isinstance(result, dict):
            result = {}
        
        # If there's an error, return it with metadata
        if result.get("error"):
            logger.warning(f"Lookup error for {lookup_type}/{provider}: {result.get('error')}")
            return {
                "error": result["error"],
                "_lookup_type": lookup_type,
                "_provider": provider or "auto",
            }
        
        # Step 1: Apply provider-specific field mappings (normalize field names)
        normalized_result = apply_mapping(result, lookup_type, provider)
        
        # Step 2: Categorize into essential/additional based on central schema
        categorized = categorize_fields(lookup_type, normalized_result)
        
        # Step 3: Build response with metadata
        response = {
            "essential": categorized["essential"],
            "additional": categorized["additional"],
            "_lookup_type": lookup_type,
            "_provider": provider or "auto",
        }
        
        logger.debug(f"Lookup completed successfully: {lookup_type}/{provider}")
        return response
        
    except Exception as exc:
        logger.error(f"Error in lookup {lookup_type}/{provider}: {exc}", exc_info=True)
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
        try:
            indicators = {"indicators": request.data.get("indicators", [])}
            serializer = self.serializer_class(data=indicators)
            if serializer.is_valid():
                indicators = serializer.validated_data["indicators"]
                logger.info(f"Identifying {len(indicators)} indicators")
                context = {"query_list": get_indicator_type(indicators)}
                return success(context["query_list"])
            else:
                logger.warning(f"Invalid indicators payload: {serializer.errors}")
                return error(
                    "Invalid indicators payload",
                    code="validation_error",
                    details=serializer.errors,
                    status_code=400,
                )
        except Exception as e:
            logger.error(f"Error in identifier: {e}", exc_info=True)
            return error(
                "Failed to identify indicators",
                code="processing_error",
                status_code=500,
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
        try:
            indicators_payload = request.data.get("indicators", [])
            
            # Check if this is a batch lookup request (with providers_by_type)
            is_batch_request = (
                isinstance(indicators_payload, list)
                and (len(indicators_payload) == 0 or isinstance(indicators_payload[0], str))
                and "providers_by_type" in request.data
            )

            if is_batch_request:
                logger.info(f"Batch lookup request: {len(indicators_payload)} indicators")
                serializer = BatchIndicatorLookupSerializer(data=request.data)
                if not serializer.is_valid():
                    logger.warning(f"Invalid batch lookup payload: {serializer.errors}")
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
                    logger.warning("No lookup types requested")
                    return error(
                        "No lookup types requested",
                        code="validation_error",
                        status_code=400,
                    )
                
                # Lookup types are determined by the keys in providers_by_type
                lookup_types = list(providers_by_type.keys())
                logger.debug(f"Requested lookup types: {lookup_types}")

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

                logger.info(f"Batch lookup completed: {len(results)} indicators processed")
                return success({"results": results, "indicator_types": indicator_types})

            # Handle traditional item-based lookups (legacy support)
            logger.info(f"Item-based lookup request: {len(indicators_payload)} indicators")
            serializer = self.serializer_class(data={"indicators": indicators_payload})
            if not serializer.is_valid():
                logger.warning(f"Invalid indicators payload: {serializer.errors}")
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
            logger.info(f"Item-based lookup completed: {len(results)} results")

            return success(results)
        except Exception as e:
            logger.error(f"Error in indicator lookup: {e}", exc_info=True)
            return error(
                "Failed to process lookup",
                code="processing_error",
                status_code=500,
            )


class AllProvidersView(viewsets.ViewSet):
    """Get all providers organized by type - unified endpoint"""
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        # Configuration for all provider categories
        categories_config = [
            ('whois', whois, 'whois'),
            ('ip_info', geolocation, 'geolocation'),
            ('reputation', reputation, 'reputation'),
            ('vulnerability', vulnerability, 'vulnerability'),
            ('email_validator', email_validator, 'email validator'),
            ('website_status', web_status, 'website status'),
            ('passive_dns', passive_dns, 'passive dns'),
            ('whois_history', whois_history, 'whois history'),
            ('dns', dns, 'dns'),
            ('reverse_dns', reverse_dns, 'reverse dns'),
            ('screenshot', screenshot, 'screenshot'),
            ('web_search', web_search, 'web search'),
        ]
        
        # Build response organized by type
        try:
            providers_by_type = {}
            
            # Get availability and build provider lists for all categories
            for category_key, module, display_name in categories_config:
                available = _get_providers_safe(module, display_name)
                providers_by_type[category_key] = _build_provider_list(category_key, available)
            
            return success({
                'providers_by_type': providers_by_type,
                'presets': get_presets(),
                'metadata': {
                    'version': '1.0',
                    'categories': list(providers_by_type.keys())
                }
            })
        except Exception as e:
            logger.error(f"Failed to build providers response: {e}")
            return error(f"Failed to load providers: {str(e)}", status_code=500)


class IntelligenceSourcesView(viewsets.ViewSet):
    """List intelligence sources with capabilities and supported types"""
    permission_classes = [IsAuthenticated]

    def list(self, request):
        data_needs = {
            "dns": {
                "label": "DNS",
                "supported_types": ["domain", "url", "ipv4"],
            },
            "whois": {
                "label": "WHOIS",
                "supported_types": ["domain", "url"],
            },
            "passive-dns": {
                "label": "Passive DNS",
                "supported_types": ["domain", "ipv4", "url"],
            },
            "blocklists": {
                "label": "Blocklists",
                "supported_types": ["domain", "ipv4", "url"],
            },
            "reputation": {
                "label": "Reputation",
                "supported_types": ["domain", "ipv4", "url", "md5", "sha1", "sha256", "sha512"],
            },
            "vulnerability": {
                "label": "Vulnerability",
                "supported_types": ["cve"],
            },
            "malware-analysis": {
                "label": "Malware Analysis",
                "supported_types": ["md5", "sha1", "sha256", "sha512"],
            },
            "screenshot": {
                "label": "Screenshot",
                "supported_types": ["domain", "url", "ipv4"],
            },
            "availability": {
                "label": "Availability",
                "supported_types": ["domain", "url", "ipv4"],
            },
            "email": {
                "label": "Email",
                "supported_types": ["email"],
            },
        }

        sources = SOURCES
        sources_by_need = {}
        for need_key, need in data_needs.items():
            sources_by_need[need_key] = [
                key
                for key, source in sources.items()
                if need_key in source.get("capabilities", [])
            ]

        return success(
            {
                "sources": sources,
                "additional_sources": ADDITIONAL_SOURCES,
                "data_needs": data_needs,
                "sources_by_need": sources_by_need,
            }
        )
