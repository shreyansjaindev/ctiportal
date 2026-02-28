"""
DNS aggregator for current DNS record lookups
"""
import logging
from typing import Optional, Dict, Any

from ..providers.builtin_dns import dns_records as builtin_dns_records
from ..providers.securitytrails import get_dns_records as securitytrails_dns_records
from ..providers.apininjas import dns_lookup as apininjas_dns_lookup
from ..providers.cloudflare import dns_query as cloudflare_dns_query

logger = logging.getLogger(__name__)

PROVIDERS = {
    'builtin_dns': builtin_dns_records,
    'cloudflare': cloudflare_dns_query,
    'securitytrails': securitytrails_dns_records,
    'api_ninjas': apininjas_dns_lookup,
}


def get(domain: str, provider: Optional[str] = None) -> Dict[str, Any]:
    """
    Get DNS records for a domain.

    Args:
        domain: Domain to query
        provider: Specific provider to use (default: 'builtin_dns'). Options: 'builtin_dns', 'cloudflare', 'securitytrails', 'api_ninjas'
    """
    prov_id = provider if provider is not None else 'builtin_dns'
    if prov_id not in PROVIDERS:
        return {'error': f'Provider {prov_id} not available'}

    result = PROVIDERS[prov_id](domain)
    if not result.get('error'):
        result['_provider'] = prov_id
    return result
