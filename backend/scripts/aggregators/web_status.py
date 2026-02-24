"""
Website status aggregator with multiple provider support
"""
import logging
import re
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

# Import providers
from ..providers.website_status import get_website_status
from ..providers.urlscan import urlscan as urlscan_lookup
import requests


def _detect_input_type(value: str) -> str:
    if re.match(r"^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$", value):
        return 'ipv4'
    if value.startswith(('http://', 'https://')):
        return 'url'
    return 'domain'


def get(url: str, provider: Optional[str] = None) -> Dict[str, Any]:
    """
    Check website status and redirects
    
    Args:
        url: URL or domain to check
        provider: Specific provider to use (None for auto-fallback)
             Options: 'httpstatus', 'requests', 'urlscan'
        
    Returns:
        Status data dictionary with '_provider' key
    """
    # If specific provider requested
    if provider == 'httpstatus':
        result = _try_httpstatus(url)
        if not result.get('error'):
            result['_provider'] = 'httpstatus'
        return result
    elif provider == 'requests':
        result = _try_requests(url)
        if not result.get('error'):
            result['_provider'] = 'requests'
        return result
    elif provider == 'urlscan':
        result = _try_urlscan(url)
        if not result.get('error'):
            result['_provider'] = 'urlscan'
        return result
    elif provider is not None:
        return {
            'error': f'Provider {provider} not available'
        }
    
    # Auto-fallback chain
    result = _try_httpstatus(url)
    if result and not result.get('error'):
        result['_provider'] = 'httpstatus'
        return result

    result = _try_requests(url)
    if result and not result.get('error'):
        result['_provider'] = 'requests'
        return result

    result = _try_urlscan(url)
    if result and not result.get('error'):
        result['_provider'] = 'urlscan'
        return result

    return {'error': 'No website details providers available'}


def _try_httpstatus(url: str) -> Dict[str, Any]:
    """Try HTTPStatus.io API"""
    result = get_website_status(url, 'domain')
    if not result or not isinstance(result, list):
        return {'error': 'No data returned'}
    return {'redirects': result, 'url': url}


def _try_requests(url: str) -> Dict[str, Any]:
    """Try simple requests check"""
    # Ensure URL has protocol
    if not url.startswith(('http://', 'https://')):
        test_url = f'https://{url}'
    else:
        test_url = url

    response = requests.get(test_url, timeout=10, allow_redirects=True)

    return {
        'url': test_url,
        'status_code': response.status_code,
        'final_url': response.url,
        'redirects': len(response.history),
        'ok': response.ok
    }


def _try_urlscan(url: str) -> Dict[str, Any]:
    """Try URLScan existing/new scan workflow."""
    input_type = _detect_input_type(url)
    return urlscan_lookup(url, input_type)
