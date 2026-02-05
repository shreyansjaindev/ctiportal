from urllib.parse import urlparse
import requests
import sys
import os
import logging

logger = logging.getLogger(__name__)

_raw_phishtank = os.getenv("PHISHTANK")
if _raw_phishtank:
    API_KEY = _raw_phishtank.split(",")[0].strip()
else:
    API_KEY = None
API_URL = "https://checkurl.phishtank.com/checkurl/"


def check_url(value):
    valid_url = urlparse(value)
    if valid_url.scheme in ["http", "https"]:
        return value

    return "http://" + value


def get_results(url):
    results = {}
    headers = {"User-Agent": "phishtank/djangoctitools"}
    data = {"url": url, "format": "json", "app_key": API_KEY}

    try:
        response = requests.post(API_URL, headers=headers, data=data)
        if response.status_code == 200:
            results = response.json().get("results", {})
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")

    return results


def phishtank(value, value_type="url"):
    if not API_KEY:
        logger.error("API key not found")
        return {"error": "API key not found"}

    url = check_url(value)
    return get_results(url)


if __name__ == "__main__":
    query = sys.argv[1]
    print(phishtank(query))
