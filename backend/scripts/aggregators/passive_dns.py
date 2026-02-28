"""
Passive DNS aggregator for historical DNS records
"""
import logging
from typing import Optional, Dict, Any

from ..providers.securitytrails import get_passive_dns as securitytrails_passive_dns
from ..providers.virustotal import get_passive_dns as virustotal_passive_dns

logger = logging.getLogger(__name__)

PROVIDERS = {
    'securitytrails': securitytrails_passive_dns,
    'virustotal': virustotal_passive_dns,
}


def get(domain: str, provider: Optional[str] = None) -> Dict[str, Any]:
    """
    Get passive DNS records for a domain.

    Args:
        domain: Domain to query
        provider: Specific provider to use (None for auto-fallback). Options: 'securitytrails', 'virustotal'
    """
    if provider is not None:
        if provider not in PROVIDERS:
            return {'error': f'Provider {provider} not available'}
        result = PROVIDERS[provider](domain)
        if not result.get('error'):
            result['_provider'] = provider
        return result

    for prov_id, func in PROVIDERS.items():
        result = func(domain)
        if result and not result.get('error'):
            result['_provider'] = prov_id
            return result
