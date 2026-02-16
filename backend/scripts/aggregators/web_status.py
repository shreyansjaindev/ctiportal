"""
Website status aggregator with multiple provider support
"""
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

# Import providers
try:
    from ..providers.website_status import get_website_status
    REDIRECT_CHECKER_AVAILABLE = True
except ImportError:
    REDIRECT_CHECKER_AVAILABLE = False
    logger.debug("Redirect Checker not available")

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    logger.debug("Requests not available")


def get_available_providers() -> List[str]:
    """Get list of available website status providers"""
    providers = []
    if REDIRECT_CHECKER_AVAILABLE:
        providers.append('httpstatus')
    if REQUESTS_AVAILABLE:
        providers.append('requests')
    return providers


def get(url: str, provider: Optional[str] = None) -> Dict[str, Any]:
    """
    Check website status and redirects
    
    Args:
        url: URL or domain to check
        provider: Specific provider to use (None for auto-fallback)
                 Options: 'httpstatus', 'requests'
        
    Returns:
        Status data dictionary with '_provider' key
    """
    # If specific provider requested
    if provider == 'httpstatus' and REDIRECT_CHECKER_AVAILABLE:
        result = _try_httpstatus(url)
        if not result.get('error'):
            result['_provider'] = 'httpstatus'
        return result
    elif provider == 'requests' and REQUESTS_AVAILABLE:
        result = _try_requests(url)
        if not result.get('error'):
            result['_provider'] = 'requests'
        return result
    elif provider is not None:
        return {
            'error': f'Provider {provider} not available',
            'available_providers': get_available_providers()
        }
    
    # Auto-fallback chain
    if REDIRECT_CHECKER_AVAILABLE:
        result = _try_httpstatus(url)
        if result and not result.get('error'):
            result['_provider'] = 'httpstatus'
            return result
    
    if REQUESTS_AVAILABLE:
        result = _try_requests(url)
        if result and not result.get('error'):
            result['_provider'] = 'requests'
            return result
    
    return {'error': 'No website status providers available'}


def _try_httpstatus(url: str) -> Dict[str, Any]:
    """Try HTTPStatus.io API"""
    try:
        result = get_website_status(url, 'domain')
        if not result or not isinstance(result, list):
            return {'error': 'No data returned'}
        return {'redirects': result, 'url': url}
    except Exception as e:
        logger.error(f"HTTPStatus.io error: {e}")
        return {'error': str(e)}


def _try_requests(url: str) -> Dict[str, Any]:
    """Try simple requests check"""
    try:
        import requests
        
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
    except Exception as e:
        logger.error(f"Requests check error: {e}")
        return {'error': str(e)}
