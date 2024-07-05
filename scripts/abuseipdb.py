import requests
import os
import sys
import logging

logger = logging.getLogger(__name__)


def abuseipdb(ip, value_type):
    api_key = os.getenv("ABUSEIPDB", "").split(",")[0]
    if not api_key:
        logger.error("API key not found")
        return {"error": "API key not found"}
    url = "https://api.abuseipdb.com/api/v2/check"
    params = {"ipAddress": ip, "maxAgeInDays": "90"}
    headers = {"Accept": "application/json", "Key": api_key}

    try:
        response = requests.get(url=url, headers=headers, params=params)
        response.raise_for_status()
        decodedResponse = response.json()
        return decodedResponse["data"]

    except requests.RequestException as e:
        logger.error(f"Error making the API request: {e}")
        return {}

    except KeyError as e:
        logger.error(f"Invalid response format: {e}")
        return {}


if __name__ == "__main__":
    query = sys.argv[1]
    print(abuseipdb(query))
