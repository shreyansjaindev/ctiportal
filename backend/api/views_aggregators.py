"""
API views with provider selection support for aggregated lookups
"""
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from api.response import success, error
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
    screenshot
)
from scripts.PROVIDER_METADATA import (
    get_category_providers, 
    get_presets
)
import logging

logger = logging.getLogger(__name__)


# Helper functions to reduce redundancy
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


class AllProvidersView(APIView):
    """Get all providers organized by type - unified endpoint"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
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


class WhoisView(APIView):
    """WHOIS lookup with optional provider selection"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        domain = request.query_params.get('domain')
        provider = request.query_params.get('provider')  # Optional
        
        if not domain:
            return error("domain parameter required", code="validation_error", status_code=400)
        
        # Get WHOIS data (auto-fallback if provider not specified)
        data = whois.get(domain, provider=provider)
        
        return success(data)


class WhoisProvidersView(APIView):
    """List available WHOIS providers"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        available = _get_providers_safe(whois, 'whois')
        provider_list = _build_provider_list('whois', available)
        
        return success({
            'providers': provider_list,
            'available': available
        })


class GeolocationView(APIView):
    """IP geolocation lookup with optional provider selection"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        ip = request.query_params.get('ip')
        provider = request.query_params.get('provider')
        
        if not ip:
            return error("ip parameter required", code="validation_error", status_code=400)
        
        data = geolocation.get(ip, provider=provider)
        
        return success(data)


class GeolocationProvidersView(APIView):
    """List available geolocation providers"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        available = _get_providers_safe(geolocation, 'geolocation')
        provider_list = _build_provider_list('geolocation', available)
        
        return success({
            'providers': provider_list,
            'available': available
        })


class IPReputationView(APIView):
    """IP reputation lookup with optional provider selection"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        ip = request.query_params.get('ip')
        provider = request.query_params.get('provider')
        aggregate = request.query_params.get('aggregate', 'true').lower() == 'true'
        
        if not ip:
            return error("ip parameter required", code="validation_error", status_code=400)
        
        data = reputation.get_ip(ip, provider=provider, aggregate=aggregate)
        
        return success(data)


class DomainReputationView(APIView):
    """Domain reputation lookup with optional provider selection"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        domain = request.query_params.get('domain')
        provider = request.query_params.get('provider')
        
        if not domain:
            return error("domain parameter required", code="validation_error", status_code=400)
        
        data = reputation.get_domain(domain, provider=provider)
        
        return success(data)


class ReputationProvidersView(APIView):
    """List available reputation providers"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        resource_type = request.query_params.get('type', 'ip')  # ip or domain
        try:
            available = reputation.get_available_providers(resource_type)
        except Exception as e:
            logger.error(f"Failed to get reputation providers: {e}")
            available = []
        
        provider_list = _build_provider_list('reputation', available)
        
        return success({
            'providers': provider_list,
            'available': available,
            'resource_type': resource_type
        })


class VulnerabilityView(APIView):
    """Vulnerability lookup with optional provider selection"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cve = request.query_params.get('cve')
        provider = request.query_params.get('provider')

        if not cve:
            return error("cve parameter required", code="validation_error", status_code=400)

        data = vulnerability.get(cve, provider=provider)

        return success(data)


class VulnerabilityProvidersView(APIView):
    """List available vulnerability providers"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        available = _get_providers_safe(vulnerability, 'vulnerability')
        provider_list = _build_provider_list('vulnerability', available)

        return success({
            'providers': provider_list,
            'available': available
        })
