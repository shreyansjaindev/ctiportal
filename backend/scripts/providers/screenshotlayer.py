import requests
import sys
import base64
import os
import logging

logger = logging.getLogger(__name__)

API_KEY = os.getenv("SCREENSHOTLAYER").split(",")[0] if os.getenv("SCREENSHOTLAYER") else None

# https://screenshotlayer.com/ (current)
# https://urlbox.io/


def fullpage_screenshot(query, fullpage=0):
    dimension = "1366x768"

    if not query.startswith("http"):
        query = "http://" + query

    url = f"https://api.screenshotlayer.com/api/capture?access_key={API_KEY}&url={query}&viewport={dimension}&width=500&fullpage={fullpage}"
    img = base64.b64encode(requests.get(url).content)
    img = img.decode("utf-8")

    return img


def screenshot(query):
    if not API_KEY:
        logger.error("API key not found")
        return '{"error": "API key not found"}'

    try:
        return fullpage_screenshot(query)
    except Exception as e:
        print(e)
        return "{}"


if __name__ == "__main__":
    query = sys.argv[1]
    print(screenshot(query))
