import requests
import sys
import hashlib
import os
import logging
from ..utils.api_helpers import check_api_key

logger = logging.getLogger(__name__)

API_KEY = os.getenv("WEBSCRAPING_AI").split(",")[0]


def websiteHTML(url):
    headers = {
        "accept": "text/html",
    }

    params = {
        "url": url,
        "timeout": "5000",
        "js": "false",
        "proxy": "datacenter",
        "api_key": API_KEY,
    }

    response = requests.get("https://api.webscraping.ai/html", headers=headers, params=params)
    data = response.content.decode("utf-8")
    return data


def stringHash(string):
    hash_object = hashlib.sha256(bytes(string, "utf-8"))
    hex_dig = hash_object.hexdigest()
    return hex_dig


def run(query, input_type):
    error = check_api_key(API_KEY, "WebScraping.AI")
    if error:
        return error

    data = {}

    if input_type == "domain":
        temp = websiteHTML("http://" + query)
    elif input_type == "url":
        temp = websiteHTML(query)

    data["sha256"] = stringHash(temp)
    data["html"] = temp

    return data


if __name__ == "__main__":
    query = sys.argv[1]
    input_type = sys.argv[2]
    print(run(query, input_type))
