"""
Hunter.io email verification provider.
API docs: https://hunter.io/api-documentation/v2#email-verifier
Env var: HUNTER_API_KEY
"""
import os
import logging
import requests
from ..utils.api_helpers import check_api_key

logger = logging.getLogger(__name__)

API_KEY = os.getenv("HUNTER_API_KEY", "").split(",")[0]


def verify_email(email: str) -> dict:
    error = check_api_key(API_KEY, "Hunter.io")
    if error:
        return error

    url = "https://api.hunter.io/v2/email-verifier"
    try:
        response = requests.get(
            url,
            params={"email": email, "api_key": API_KEY},
            timeout=15,
        )
        if response.status_code == 401:
            return {"error": "Hunter.io: invalid or missing API key"}
        if response.status_code == 429:
            return {"error": "Hunter.io: rate limit exceeded"}
        response.raise_for_status()
        data = response.json().get("data", {})
    except requests.RequestException as e:
        logger.error("Hunter.io request failed for %s: %s", email, e)
        return {"error": str(e)}

    # Hunter status values: "valid", "invalid", "accept_all", "webmail", "disposable", "unknown"
    status = data.get("status", "unknown")
    result = {
        "email": data.get("email", email),
        "valid": status == "valid",
        "format_valid": data.get("regexp", False),
        "mx_valid": bool(data.get("mx_records")),
        "smtp_valid": data.get("smtp_server", False) and data.get("smtp_check", False),
        "disposable": data.get("disposable", False),
        "webmail": data.get("webmail", False),
        "status": status,
        "score": data.get("score"),
    }

    # Remove None values
    return {k: v for k, v in result.items() if v is not None}


def hunterio_verify(email: str) -> dict:
    return verify_email(email)
