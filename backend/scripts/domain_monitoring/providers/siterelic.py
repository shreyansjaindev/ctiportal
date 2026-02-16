import os
import sys
import json
import time
import uuid
import requests
from requests.exceptions import RequestException, Timeout
from config import SCREENSHOT_DIRECTORY
from dotenv import load_dotenv
import logging
from ...utils.api_helpers import check_api_key

load_dotenv()

logger = logging.getLogger(__name__)

API_KEY = os.getenv("SITERELIC")
BASE_URL = "https://api.siterelic.com"


def post_request(url, payload):
    error = check_api_key(API_KEY, "SiteRelic")
    if error:
        return None

    headers = {"x-api-key": API_KEY, "Content-Type": "application/json"}

    try:
        response = requests.post(url, headers=headers, data=payload, timeout=10)
        response.raise_for_status()
        return response.json()
    except RequestException as e:
        logger.error(f"Error in API request to {url}: {e}")
        return None


def get_dns_records(query):
    url = f"{BASE_URL}/dnsrecord"
    payload = json.dumps({"url": query})

    results = post_request(url, payload)
    if results:
        data = results.get("data", {})
        return {
            "status_code": results.get("apiCode", ""),
            "a": [a["address"] for a in data.get("A", [])],
            "mx": [mx["exchange"] for mx in data.get("MX", [])],
            "spf": next(
                (txt[0] for txt in data.get("TXT", []) if txt[0].startswith("v=spf1")),
                "",
            ),
        }
    return {}


def save_screenshot(url):
    os.makedirs(SCREENSHOT_DIRECTORY, exist_ok=True)

    while True:
        filename = str(uuid.uuid4()) + ".png"
        filepath = os.path.join(SCREENSHOT_DIRECTORY, filename)
        if os.path.exists(filepath):
            continue

        try:
            response = requests.get(url)
            response.raise_for_status()
            if response.status_code == 200:
                with open(filepath, "wb") as f:
                    f.write(response.content)
                    logger.info(f"Screenshot saved to {filepath}")
                return filename
        except RequestException as e:
            logger.error(f"Error downloading screenshot from {url}: {e}")
            return ""


def get_website_screenshot(query, max_retries=5, retry_delay=1):
    url = f"{BASE_URL}/screenshot"
    payload = json.dumps(
        {
            "url": query,
            "device": "desktop",
            "blockAds": False,
            "skipCaptcha": False,
            "hideCookie": False,
        }
    )

    retries = 0
    while retries < max_retries:
        logger.info(f"Retrying {retries}...")
        try:
            results = post_request(url, payload)
            if results:
                screenshot_link = results.get("data", "")
                if screenshot_link:
                    return save_screenshot(screenshot_link)
        except (RequestException, ValueError, Timeout) as e:
            logger.error(f"Error fetching website screenshot for {query}: {e}")
            retries += 1
            time.sleep(retry_delay)
    return ""


def get_website_status(query):
    url = f"{BASE_URL}/redirectcheck"
    payload = json.dumps({"url": query})

    try:
        results = post_request(url, payload)
        if results:
            data = results.get("data", {})
            if data:
                data = data[-1]
            return {"url": data.get("url", ""), "code": data.get("status", "")}
    except (RequestException, ValueError, Timeout) as e:
        logger.error(f"Error fetching website status for {query}: {e}")
        return {"url": "", "code": ""}
    return {"url": "", "code": ""}


if __name__ == "__main__":
    query = sys.argv[1]
    print(get_website_status(query))
