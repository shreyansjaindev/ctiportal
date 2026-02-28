import os

import requests

from ..utils.api_helpers import check_api_key

_raw_geekflare = os.getenv("GEEKFLARE")
API_KEY = _raw_geekflare.split(",")[0].strip() if _raw_geekflare else None


def geekflare_redirect_checker(query: str):
    error = check_api_key(API_KEY, "Geekflare")
    if error:
        return error

    try:
        response = requests.post(
            "https://api.geekflare.com/redirectcheck",
            headers={
                "Content-Type": "application/json",
                "x-api-key": API_KEY,
            },
            json={"url": query},
            timeout=30,
        )
        response.raise_for_status()
        payload = response.json()
    except requests.RequestException:
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
