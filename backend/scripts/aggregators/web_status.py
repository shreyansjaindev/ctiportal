"""
Website status aggregator with multiple provider support
"""
import logging
import re
from typing import Optional, Dict, Any

from ..providers.website_status import get_website_status
from ..providers.urlscan import urlscan as urlscan_lookup
from ..providers.builtin_http import http_check as builtin_http_check

logger = logging.getLogger(__name__)

PROVIDERS = {
    'httpstatus': lambda url: _httpstatus_check(url),
    'builtin_http': builtin_http_check,
    'urlscan': lambda url: urlscan_lookup(url, _detect_input_type(url)),
}


def _detect_input_type(value: str) -> str:
    if re.match(r"^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$", value):
        return 'ipv4'
    if value.startswith(('http://', 'https://')):
        return 'url'
    return 'domain'


def _httpstatus_check(url: str) -> Dict[str, Any]:
    result = get_website_status(url, 'domain')
    if not result or not isinstance(result, list):
        return {'error': 'No data returned'}
    return {'redirects': result, 'url': url}


def get(url: str, provider: Optional[str] = None) -> Dict[str, Any]:
    """
    Check website status and redirects.

    Args:
        url: URL or domain to check
        provider: Specific provider to use (None for auto-fallback). Options: 'httpstatus', 'builtin_http', 'urlscan'
    """
    if provider is not None:
        if provider not in PROVIDERS:
            return {'error': f'Provider {provider} not available'}
        result = PROVIDERS[provider](url)
        if not result.get('error'):
            result['_provider'] = provider
        return result

    for prov_id, func in PROVIDERS.items():
        result = func(url)
        if result and not result.get('error'):
            result['_provider'] = prov_id
            return result

    return {'error': 'All website status providers failed'}
