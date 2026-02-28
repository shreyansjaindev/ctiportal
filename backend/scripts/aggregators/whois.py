"""
WHOIS lookup aggregator with multiple provider support and automatic fallbacks
"""
import logging
import os
from typing import Optional, Dict, Any
from ..utils.api_helpers import check_api_key

from ..providers.builtin_whois import get_whois as builtin_whois_lookup
from ..providers.whoisxmlapi import whois as whoisxml_lookup
from ..providers.securitytrails import get_whois as securitytrails_whois

logger = logging.getLogger(__name__)


def _whoisxml_get(domain: str) -> Dict[str, Any]:
    """WhoisXML lookup with multi-key rotation."""
    api_keys_str = os.getenv("WHOISXMLAPI_DRS", "")
    error = check_api_key(api_keys_str, "WhoisXML")
    if error:
        return error
    for api_key in [k.strip() for k in api_keys_str.split(",") if k.strip()]:
        try:
            return whoisxml_lookup(domain, api_key)
        except Exception as e:
            logger.error(f"WhoisXML error with key: {e}")
    return {'error': 'WhoisXML lookup failed for all API keys'}


# Fallback order: builtin (free, no key) → whoisxmlapi → securitytrails
PROVIDERS = {
    'builtin_whois': lambda d: builtin_whois_lookup(d),
    'whoisxmlapi': _whoisxml_get,
    'securitytrails': lambda d: securitytrails_whois(d, 'domain'),
}


def get(domain: str, provider: Optional[str] = None) -> Dict[str, Any]:
    """
    Get WHOIS data for a domain.

    Args:
        domain: Domain name to look up
        provider: Specific provider to use (None for auto-fallback). Options: 'builtin_whois', 'whoisxmlapi', 'securitytrails'
    """
    if provider is not None:
        if provider not in PROVIDERS:
            return {'error': f'Provider {provider} not available'}
        result = PROVIDERS[provider](domain)
        if not result.get('error'):
            result['_provider'] = provider
        return result

    for prov_id, func in PROVIDERS.items():
        try:
            result = func(domain)
            if result and not result.get('error'):
                result['_provider'] = prov_id
                return result
        except Exception as e:
            logger.warning(f"WHOIS provider {prov_id} failed: {e}")

    return {'error': 'All WHOIS providers failed'}


def get_all(domain: str) -> Dict[str, Dict[str, Any]]:
    """
    Query all WHOIS providers and return combined results (for comparison).
    """
    results = {}
    for prov_id, func in PROVIDERS.items():
        try:
            result = func(domain)
            result['_provider'] = prov_id
            results[prov_id] = result
        except Exception as e:
            logger.error(f"WHOIS provider {prov_id} error: {e}")
    return results
