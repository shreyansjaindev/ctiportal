import requests
import sys
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("VIRUSTOTAL")

if not API_KEY:
    raise ValueError("Missing VIRUSTOTAL API key")


def get_subdomains(query):
    headers = {"x-apikey": API_KEY}
    url = f"https://www.virustotal.com/api/v3/domains/{query}/relationships/subdomains"

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
    except requests.exceptions.RequestException as err:
        print(f"An error occurred: {err}")
        return []

    data = response.json().get("data", [])
    return [value.get("id") for value in data]


if __name__ == "__main__":
    query = sys.argv[1]
    print(get_subdomains(query))
