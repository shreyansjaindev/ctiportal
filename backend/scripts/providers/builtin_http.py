"""
Built-in HTTP status check using the requests library.
No API key required.
"""
import requests
import logging
from typing import Any, Dict

logger = logging.getLogger(__name__)


def http_check(url: str) -> Dict[str, Any]:
    """
    Check website status using a direct HTTP request.

    Args:
        url: URL or domain to check

    Returns:
        Dictionary with status_code, final_url, redirects, ok
    """
    if not url.startswith(("http://", "https://")):
        url = f"https://{url}"

    response = requests.get(url, timeout=10, allow_redirects=True)

    return {
        "url": url,
        "status_code": response.status_code,
        "final_url": response.url,
        "redirects": len(response.history),
        "ok": response.ok,
    }
