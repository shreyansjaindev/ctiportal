"""
Passive DNS aggregator for historical DNS records
"""
import logging

# Import provider functions at module level for early error detection
from ..providers.securitytrails import get_passive_dns as securitytrails_passive_dns
from ..providers.virustotal import get_passive_dns as virustotal_passive_dns

logger = logging.getLogger(__name__)


def get(domain, provider=None):
    """
    Get passive DNS records for a domain
    
    Args:
        domain: Domain to query
        provider: Specific provider to use (optional)
    
    Returns:
        dict: Passive DNS data
    """
    # If specific provider requested
    if provider:
        if provider == 'securitytrails':
            return securitytrails_passive_dns(domain)
        elif provider == 'virustotal':
            return virustotal_passive_dns(domain)
        else:
            return {'error': f'Provider {provider} not available'}
    
    # Try providers in order of preference
    result = securitytrails_passive_dns(domain)
    if 'error' not in result:
        return result

    result = virustotal_passive_dns(domain)
    if 'error' not in result:
        return result
    
    return {'error': 'All passive DNS providers failed'}
