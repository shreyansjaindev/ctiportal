"""
DNS aggregator for current DNS record lookups
"""
import logging

# Import provider functions at module level for early error detection
from .lookup import dns_records as system_dns_records
from ..providers.securitytrails import get_dns_records as securitytrails_dns_records
from ..providers.apininjas import dns_lookup as apininjas_dns_lookup
from ..providers.cloudflare import dns_query as cloudflare_dns_query

logger = logging.getLogger(__name__)


def get(domain, provider=None):
    """
    Get DNS records for a domain
    
    Args:
        domain: Domain to query
        provider: Specific provider to use (default: system_dns)
    
    Returns:
        dict: DNS record data
    """
    # Default to system_dns if no provider specified
    if provider is None:
        provider = 'system_dns'
    
    if provider == 'system_dns':
        return system_dns_records(domain)
    elif provider == 'cloudflare':
        return cloudflare_dns_query(domain)
    elif provider == 'securitytrails':
        return securitytrails_dns_records(domain)
    elif provider == 'api_ninjas':
        return apininjas_dns_lookup(domain)
    else:
        return {'error': f'Provider {provider} not available'}
