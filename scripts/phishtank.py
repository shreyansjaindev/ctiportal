from urllib.parse import urlparse
import requests
import sys
import os


API_KEY = os.getenv("PHISHTANK").split(",")[0]
API_URL = "https://checkurl.phishtank.com/checkurl/"


def check_url(url):
    valid_url = urlparse(url)
    if valid_url.scheme in ["http", "https"]:
        return url

    return "http://" + url


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
        return {"error": "API key not found."}

    url = check_url(value)
    return get_results(url)


if __name__ == "__main__":
    query = sys.argv[1]
    print(phishtank(query))
