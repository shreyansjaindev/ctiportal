"""
IP info aggregator (geolocation, ASN) with multiple provider support
"""
import logging
import os
from typing import Optional, Dict, Any

from ..utils.api_helpers import check_api_key
from ..providers.builtin_ipinfo import ip_to_asn as builtin_ipinfo_lookup
from ..providers.ipapi import get_geolocation as ipapi_lookup
from ..providers.ipinfoio import get_ip_info as ipinfoio_lookup
from ..providers.whoisxmlapi import iplocation as whoisxml_iplocation

logger = logging.getLogger(__name__)


def _whoisxml_iplocation(ip: str) -> dict:
    """WhoisXML IP geolocation with multi-key rotation."""
    api_keys_str = os.getenv("WHOISXMLAPI_DRS", "")
    error = check_api_key(api_keys_str, "WhoisXML")
    if error:
        return error
    for api_key in [k.strip() for k in api_keys_str.split(",") if k.strip()]:
        try:
            return whoisxml_iplocation(ip, api_key)
        except Exception as e:
            logger.error(f"WhoisXML iplocation error with key: {e}")
    return {'error': 'WhoisXML IP location failed for all API keys'}


# Fallback order: builtin (no rate limit) → ipapi → ipinfoio → whoisxml
PROVIDERS = {
    'builtin_ipinfo': builtin_ipinfo_lookup,
    'ipapi': ipapi_lookup,
    'ipinfoio': ipinfoio_lookup,
    'whoisxml': _whoisxml_iplocation,
}


def get(ip: str, provider: Optional[str] = None) -> Dict[str, Any]:
    """
    Get IP geolocation and ASN info.

    Args:
        ip: IP address to look up
        provider: Specific provider to use (None for auto-fallback). Options: 'builtin_ipinfo', 'ipapi', 'ipinfoio', 'whoisxml'
    """
    if provider is not None:
        if provider not in PROVIDERS:
            return {'error': f'Provider {provider} not available'}
        result = PROVIDERS[provider](ip)
        if not result.get('error'):
            result['_provider'] = provider
        return result

    for prov_id, func in PROVIDERS.items():
        result = func(ip)
        if result and not result.get('error'):
            result['_provider'] = prov_id
            return result

    return {'error': 'All IP info providers failed'}
