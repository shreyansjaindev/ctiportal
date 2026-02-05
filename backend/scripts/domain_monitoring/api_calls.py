import os
import requests
from datetime import datetime, timedelta
import pytz
import logging

from dotenv import load_dotenv
from api_endpoints import *

load_dotenv()

logger = logging.getLogger(__name__)

API_TOKEN = os.getenv("DRF_AUTH_TOKEN")

HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"Token {API_TOKEN}",
}


def make_api_request(method, endpoint, params=None, data=None):
    try:
        response = requests.request(method, endpoint, headers=HEADERS, params=params, json=data)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Request to {endpoint} failed: {e}")
        return {}


def get_active_companies():
    params = {"status": "active"}
    response_data = make_api_request("GET", COMPANIES_ENDPOINT, params=params)
    return [result["name"] for result in response_data.get("results", [])]


def get_watched_resources(company):
    params = {"company": company, "status": "active"}
    response_data = make_api_request("GET", WATCHED_RESOURCES_ENDPOINT, params=params)
    if response_data:
        return [
            {
                "value": result.get("value", "").strip().lower(),
                "resource_type": result.get("resource_type", ""),
                "properties": result.get("properties", []),
                "exclude_keywords": result.get("exclude_keywords", []),
            }
            for result in response_data.get("results", [])
        ]
    return []


def get_monitored_domains():
    params = {"status": "active"}
    response_data = make_api_request("GET", MONITORED_DOMAINS_ENDPOINT, params=params)
    results = response_data.get("results", {})
    monitored_domains = (
        [{"value": domain["value"], "company": domain["company"]} for domain in results]
        if results
        else []
    )
    return monitored_domains


def add_lookalike_domain(resource_match, date, company):
    data = {
        "source_date": date,
        "value": resource_match["domain_name"],
        "watched_resource": resource_match["resource_value"],
        "potential_risk": resource_match["risk"],
        "status": "open",
        "source": "whoisxmlapi",
        "company": company,
    }
    response = requests.post(LOOKALIKE_DOMAINS_ENDPOINT, headers=HEADERS, json=data)
    return response


def add_ssl_certificate(*args, **kwargs):
    data = {
        "cert_index": kwargs["cert_index"],
        "cert_domain": kwargs["cert_domain"],
        "watched_domain": kwargs["watched_domain"],
        "company": kwargs["company"],
    }
    response = requests.post(SSL_CERTIFICATES_ENDPOINT, headers=HEADERS, json=data)
    return response


def get_monitored_domains_with_past_check_date():
    today = datetime.now(pytz.utc).strftime("%Y-%m-%d")
    params = {"last_checked__lt": today, "status": "active"}
    response_data = make_api_request("GET", MONITORED_DOMAINS_ENDPOINT, params=params)
    monitored_domains = response_data.get("results", {})
    return monitored_domains


def get_ssl_certificates_for_domain_and_company(domain, company):
    yesterday = (datetime.now(pytz.utc) - timedelta(days=1)).date()
    params = {
        "created__icontains": yesterday,
        "watched_domain": domain,
        "company": company,
    }
    response_data = make_api_request("GET", SSL_CERTIFICATES_ENDPOINT, params=params)
    data = response_data.get("results", [])
    return [d["cert_domain"] for d in data]


# def get_latest_monitored_domain_alert(domain, company):
#     params = {"domain_name": domain, "company": company, "ordering": "-created"}
#     response = requests.get(MONITORED_DOMAIN_ALERTS_ENDPOINT, headers=HEADERS, params=params)
#     alerts = response.json().get("results", [])
#     return alerts[0] if alerts else None


def post_monitored_domain_alert(data):
    return requests.post(
        MONITORED_DOMAIN_ALERTS_ENDPOINT,
        headers=HEADERS,
        json=data,
    )


def update_monitored_domain(monitored_domain_id, data):
    data["last_checked"] = datetime.now(pytz.utc).strftime("%Y-%m-%d")
    response = requests.patch(
        f"{MONITORED_DOMAINS_ENDPOINT}{monitored_domain_id}/",
        headers=HEADERS,
        json=data,
    )
    if response.status_code == 200:
        return True
    return False
