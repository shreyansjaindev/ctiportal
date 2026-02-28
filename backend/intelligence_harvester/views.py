from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .serializers import IndicatorSerializer, BatchIndicatorLookupSerializer
import openpyxl
import io
import logging
from datetime import datetime, timezone
from django.utils.timezone import make_aware
from scripts.utils.identifier import get_indicator_type
from scripts.core.engine import generate_excel, generate_sha256_hash
from scripts.field_schema import categorize_fields
from scripts.provider_config import (
    get_category_providers,
    get_presets,
    LOOKUP_MODULES,
    INDICATOR_LOOKUPS,
)
from scripts.aggregators import reputation
from rest_framework.renderers import BaseRenderer, JSONRenderer
from api.response import error, success
from .models import Source


logger = logging.getLogger(__name__)

# Cache timeout in minutes (8 hours)
CACHE_TIMEOUT_MINUTES = 480


def is_lookup_applicable(lookup_type: str, indicator_type: str) -> bool:
    """Check if a lookup type is applicable for an indicator type"""
    applicable_lookups = INDICATOR_LOOKUPS.get(indicator_type, [])
    return lookup_type in applicable_lookups


def execute_lookup(lookup_type: str, indicator_value: str, indicator_type: str, provider=None) -> dict:
    """
    Execute a single lookup for the given type and indicator with caching support.
    Returns provider data categorized into essential/additional fields.
    """
    try:
        logger.debug(f"Executing lookup: type={lookup_type}, provider={provider}, indicator_type={indicator_type}")
        
        # Generate cache key
        normalized_value = indicator_value.lower()
        hashed_value = generate_sha256_hash(normalized_value)
        cache_source = f"{lookup_type}_{provider or 'auto'}"
        
        # Check cache first
        try:
            cached_entry = Source.objects.filter(
                hashed_value=hashed_value,
                source=cache_source
            ).first()
            
            if cached_entry:
                # Check if cache is still valid
                entry_created = cached_entry.created
                if entry_created.tzinfo is None:
                    entry_created = make_aware(entry_created, timezone=timezone.utc)
                
                timestamp_now = datetime.now(timezone.utc)
                time_elapsed = (timestamp_now - entry_created).total_seconds() // 60
                
                if time_elapsed < CACHE_TIMEOUT_MINUTES:
                    # Cache hit - return cached data
                    logger.debug(f"Cache hit for {lookup_type}/{provider} on {indicator_value}")
                    # data is already a dict (JSONField), no need to parse
                    return cached_entry.data
                else:
                    # Cache expired - delete it
                    logger.debug(f"Cache expired for {lookup_type}/{provider} on {indicator_value}")
                    cached_entry.delete()
        except Exception as cache_error:
            logger.warning(f"Error checking cache: {cache_error}")
            # Continue with fresh lookup if cache check fails
        
        # Cache miss or expired - perform fresh lookup
        logger.debug(f"Cache miss for {lookup_type}/{provider} on {indicator_value}, performing fresh lookup")
        
        # Handle reputation lookups with type-specific routing
        if lookup_type == "reputation":
            if indicator_type in ['ipv4', 'ipv6']:
                result = reputation.get_ip(indicator_value, provider=provider)
            elif indicator_type == "domain":
                result = reputation.get_domain(indicator_value, provider=provider)
            elif indicator_type in ['md5', 'sha1', 'sha256', 'sha512']:
                result = reputation.get_hash(indicator_value, provider=provider)
            else:
                return {"error": f"Unsupported indicator type for reputation: {indicator_type}"}
        # Handle all other lookup types
        else:
            module = LOOKUP_MODULES.get(lookup_type)
            if not module:
                return {"error": f"Unsupported lookup type: {lookup_type}"}
            result = module.get(indicator_value, provider=provider)
        
        # Ensure result is a dictionary
        if not isinstance(result, dict):
            result = {}
        
        # If there's an error, return it with metadata (don't cache errors)
        if result.get("error"):
            logger.warning(f"Lookup error for {lookup_type}/{provider}: {result.get('error')}")
            return {
                "error": result["error"],
                "_lookup_type": lookup_type,
                "_provider": provider or "auto",
            }
        
        # Categorize into essential/additional based on field schema
        categorized = categorize_fields(lookup_type, result)
        
        # Build response with metadata
        response = {
            "essential": categorized["essential"],
            "additional": categorized["additional"],
            "_lookup_type": lookup_type,
            "_provider": provider or "auto",
        }
        
        # Store successful result in cache
        try:
            Source.objects.update_or_create(
                hashed_value=hashed_value,
                source=cache_source,
                defaults={
                    'value': normalized_value,
                    'value_type': indicator_type,
                    'data': response,  # JSONField handles dict directly
                }
            )
            logger.debug(f"Cached result for {lookup_type}/{provider} on {indicator_value}")
        except Exception as cache_error:
            logger.warning(f"Error storing cache: {cache_error}")
            # Continue even if caching fails
        
        logger.debug(f"Lookup completed successfully: {lookup_type}/{provider}")
        return response
        
    except Exception as exc:
        logger.error(f"Error in lookup {lookup_type}/{provider}: {exc}", exc_info=True)
        return {
            "error": str(exc),
            "_lookup_type": lookup_type,
            "_provider": provider or "auto",
        }

class IdentifierViewSet(viewsets.ViewSet):
    serializer_class = IndicatorSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        try:
            indicators = {"indicators": request.data.get("indicators", [])}
            serializer = self.serializer_class(data=indicators)
            if serializer.is_valid():
                indicators = serializer.validated_data["indicators"]
                logger.info(f"Identifying {len(indicators)} indicators")
                result = get_indicator_type(indicators)
                logger.debug(f"Identifier result: {result}")
                return success(result)
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


# FileResponse is no longer used — Excel bytes are returned directly from ExcelRenderer.
class ExcelRenderer(BaseRenderer):
    """Render lookup results as Excel spreadsheet"""
    media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    format = "xlsx"
    charset = None
    render_style = "binary"

    def render(self, data, media_type=None, renderer_context=None):
        wb = openpyxl.Workbook()
        wb = generate_excel(wb, data)

        if not wb.sheetnames:
            wb.create_sheet("No Results")

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        # Set Content-Disposition via the response in renderer_context.
        # Renderers must return bytes — returning a Response object here is wrong.
        if renderer_context:
            resp = renderer_context.get("response")
            if resp:
                resp["Content-Disposition"] = 'attachment; filename="Intelligence_Harvester_Export.xlsx"'

        return output.read()


class IndicatorLookupViewSet(viewsets.ViewSet):
    """Perform batch indicator lookups across multiple types and providers"""
    serializer_class = BatchIndicatorLookupSerializer
    renderer_classes = [JSONRenderer, ExcelRenderer]
    permission_classes = [IsAuthenticated]

    def create(self, request):
        """
        Execute indicator lookups with specified providers.
        
        Expected request format:
        {
            "indicators": ["example.com"],
            "providers_by_type": {
                "whois": ["whoisxmlapi"],
                "reputation": ["abuseipdb"]
            }
        }
        """
        try:
            indicators_payload = request.data.get("indicators", [])
            
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
                indicator_results = []

                # Run applicable lookups for this indicator
                for lookup_type in lookup_types:
                    if not is_lookup_applicable(lookup_type, indicator_type):
                        continue

                    providers = providers_by_type.get(lookup_type) or [None]
                    for provider in providers:
                        result = execute_lookup(lookup_type, indicator_value, indicator_type, provider)
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
        try:
            providers_by_type = {}
            
            # Build provider list for each lookup type
            for lookup_type, module in LOOKUP_MODULES.items():
                # Get provider metadata - all configured providers are supported
                # Actual availability is determined by API key presence at lookup time
                provider_metadata = get_category_providers(lookup_type)
                providers_by_type[lookup_type] = [
                    {**meta, 'available': True}
                    for provider_id, meta in provider_metadata.items()
                ]
            
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
