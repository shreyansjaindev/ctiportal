import requests
import sys
import math
import os
from urllib.parse import urlparse
import logging

logger = logging.getLogger(__name__)

API_KEY = os.getenv("HOST_IO", "").split(",")[0]

BASE_URL = "https://host.io/api"


def request_data(url, params):
    return requests.get(url, params=params).json()


def hostio_full(params, domain):
    return request_data(f"{BASE_URL}/full/{domain}", params)


def hostio_related(params, domain):
    return request_data(f"{BASE_URL}/related/{domain}", params)


def hostio_ip(params, ip):
    return request_data(f"{BASE_URL}/domains/ip/{ip}", params)


def hostio_ns(params, domain):
    return request_data(f"{BASE_URL}/domains/ns/{domain}", params)


def hostio_mx(params, domain):
    return request_data(f"{BASE_URL}/domains/mx/{domain}", params)


def hostio_asn(params, asn):
    return request_data(f"{BASE_URL}/domains/asn/{asn}", params)


def hostio_backlinks(params, domain):
    return request_data(f"{BASE_URL}/domains/backlinks/{domain}", params)


def hostio_redirects(params, domain):
    url = f"{BASE_URL}/domains/redirects/{domain}"
    data = request_data(url, params)
    total = data.get("total")
    if total > 5 <= 1000:
        pages = math.floor(total / 5)
        for page in range(pages):
            params["page"] = page + 1
            temp_data = request_data(url, params)
            temp_data = temp_data.get("domains")
            data["domains"] += temp_data
    return data


def hostio_adsense(params, id):
    return request_data(f"{BASE_URL}/domains/adsense/{id}", params)


def hostio_googleanalytics(params, id):
    return request_data(f"{BASE_URL}/domains/googleanalytics/{id}", params)


def hostio_email(params, email):
    return request_data(f"{BASE_URL}/domains/email/{email}", params)


def hostio(query, input_type):
    if not API_KEY:
        logger.error("API key not found")
        return {"error": "API key not found"}

    data = {}

    params = {
        "token": API_KEY,
    }

    if input_type == "domain":
        data = hostio_related(params, query)
        # data.update(hostio_redirects(params, query))
    elif input_type == "url":
        data = hostio_related(params, urlparse(query).netloc)

    elif input_type == "ipv4" or input_type == "ipv6":
        data = hostio_ip(params, query)
    elif input_type == "email":
        data = hostio_email(params, query)
    return data


if __name__ == "__main__":
    query = sys.argv[1]
    input_type = sys.argv[2]
    print(hostio(query, input_type))
