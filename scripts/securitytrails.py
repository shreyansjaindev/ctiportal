import requests
import time
import sys
import os
import logging

logger = logging.getLogger(__name__)

API_KEY = os.getenv("SECURITYTRAILS", "").split(",")[0]
HEADERS = {
    "accept": "application/json",
    "APIKEY": API_KEY,
}


def get_whois(domain, value_type):
    if not API_KEY:
        logger.error("API key not found")
        return {"error": "API key not found"}

    url = f"https://api.securitytrails.com/v1/domain/{domain}/whois"

    for _ in range(5):  # Maximum of 10 retries
        try:
            response = requests.get(url, headers=HEADERS)
            response.raise_for_status()  # Raises a HTTPError if the status is 4xx, 5xx
        except requests.exceptions.RequestException as e:
            print(e)
            time.sleep(2)
            continue

        results = response.json()

        whois_data = {
            "created_date": results.get("createdDate"),
            "updated_date": results.get("updatedDate"),
            "expires_date": results.get("expiresDate"),
            "registrar_name": results.get("registrarName"),
            "status": results.get("status"),
            "domain_name": results.get("domain"),
        }

        contacts = results.get("contacts", [])

        contact_fields = {
            "name": "registrant_name",
            "organization": "registrant_organization",
            "email": "registrant_email",
            "city": "registrant_city",
            "state": "registrant_state",
            "country": "registrant_country",
        }

        for contact in contacts:
            for contact_field, whois_field in contact_fields.items():
                value = contact.get(contact_field)
                if value:
                    whois_data[whois_field] = value

        return {
            k: v for k, v in whois_data.items() if v is not None
        }  # Remove None values

    return {"error": "Request Failed"}


def get_dns_records(domain):
    if not API_KEY:
        return {"error": "API key not found"}

    data = {"a": [], "mx": [], "spf": ""}

    url = f"https://api.securitytrails.com/v1/domain/{domain}"

    results = {}

    while True:
        response = requests.get(url, headers=HEADERS)
        if response.status_code == 200:
            results = response.json()["current_dns"]
            if results["a"]:
                for value in results["a"]["values"]:
                    data["a"].append(value["ip"])
            if results["mx"]:
                for value in results["mx"]["values"]:
                    data["mx"].append(value["hostname"])
            if results["txt"]:
                for value in results["txt"]["values"]:
                    if "v=spf" in value["value"]:
                        data["spf"] = value["value"]

            break
        elif response.status_code == 429:
            time.sleep(2)
            continue
        else:
            break

    return data


if __name__ == "__main__":
    domain = sys.argv[1]
    value_type = sys.argv[2]
    print(get_whois(domain, value_type))
