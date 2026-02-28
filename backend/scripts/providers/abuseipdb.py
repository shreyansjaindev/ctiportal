import requests
import os
import sys
import logging
from ..utils.api_helpers import check_api_key

logger = logging.getLogger(__name__)


def abuseipdb(ip):
    api_key = os.getenv("ABUSEIPDB", "").split(",")[0]
    error = check_api_key(api_key, "AbuseIPDB")
    if error:
        return error
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
