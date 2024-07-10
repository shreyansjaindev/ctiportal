import os
import requests
import base64
import sys

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


def get_website_screenshot(value, value_type="domain"):
    if not API_KEYS:
        return {}

    for customer_key in API_KEYS:
        error = None

        api_url = generate_api_url(customer_key, value)
        response = requests.get(api_url)

        try:
            if response.headers["X-Screenshotmachine-Response"] == "no_credits":
                error = "no_credits"

        finally:
            if error != "no_credits":
                img = base64.b64encode(response.content)
                img = img.decode("utf-8")
                return img


if __name__ == "__main__":
    print(get_website_screenshot(sys.argv[1]))
