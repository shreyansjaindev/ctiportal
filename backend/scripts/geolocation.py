"""
IP geolocation aggregator with multiple provider support
"""
import logging
import os
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

# Import providers
try:
    from .providers.ipapi_free import get_geolocation as ipapi_lookup
    IPAPI_AVAILABLE = True
except ImportError:
    IPAPI_AVAILABLE = False
    logger.debug("IP-API not available")

# Can add more providers later (e.g., ipapi.com paid, ipgeolocation.io, etc.)


def get_available_providers() -> List[str]:
    """Get list of available geolocation providers"""
    providers = []
    if IPAPI_AVAILABLE:
        providers.append('ipapi')
    return providers


def get(ip: str, provider: Optional[str] = None) -> Dict[str, Any]:
    """
    Get IP geolocation with automatic fallbacks
    
    Args:
        ip: IP address to lookup
        provider: Specific provider to use (None for auto-fallback)
                 Options: 'ipapi'
        
    Returns:
        Geolocation data dictionary with '_provider' key
    """
    # If specific provider requested
    if provider == 'ipapi' and IPAPI_AVAILABLE:
        result = _try_ipapi(ip)
        if not result.get('error'):
            result['_provider'] = 'ipapi'
        return result
    elif provider is not None:
        return {
            'error': f'Provider {provider} not available',
            'available_providers': get_available_providers()
        }
    
    # Auto-fallback chain
    if IPAPI_AVAILABLE:
        result = _try_ipapi(ip)
        if result and not result.get('error'):
            result['_provider'] = 'ipapi'
            return result
    
    return {'error': 'No geolocation providers available'}


def _try_ipapi(ip: str) -> Dict[str, Any]:
    """Try IP-API lookup"""
    try:
        return ipapi_lookup(ip)
    except Exception as e:
        logger.error(f"Free IP-API error: {e}")
        return {'error': str(e)}
