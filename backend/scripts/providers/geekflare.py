import os
from typing import Any

import requests

from ..utils.api_helpers import check_api_key

_raw_geekflare = os.getenv("GEEKFLARE")
API_KEY = _raw_geekflare.split(",")[0].strip() if _raw_geekflare else None
BASE_URL = "https://api.geekflare.com"


def _geekflare_headers() -> dict[str, str]:
    return {
        "Content-Type": "application/json",
        "x-api-key": API_KEY or "",
    }


def _post_geekflare_request(url: str, payload: dict[str, Any], provider_name: str = "Geekflare") -> dict[str, Any] | None:
    error = check_api_key(API_KEY, provider_name)
    if error:
        return None

    try:
        response = requests.post(
            url,
            headers=_geekflare_headers(),
            json=payload,
            timeout=30,
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException:
        return None


def get_dns_records(query: str) -> dict[str, Any]:
    payload = _post_geekflare_request(
        f"{BASE_URL}/dnsrecord",
        {"url": query},
    )
    if not payload:
        return {}

    data = payload.get("data", {})
    return {
        "status_code": payload.get("apiCode", ""),
        "a": [a["address"] for a in data.get("A", [])],
        "mx": [mx["exchange"] for mx in data.get("MX", [])],
        "spf": next(
            (txt[0] for txt in data.get("TXT", []) if txt[0].startswith("v=spf1")),
            "",
        ),
    }


def get_screenshot_url(query: str) -> str:
    payload = _post_geekflare_request(
        f"{BASE_URL}/screenshot",
        {
            "url": query,
            "device": "desktop",
            "blockAds": False,
            "skipCaptcha": False,
            "hideCookie": False,
        },
    )
    if not payload:
        return ""
    return str(payload.get("data", "") or "")


def get_web_redirects(query: str):
    payload = _post_geekflare_request(
        f"{BASE_URL}/redirectcheck",
        {"url": query},
    )
    if not payload:
        return {"error": "Geekflare request failed"}

    hops = payload.get("data")
    if not isinstance(hops, list) or not hops:
        return {"error": payload.get("message") or "No data returned"}

    final_hop = hops[-1]
    headers = final_hop.get("headers", []) or []
    header_map = {
        str(header.get("name", "")).lower(): header.get("value", "")
        for header in headers
        if isinstance(header, dict)
    }

    redirects = [
        {
            "url": entry.get("url", ""),
            "code": entry.get("status", ""),
        }
        for entry in hops
    ]

    return {
        "url": final_hop.get("url") or payload.get("meta", {}).get("redirectedURL") or query,
        "status_code": final_hop.get("status"),
        "redirects": redirects,
        "server": header_map.get("server"),
        "content_type": header_map.get("content-type"),
    }
