import os
import requests
import uuid

from config import SCREENSHOT_DIRECTORY
from dotenv import load_dotenv

load_dotenv()

API_KEYS = os.getenv("SCREENSHOTMACHINE").split(",")


def bulk_screenshot(query_list):
    img = {}
    for query in query_list:
        img[query] = get_website_screenshot(query)
    return img


def generate_api_url(api_key, query):
    dimension = "1920x1080"
    if not query.startswith(("http://", "https://")):
        query = "http://" + query
    return f"https://api.screenshotmachine.com/?key={api_key}&url={query}&device=desktop&dimension={dimension}&format=png&cacheLimit=0&delay=2000"


def get_website_screenshot(query):
    os.makedirs(SCREENSHOT_DIRECTORY, exist_ok=True)

    while True:
        filename = str(uuid.uuid4()) + ".png"
        filepath = os.path.join(SCREENSHOT_DIRECTORY, filename)
        if os.path.exists(filepath):
            continue
        break
    for customer_key in API_KEYS:
        api_url = generate_api_url(customer_key, query)
        response = requests.get(api_url)
        if "X-Screenshotmachine-Response" in response.headers.keys():
            error = response.headers["X-Screenshotmachine-Response"]
            if error == "no_credits":
                # Mask API key in logs - only show first/last 4 chars
                masked_key = f"{customer_key[:4]}...{customer_key[-4:]}" if len(customer_key) > 8 else "****"
                print(f"API key ending in {customer_key[-4:]}: {error}")
                continue
            elif error == "invalid_url":
                print(f"{error}")
                return ""

        with open(filepath, "wb") as f:
            f.write(response.content)
            print(f"Screenshot saved to {filepath}")
        return filename

    return filename
