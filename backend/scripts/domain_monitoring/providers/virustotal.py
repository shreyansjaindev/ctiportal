import os
import sys
import requests
import logging
from dotenv import load_dotenv
from ...utils.api_helpers import check_api_key

load_dotenv()

logger = logging.getLogger(__name__)

API_KEY = os.getenv("VIRUSTOTAL")


def get_subdomains(query):
    error = check_api_key(API_KEY, "VirusTotal")
    if error:
        return []

    headers = {"x-apikey": API_KEY}
    url = f"https://www.virustotal.com/api/v3/domains/{query}/relationships/subdomains"

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json().get("data", [])
        return [value.get("id") for value in data]

    except requests.exceptions.RequestException as e:
        logger.error(f"An error occurred: {e}")
        return []


if __name__ == "__main__":
    query = sys.argv[1]
    print(get_subdomains(query))
