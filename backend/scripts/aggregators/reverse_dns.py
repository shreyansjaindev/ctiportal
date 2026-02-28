"""
Reverse DNS aggregator for IP to hostname resolution
"""
import logging
from typing import Optional, Dict, Any

from ..providers.builtin_dns import ip_to_hostname
from ..providers.securitytrails import get_reverse_dns as securitytrails_reverse_dns

logger = logging.getLogger(__name__)

# SecurityTrails first (richer data), builtin DNS as fallback
PROVIDERS = {
    'securitytrails': securitytrails_reverse_dns,
    'builtin_dns': ip_to_hostname,
}


def get(ip: str, provider: Optional[str] = None) -> Dict[str, Any]:
    """
    Get reverse DNS (PTR) records for an IP address.

    Args:
        ip: IP address to query
        provider: Specific provider to use (None for auto-fallback). Options: 'builtin_dns', 'securitytrails'
    """
    if provider is not None:
        if provider not in PROVIDERS:
            return {'error': f'Provider {provider} not available'}
        result = PROVIDERS[provider](ip)
        if not result.get('error'):
            result['_provider'] = provider
        return result

    for prov_id, func in PROVIDERS.items():
        result = func(ip)
        if result and not result.get('error'):
            result['_provider'] = prov_id
            return result
