import requests
import base64
import sys
import os


def bulk_screenshot(query_list):
    img = {}
    for query in query_list:
        img[query] = screenshotmachine(query)
    return img


def generate_api_url(customer_key, query):
    dimension = f"1366x768"

    if not query.startswith(("http://", "https://")):
        query = "http://" + query

    return f"https://api.screenshotmachine.com/?key={customer_key}&url={query}&dimension={dimension}"


def screenshotmachine(value, value_type="domain"):
    customer_keys = os.getenv("SCREENSHOTMACHINE", "").split(",")
    if not customer_keys:
        return {}

    for customer_key in customer_keys:
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
    print(screenshotmachine(sys.argv[1]))
