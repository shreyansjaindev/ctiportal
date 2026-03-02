import logging
import base64
from typing import Any

import requests

from domain_monitoring.choices import ScreenshotProvider
from domain_monitoring.services.provider_registry import (
    get_dns_provider,
    get_screenshot_provider,
    get_subdomain_provider,
)
from domain_monitoring.services.screenshot_storage import save_screenshot_bytes
from scripts.providers.geekflare import get_screenshot_url, get_web_redirects
from scripts.providers.screenshotmachine import get_website_screenshot as get_screenshotmachine_screenshot


logger = logging.getLogger(__name__)


def fetch_dns_records(domain: str) -> dict[str, Any]:
    response = get_dns_provider()(domain)

    return {
        "a": list(response.get("a", []) or []),
        "mx": list(response.get("mx", []) or []),
        "spf": str(response.get("spf", "") or ""),
    }


def fetch_subdomains(domain: str) -> list[str]:
    response = get_subdomain_provider()(domain)

    return list(response.get("subdomains", []) or [])


def fetch_website_status(domain: str) -> dict[str, str]:
    redirect_result = get_web_redirects(domain)
    if redirect_result.get("error"):
        return {"url": "", "code": ""}

    return {
        "url": str(redirect_result.get("url", "") or ""),
        "code": str(redirect_result.get("status_code", "") or ""),
    }


def _store_screenshot_response(content: bytes) -> dict[str, str]:
    filename, screenshot_hash = save_screenshot_bytes(content)
    return {"filename": filename, "hash": screenshot_hash}


def fetch_geekflare_website_screenshot(domain: str) -> dict[str, str]:
    screenshot_url = get_screenshot_url(domain)
    if not screenshot_url:
        return {"filename": "", "hash": ""}

    try:
        response = requests.get(screenshot_url, timeout=30)
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.warning("Error fetching screenshot bytes for domain %s: %s", domain, exc)
        return {"filename": "", "hash": ""}

    return _store_screenshot_response(response.content)


def fetch_screenshotmachine_website_screenshot(domain: str) -> dict[str, str]:
    encoded_image = get_screenshotmachine_screenshot(domain)
    if not encoded_image:
        return {"filename": "", "hash": ""}

    try:
        image_bytes = base64.b64decode(encoded_image)
    except Exception as exc:
        logger.warning("Error decoding ScreenshotMachine response for domain %s: %s", domain, exc)
        return {"filename": "", "hash": ""}

    return _store_screenshot_response(image_bytes)


def fetch_website_screenshot(domain: str) -> dict[str, str]:
    if get_screenshot_provider() == ScreenshotProvider.SCREENSHOTMACHINE:
        return fetch_screenshotmachine_website_screenshot(domain)
    return fetch_geekflare_website_screenshot(domain)
