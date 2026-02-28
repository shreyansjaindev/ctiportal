import requests
import sys
import os
import logging
from ..utils.api_helpers import check_api_key

logger = logging.getLogger(__name__)

API_KEY = os.getenv("APILAYER", "").split(",")[0]

# https://apilayer.com/ (current)
# https://urlbox.io/


def emailvalidator(email):
    error = check_api_key(API_KEY, "APILayer")
    if error:
        return error
    url = f"http://apilayer.net/api/check?access_key={API_KEY}&email={email}&smtp=1"
    response = requests.get(url, timeout=10).json()
    return response


if __name__ == "__main__":
    query = sys.argv[1]
    print(emailvalidator(query))
