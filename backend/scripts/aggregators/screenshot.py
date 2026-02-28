"""
Screenshot aggregator for website screenshots
"""
import logging
from typing import Optional, Dict, Any

from ..providers.screenshotlayer import screenshot as screenshotlayer_screenshot, fullpage_screenshot
from ..providers.screenshotmachine import get_website_screenshot

logger = logging.getLogger(__name__)


def get(url: str, provider: Optional[str] = None, fullpage: bool = False) -> Dict[str, Any]:
    """
    Get a screenshot of a URL.

    Args:
        url: URL to screenshot
        provider: Specific provider to use (None for auto-fallback). Options: 'screenshotlayer', 'screenshotmachine'
        fullpage: Capture full page scroll (screenshotlayer only)
    """
    PROVIDERS = {
        'screenshotlayer': lambda u: _screenshotlayer(u, fullpage),
        'screenshotmachine': _screenshotmachine,
    }

    if provider is not None:
        if provider not in PROVIDERS:
            return {'error': f'Provider {provider} not available'}
        return PROVIDERS[provider](url)

    for prov_id, func in PROVIDERS.items():
        result = func(url)
        if 'error' not in result:
            return result

    return {'error': 'All screenshot providers failed'}


def _screenshotlayer(url: str, fullpage: bool) -> Dict[str, Any]:
    func = fullpage_screenshot if fullpage else screenshotlayer_screenshot
    args = (url, 1) if fullpage else (url,)
    result = func(*args)
    if isinstance(result, dict) and 'error' in result:
        return result
    if result:
        return {'image': result, '_provider': 'screenshotlayer'}
    return {'error': 'ScreenshotLayer returned empty response'}


def _screenshotmachine(url: str) -> Dict[str, Any]:
    result = get_website_screenshot(url)
    if isinstance(result, dict) and 'error' in result:
        return result
    if result:
        return {'image': result, '_provider': 'screenshotmachine'}
    return {'error': 'ScreenshotMachine returned empty response'}
