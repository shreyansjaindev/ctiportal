import requests
import sys
import os
import logging

logger = logging.getLogger(__name__)

API_KEY = os.getenv("APILAYER", "").split(",")[0]

# https://apilayer.com/ (current)
# https://urlbox.io/


def get_result(email):
    if not API_KEY:
        logger.error("API key not found")
        return {"error": "API key not found"}
    url = f"http://apilayer.net/api/check?access_key={API_KEY}&email={email}&smtp=1"
    response = requests.get(url).json()
    return response


def emailvalidator(value, value_type="email"):
    return get_result(value)


if __name__ == "__main__":
    query = sys.argv[1]
    print(emailvalidator(query))
