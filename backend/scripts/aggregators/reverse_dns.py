"""
Reverse DNS aggregator for IP to hostname resolution
"""
import logging
import os

logger = logging.getLogger(__name__)


def get_available_providers():
    """Returns list of available reverse DNS providers based on API keys"""
    available = []
    
    # System DNS - always available
    available.append('system_dns')
    
    # SecurityTrails - check for API key
    if os.getenv('SECURITYTRAILS'):
        available.append('securitytrails')
    
    return available


def get(ip, provider=None):
    """
    Get reverse DNS (PTR) record for an IP
    
    Args:
        ip: IP address to query
        provider: Specific provider to use (optional)
    
    Returns:
        dict: Reverse DNS data
    """
    available_providers = get_available_providers()
    
    if not available_providers:
        return {'error': 'No reverse DNS providers available'}
    
    # If specific provider requested
    if provider:
        if provider not in available_providers:
            return {'error': f'Provider {provider} not available'}
        
        if provider == 'system_dns':
            return _try_system_dns(ip)
        elif provider == 'securitytrails':
            return _try_securitytrails(ip)
    
    # Try providers in order of preference
    if 'securitytrails' in available_providers:
        result = _try_securitytrails(ip)
        if 'error' not in result:
            return result
    
    if 'system_dns' in available_providers:
        result = _try_system_dns(ip)
        if 'error' not in result:
            return result
    
    return {'error': 'All reverse DNS providers failed'}


def _try_system_dns(ip):
    """Get reverse DNS using system resolver"""
    try:
        from .lookup import ip_to_hostname
        return ip_to_hostname(ip)
    except Exception as e:
        logger.error(f"System reverse DNS failed: {e}")
        return {'error': str(e)}


def _try_securitytrails(ip):
    """Get reverse DNS from SecurityTrails"""
    try:
        from ..providers.securitytrails import get_reverse_dns
        return get_reverse_dns(ip)
    except Exception as e:
        logger.error(f"SecurityTrails reverse DNS failed: {e}")
        return {'error': str(e)}
