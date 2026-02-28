"""
Web redirects aggregator.
"""
import logging
from typing import Optional, Dict, Any

from ..providers.redirect_checker import redirect_checker
from ..providers.geekflare import geekflare_redirect_checker

logger = logging.getLogger(__name__)


PROVIDERS = {
    'redirect_checker': redirect_checker,
    'geekflare': geekflare_redirect_checker,
}


def get(url: str, provider: Optional[str] = None) -> Dict[str, Any]:
    """
    Check web redirects.

    Args:
        url: URL or domain to check
        provider: Specific provider to use (None for auto-fallback). Options: 'redirect_checker', 'geekflare'
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

    return {'error': 'All web redirects providers failed'}
