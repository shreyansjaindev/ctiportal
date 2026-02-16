"""
Screenshot aggregator for website screenshots
"""
import logging
import os

logger = logging.getLogger(__name__)


def get_available_providers():
    """Returns list of available screenshot providers based on API keys"""
    available = []
    
    # ScreenshotMachine - check for API key
    if os.getenv('SCREENSHOTLAYER'):
        available.append('screenshotmachine')
    
    return available


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
    available_providers = get_available_providers()
    
    if not available_providers:
        return {'error': 'No screenshot providers available'}
    
    # If specific provider requested
    if provider:
        if provider not in available_providers:
            return {'error': f'Provider {provider} not available'}
        
        if provider == 'screenshotmachine':
            return _try_screenshotmachine(url, fullpage)
    
    # Try providers in order of preference
    if 'screenshotmachine' in available_providers:
        result = _try_screenshotmachine(url, fullpage)
        if 'error' not in result:
            return result
    
    return {'error': 'All screenshot providers failed'}


def _try_screenshotmachine(url, fullpage=False):
    """Get screenshot using ScreenshotMachine API"""
    try:
        from ..providers.screenshotlayer import screenshot, fullpage_screenshot
        
        if fullpage:
            img = fullpage_screenshot(url, fullpage=1)
        else:
            img = screenshot(url)
        
        return {'image': img, 'provider': 'screenshotmachine'}
    except Exception as e:
        logger.error(f"ScreenshotMachine failed: {e}")
        return {'error': str(e)}
