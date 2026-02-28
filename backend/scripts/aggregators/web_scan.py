"""
Web scan aggregator.
"""
import logging
import re
from typing import Optional, Dict, Any

from ..providers.urlscan import urlscan as urlscan_lookup

logger = logging.getLogger(__name__)


def _detect_input_type(value: str) -> str:
    if re.match(r"^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$", value):
        return "ipv4"
    if value.startswith(("http://", "https://")):
        return "url"
    return "domain"


PROVIDERS = {
    "urlscan": lambda url: urlscan_lookup(url, _detect_input_type(url)),
}


def get(url: str, provider: Optional[str] = None) -> Dict[str, Any]:
    """
    Search existing web scan results.

    Args:
        url: URL, domain, or IP to search
        provider: Specific provider to use (None for auto-fallback). Options: 'urlscan'
    """
    if provider is not None:
        if provider not in PROVIDERS:
            return {"error": f"Provider {provider} not available"}
        result = PROVIDERS[provider](url)
        if not result.get("error"):
            result["_provider"] = provider
        return result

    for prov_id, func in PROVIDERS.items():
        result = func(url)
        if result and not result.get("error"):
            result["_provider"] = prov_id
            return result

    return {"error": "All web scan providers failed"}
