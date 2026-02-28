"""
WHOIS history aggregator for historical domain registration records
"""
import logging
from typing import Optional, Dict, Any

from ..providers.whoisxmlapi import get_whois_history as whoisxml_whois_history
from ..providers.securitytrails import get_whois_history as securitytrails_whois_history

logger = logging.getLogger(__name__)

PROVIDERS = {
    'whoisxml': whoisxml_whois_history,
    'securitytrails': securitytrails_whois_history,
}


def get(domain: str, provider: Optional[str] = None) -> Dict[str, Any]:
    """
    Get WHOIS history for a domain.

    Args:
        domain: Domain to query
        provider: Specific provider to use (None for auto-fallback). Options: 'whoisxml', 'securitytrails'
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
    return {'error': 'All WHOIS history providers failed'}
