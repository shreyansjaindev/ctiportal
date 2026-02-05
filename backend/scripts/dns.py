"""
DNS aggregator for current DNS record lookups
"""
import logging
import os

logger = logging.getLogger(__name__)


def get_available_providers():
    """Returns list of available DNS providers based on API keys"""
    available = []
    
    # System DNS - always available
    available.append('system_dns')
    
    # Cloudflare DoH - always available (no API key needed)
    available.append('cloudflare')
    
    # SecurityTrails - check for API key
    if os.getenv('SECURITYTRAILS'):
        available.append('securitytrails')
    
    # API Ninjas - check for API key
    if os.getenv('APININJAS'):
        available.append('apininjas')
    
    return available


def get(domain, provider=None):
    """
    Get DNS records for a domain
    
    Args:
        domain: Domain to query
        provider: Specific provider to use (optional)
    
    Returns:
        dict: DNS record data
    """
    available_providers = get_available_providers()
    
    if not available_providers:
        return {'error': 'No DNS providers available'}
    
    # If specific provider requested
    if provider:
        if provider not in available_providers:
            return {'error': f'Provider {provider} not available'}
        
        if provider == 'system_dns':
            return _try_system_dns(domain)
        elif provider == 'cloudflare':
            return _try_cloudflare(domain)
        elif provider == 'securitytrails':
            return _try_securitytrails(domain)
        elif provider == 'apininjas':
            return _try_apininjas(domain)
    
    # Try providers in order of preference
    if 'securitytrails' in available_providers:
        result = _try_securitytrails(domain)
        if 'error' not in result:
            return result
    
    if 'system_dns' in available_providers:
        result = _try_system_dns(domain)
        if 'error' not in result:
            return result
    
    if 'cloudflare' in available_providers:
        result = _try_cloudflare(domain)
        if 'error' not in result:
            return result
    
    if 'apininjas' in available_providers:
        result = _try_apininjas(domain)
        if 'error' not in result:
            return result
    
    return {'error': 'All DNS providers failed'}


def _try_system_dns(domain):
    """Get DNS records using system resolver"""
    try:
        from .lookup import dns_records
        return dns_records(domain)
    except Exception as e:
        logger.error(f"System DNS failed: {e}")
        return {'error': str(e)}


def _try_cloudflare(domain):
    """Get DNS records using Cloudflare DoH"""
    try:
        import requests
        url = f"https://cloudflare-dns.com/dns-query?name={domain}&type=A"
        headers = {'accept': 'application/dns-json'}
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"Cloudflare DNS failed: {e}")
        return {'error': str(e)}


def _try_securitytrails(domain):
    """Get DNS records from SecurityTrails"""
    try:
        from .providers.securitytrails import get_dns_records
        return get_dns_records(domain)
    except Exception as e:
        logger.error(f"SecurityTrails DNS failed: {e}")
        return {'error': str(e)}


def _try_apininjas(domain):
    """Get DNS records from API Ninjas"""
    try:
        import requests
        api_key = os.getenv('APININJAS')
        url = f"https://api.api-ninjas.com/v1/dnslookup?domain={domain}"
        headers = {'X-Api-Key': api_key}
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"API Ninjas DNS failed: {e}")
        return {'error': str(e)}
