"""
WHOIS History aggregator for historical domain registration records
"""
import logging
import os

logger = logging.getLogger(__name__)


def get_available_providers():
    """Returns list of available WHOIS history providers based on API keys"""
    available = []
    
    # WhoisXML - check for API key
    if os.getenv('WHOISXMLAPI'):
        available.append('whoisxml')
    
    # SecurityTrails - check for API key
    if os.getenv('SECURITYTRAILS'):
        available.append('securitytrails')
    
    return available


def get(domain, provider=None):
    """
    Get WHOIS history for a domain
    
    Args:
        domain: Domain to query
        provider: Specific provider to use (optional)
    
    Returns:
        dict: WHOIS history data
    """
    available_providers = get_available_providers()
    
    if not available_providers:
        return {'error': 'No WHOIS history providers available'}
    
    # If specific provider requested
    if provider:
        if provider not in available_providers:
            return {'error': f'Provider {provider} not available'}
        
        if provider == 'whoisxml':
            return _try_whoisxml(domain)
        elif provider == 'securitytrails':
            return _try_securitytrails(domain)
    
    # Try providers in order of preference
    if 'whoisxml' in available_providers:
        result = _try_whoisxml(domain)
        if 'error' not in result:
            return result
    
    if 'securitytrails' in available_providers:
        result = _try_securitytrails(domain)
        if 'error' not in result:
            return result
    
    return {'error': 'All WHOIS history providers failed'}


def _try_whoisxml(domain):
    """Get WHOIS history from WhoisXML API"""
    try:
        from ..providers.whoisxmlapi import get_whois_history
        return get_whois_history(domain)
    except Exception as e:
        logger.error(f"WhoisXML history failed: {e}")
        return {'error': str(e)}


def _try_securitytrails(domain):
    """Get WHOIS history from SecurityTrails"""
    try:
        from ..providers.securitytrails import get_whois_history
        return get_whois_history(domain)
    except Exception as e:
        logger.error(f"SecurityTrails WHOIS history failed: {e}")
        return {'error': str(e)}
