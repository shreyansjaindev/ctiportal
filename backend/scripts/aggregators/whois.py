"""
WHOIS lookup aggregator with multiple provider support and automatic fallbacks
"""
import logging
import os
from typing import Optional, Dict, Any, List
from ..utils.api_helpers import check_api_key

logger = logging.getLogger(__name__)

# Import providers
from ..providers.free_whois import get_whois as free_whois_lookup
from ..providers.whoisxmlapi import whois as whoisxml_lookup
from ..providers.securitytrails import get_whois as securitytrails_whois


def get(domain: str, provider: Optional[str] = None) -> Dict[str, Any]:
    """
    Get WHOIS data for a domain with automatic fallbacks
    
    Args:
        domain: Domain name to lookup
        provider: Specific provider to use (None for auto-fallback)
                 Options: 'free_whois', 'whoisxml', 'securitytrails'
        
    Returns:
        WHOIS data dictionary with '_provider' metadata
    """
    # If specific provider requested
    if provider == 'whoisxml':
        result = _try_whoisxml(domain)
        if not result.get('error'):
            result['_provider'] = 'whoisxml'
        return result
    elif provider == 'securitytrails':
        result = _try_securitytrails(domain)
        if not result.get('error'):
            result['_provider'] = 'securitytrails'
        return result
    elif provider == 'free_whois':
        result = _try_free_whois(domain)
        if not result.get('error'):
            result['_provider'] = 'free_whois'
        return result
    elif provider is not None:
        # Provider requested but not available
        return {
            'error': f'Provider {provider} not available'
        }
    
    # Auto-fallback chain (free first, then paid)
    providers = []
    
    providers.append(('free_whois', _try_free_whois))
    providers.append(('whoisxml', _try_whoisxml))
    providers.append(('securitytrails', _try_securitytrails))
    
    # Try each provider in order
    for provider_name, provider_func in providers:
        try:
            result = provider_func(domain)
            if result and not result.get('error'):
                result['_provider'] = provider_name
                return result
        except Exception as e:
            logger.warning(f"WHOIS provider {provider_name} failed: {e}")
            continue
    
    return {'error': 'All WHOIS providers failed'}


def get_all(domain: str) -> Dict[str, Dict[str, Any]]:
    """
    Get WHOIS from all available providers (for comparison)
    
    Args:
        domain: Domain name to lookup
        
    Returns:
        Dictionary with provider names as keys
    """
    results = {}
    
    try:
        result = _try_free_whois(domain)
        result['_provider'] = 'free_whois'
        results['free_whois'] = result
    except Exception as e:
        logger.error(f"Free WHOIS error: {e}")

    try:
        result = _try_whoisxml(domain)
        result['_provider'] = 'whoisxml'
        results['whoisxml'] = result
    except Exception as e:
        logger.error(f"WhoisXML error: {e}")

    try:
        result = _try_securitytrails(domain)
        result['_provider'] = 'securitytrails'
        results['securitytrails'] = result
    except Exception as e:
        logger.error(f"SecurityTrails error: {e}")
    
    return results


def _try_free_whois(domain: str) -> Dict[str, Any]:
    """Try free python-whois lookup"""
    try:
        return free_whois_lookup(domain)
    except Exception as e:
        logger.error(f"Free WHOIS error: {e}")
        return {'error': str(e)}


def _try_whoisxml(domain: str) -> Dict[str, Any]:
    """Try WhoisXMLAPI lookup"""
    api_keys_str = os.getenv("WHOISXMLAPI_DRS", "")
    error = check_api_key(api_keys_str, "WhoisXML")
    if error:
        return error
    
    api_keys = [k.strip() for k in api_keys_str.split(",") if k.strip()]
    
    for api_key in api_keys:
        try:
            return whoisxml_lookup(domain, api_key)
        except Exception as e:
            logger.error(f"WhoisXML error with key: {e}")
            continue
    
    return {'error': 'WhoisXML lookup failed for all API keys'}


def _try_securitytrails(domain: str) -> Dict[str, Any]:
    """Try SecurityTrails WHOIS lookup"""
    try:
        return securitytrails_whois(domain, 'domain')
    except Exception as e:
        logger.error(f"SecurityTrails WHOIS error: {e}")
        return {'error': str(e)}
