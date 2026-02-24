"""
WHOIS History aggregator for historical domain registration records
"""
import logging

# Import provider functions at module level for early error detection
from ..providers.whoisxmlapi import get_whois_history as whoisxml_whois_history
from ..providers.securitytrails import get_whois_history as securitytrails_whois_history

logger = logging.getLogger(__name__)


def get(domain, provider=None):
    """
    Get WHOIS history for a domain
    
    Args:
        domain: Domain to query
        provider: Specific provider to use (optional)
    
    Returns:
        dict: WHOIS history data
    """
    # If specific provider requested
    if provider:
        if provider == 'whoisxml':
            return whoisxml_whois_history(domain)
        elif provider == 'securitytrails':
            return securitytrails_whois_history(domain)
        else:
            return {'error': f'Provider {provider} not available'}
    
    # Try providers in order of preference
    result = whoisxml_whois_history(domain)
    if 'error' not in result:
        return result

    result = securitytrails_whois_history(domain)
    if 'error' not in result:
        return result
    
    return {'error': 'All WHOIS history providers failed'}
