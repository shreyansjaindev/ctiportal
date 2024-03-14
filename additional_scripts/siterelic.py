import requests
import sys
import json
import os
import time
import uuid
from config import SCREENSHOT_DIRECTORY
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("SITERELIC")


def get_dns_records(query):
    url = "https://api.siterelic.com/dnsrecord"
    headers = {"x-api-key": API_KEY, "Content-Type": "application/json"}

    payload = json.dumps(
        {
            "url": query,
        }
    )

    response = requests.post(url, headers=headers, data=payload, timeout=10)
    results = response.json()

    data = results.get("data", {})

    return {
        "status_code": results.get("apiCode", ""),
        "a": [a["address"] for a in data.get("A", [])],
        "mx": [mx["exchange"] for mx in data.get("MX", [])],
        "spf": next(
            (txt[0] for txt in data.get("TXT", []) if txt[0].startswith("v=spf1")), ""
        ),
    }


def save_screenshot(url):
    os.makedirs(SCREENSHOT_DIRECTORY, exist_ok=True)

    while True:
        filename = str(uuid.uuid4()) + ".png"
        filepath = os.path.join(SCREENSHOT_DIRECTORY, filename)
        if os.path.exists(filepath):
            continue

        response = requests.get(url)
        if response.status_code == 200:
            with open(filepath, "wb") as f:
                f.write(response.content)
                print(f"Screenshot saved to {filepath}")
            return filename
        return ""


def get_website_screenshot(query, max_retries=5, retry_delay=1):
    url = "https://api.siterelic.com/screenshot"
    headers = {"x-api-key": API_KEY, "Content-Type": "application/json"}

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
        print(f"Retrying {retries}...")
        try:
            response = requests.post(url, headers=headers, data=payload, timeout=10)
            results = response.json()
            screenshot_link = results.get("data", "")
            if screenshot_link:
                return save_screenshot(screenshot_link)
        except requests.exceptions.Timeout:
            retries += 1
            time.sleep(retry_delay)
    return ""


def get_website_status(query):
    url = "https://api.siterelic.com/redirectcheck"
    headers = {"x-api-key": API_KEY, "Content-Type": "application/json"}

    payload = json.dumps({"url": query, "proxyCountry": "us"})

    try:
        response = requests.post(url, headers=headers, data=payload, timeout=10)
        results = response.json()
    except:
        results = {}

    data = results.get("data", {})
    if data:
        data = data[-1]

    return {"url": data.get("url", ""), "code": data.get("status", "")}


if __name__ == "__main__":
    query = sys.argv[1]
    print(get_website_status(query))
