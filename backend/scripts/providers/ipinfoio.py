"""
IPInfo.io provider — IP geolocation, ASN, and hosting details.
API docs: https://ipinfo.io/developers
Env var: IPINFO_TOKEN
"""
import os
import logging
import requests
from ..utils.api_helpers import check_api_key

logger = logging.getLogger(__name__)

TOKEN = os.getenv("IPINFO_TOKEN", "").split(",")[0]


def get_ip_info(ip: str) -> dict:
    error = check_api_key(TOKEN, "IPInfo")
    if error:
        return error

    url = f"https://ipinfo.io/{ip}/json"
    try:
        response = requests.get(url, params={"token": TOKEN}, timeout=10)
        if response.status_code == 401:
            return {"error": "IPInfo: invalid or missing token"}
        if response.status_code == 429:
            return {"error": "IPInfo: rate limit exceeded"}
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as e:
        logger.error("IPInfo request failed for %s: %s", ip, e)
        return {"error": str(e)}

    # Flatten org field "AS1234 Example Corp" → asn + org_name
    org_raw = data.get("org", "")
    asn, org_name = None, None
    if org_raw:
        parts = org_raw.split(" ", 1)
        asn = parts[0] if parts[0].startswith("AS") else None
        org_name = parts[1] if len(parts) > 1 else org_raw

    result = {
        "ip": data.get("ip"),
        "hostname": data.get("hostname"),
        "city": data.get("city"),
        "region": data.get("region"),
        "country": data.get("country"),
        "postal": data.get("postal"),
        "timezone": data.get("timezone"),
        "asn": asn,
        "org": org_name,
        "is_bogon": data.get("bogon", False),
    }

    # Remove None values
    return {k: v for k, v in result.items() if v is not None}


def ipinfoio(ip: str) -> dict:
    return get_ip_info(ip)
