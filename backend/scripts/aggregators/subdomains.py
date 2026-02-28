"""
Subdomain enumeration aggregator
"""
import logging
from typing import Optional, Dict, Any

from ..providers.virustotal import get_subdomains as virustotal_subdomains
from ..providers.securitytrails import get_subdomains as securitytrails_subdomains

logger = logging.getLogger(__name__)

PROVIDERS = {
    'virustotal': virustotal_subdomains,
    'securitytrails': securitytrails_subdomains,
}


def get(domain: str, provider: Optional[str] = None) -> Dict[str, Any]:
    """
    Get subdomains for a domain.

    Args:
        domain: Domain to query
        provider: Specific provider to use (None for auto-fallback). Options: 'virustotal', 'securitytrails'
    """
    if provider is not None:
        if provider not in PROVIDERS:
            return {'error': f'Provider {provider} not available'}
        result = PROVIDERS[provider](domain)
        if result and not result.get('error'):
            result['_provider'] = provider
        return result

    for prov_id, func in PROVIDERS.items():
        result = func(domain)
        if result and not result.get('error'):
            result['_provider'] = prov_id
            return result

    return {'error': 'All subdomain providers failed'}
