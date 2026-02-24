"""
Screenshot aggregator for website screenshots
"""
import logging
# Import provider functions at module level for early error detection
from ..providers.screenshotlayer import screenshot as screenshotlayer_screenshot, fullpage_screenshot
from ..providers.screenshotmachine import get_website_screenshot

logger = logging.getLogger(__name__)


def get(url, provider=None, fullpage=False):
    """
    Get screenshot of a URL
    
    Args:
        url: URL to screenshot
        provider: Specific provider to use (optional)
        fullpage: Whether to capture full page (default False)
    
    Returns:
        dict: Screenshot data (base64 encoded image)
    """
    def run_screenshotlayer():
        func = fullpage_screenshot if fullpage else screenshotlayer_screenshot
        args = (url, 1) if fullpage else (url,)
        result = func(*args)
        if isinstance(result, dict) and 'error' in result:
            return result
        if result:
            return {'image': result, 'provider': 'screenshotlayer'}
        return {'error': 'ScreenshotLayer returned empty response'}

    def run_screenshotmachine():
        result = get_website_screenshot(url)
        if isinstance(result, dict) and 'error' in result:
            return result
        if result:
            return {'image': result, 'provider': 'screenshotmachine'}
        return {'error': 'ScreenshotMachine returned empty response'}

    # If specific provider requested
    if provider:
        if provider == 'screenshotlayer':
            return run_screenshotlayer()
        if provider == 'screenshotmachine':
            return run_screenshotmachine()
        return {'error': f'Provider {provider} not available'}
    
    # Try providers in order of preference
    result = run_screenshotlayer()
    if 'error' not in result:
        return result

    result = run_screenshotmachine()
    if 'error' not in result:
        return result

    return {'error': 'All screenshot providers failed'}
