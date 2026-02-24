"""
IP geolocation aggregator with multiple provider support
"""
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

# Import providers
from ..providers.ipapi import get_geolocation as ipapi_lookup

# Can add more providers later (e.g., ipapi.com paid, ipgeolocation.io, etc.)

PROVIDER_CONFIG = {
    'ipapi': {
        'lookup': ipapi_lookup,
    }
}


def get_available_providers() -> List[str]:
    """Get list of available geolocation providers"""
    return list(PROVIDER_CONFIG.keys())


def get(ip: str, provider: Optional[str] = None) -> Dict[str, Any]:
    """
    Get IP geolocation with automatic fallbacks
    
    Args:
        ip: IP address to lookup
        provider: Specific provider to use (None for auto-fallback)
                 Options: 'ipapi'
        
    Returns:
        Geolocation data dictionary with '_provider' metadata
    """
    # If specific provider requested
    if provider == 'ipapi':
        result = ipapi_lookup(ip)
        if not result.get('error'):
            result['_provider'] = 'ipapi'
            return result
        return result
    elif provider is not None:
        return {
            'error': f'Provider {provider} not available',
            'available_providers': get_available_providers()
        }
    
    # Auto-fallback chain
    result = ipapi_lookup(ip)
    if result and not result.get('error'):
        result['_provider'] = 'ipapi'
        return result
    
    return {'error': 'No geolocation providers available'}
