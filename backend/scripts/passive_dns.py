"""
Passive DNS aggregator for historical DNS records
"""
import logging
import os

logger = logging.getLogger(__name__)


def get_available_providers():
    """Returns list of available passive DNS providers based on API keys"""
    available = []
    
    # SecurityTrails - check for API key
    if os.getenv('SECURITYTRAILS'):
        available.append('securitytrails')
    
    # VirusTotal - check for API key
    if os.getenv('VIRUSTOTAL'):
        available.append('virustotal')
    
    return available


def get(domain, provider=None):
    """
    Get passive DNS records for a domain
    
    Args:
        domain: Domain to query
        provider: Specific provider to use (optional)
    
    Returns:
        dict: Passive DNS data
    """
    available_providers = get_available_providers()
    
    if not available_providers:
        return {'error': 'No passive DNS providers available'}
    
    # If specific provider requested
    if provider:
        if provider not in available_providers:
            return {'error': f'Provider {provider} not available'}
        
        if provider == 'securitytrails':
            return _try_securitytrails(domain)
        elif provider == 'virustotal':
            return _try_virustotal(domain)
    
    # Try providers in order of preference
    if 'securitytrails' in available_providers:
        result = _try_securitytrails(domain)
        if 'error' not in result:
            return result
    
    if 'virustotal' in available_providers:
        result = _try_virustotal(domain)
        if 'error' not in result:
            return result
    
    return {'error': 'All passive DNS providers failed'}


def _try_securitytrails(domain):
    """Get passive DNS from SecurityTrails"""
    try:
        from .providers.securitytrails import get_passive_dns
        return get_passive_dns(domain)
    except Exception as e:
        logger.error(f"SecurityTrails passive DNS failed: {e}")
        return {'error': str(e)}


def _try_virustotal(domain):
    """Get passive DNS from VirusTotal"""
    try:
        from .providers.virustotal import get_passive_dns
        return get_passive_dns(domain)
    except Exception as e:
        logger.error(f"VirusTotal passive DNS failed: {e}")
        return {'error': str(e)}
