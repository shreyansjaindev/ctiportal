"""
Reverse DNS aggregator for IP to hostname resolution
"""
import logging

# Import provider functions at module level for early error detection
from ..providers.securitytrails import get_reverse_dns as securitytrails_reverse_dns
from .lookup import ip_to_hostname

logger = logging.getLogger(__name__)


def get(ip, provider=None):
    """
    Get reverse DNS (PTR) record for an IP
    
    Args:
        ip: IP address to query
        provider: Specific provider to use (optional)
    
    Returns:
        dict: Reverse DNS data
    """
    # If specific provider requested
    if provider:
        if provider == 'system_dns':
            return ip_to_hostname(ip)
        elif provider == 'securitytrails':
            return securitytrails_reverse_dns(ip)
        else:
            return {'error': f'Provider {provider} not available'}
    
    # Try providers in order of preference - SecurityTrails first if available, then system DNS
    result = securitytrails_reverse_dns(ip)
    if 'error' not in result:
        return result
    
    # Fallback to system DNS
    result = ip_to_hostname(ip)
    if 'error' not in result:
        return result
    
    return {'error': 'All reverse DNS providers failed'}
