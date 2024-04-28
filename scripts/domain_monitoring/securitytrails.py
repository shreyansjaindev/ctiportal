import requests
import time
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("SECURITYTRAILS")


def get_whois(domain, value_type):
    url = f"https://api.securitytrails.com/v1/domain/{domain}/whois"

    headers = {
        "accept": "application/json",
        "APIKEY": API_KEY,
    }

    results = {}
    whois_data = {}

    while True:
        response = requests.get(url, headers=headers)
        if response.status_code == 429:
            time.sleep(2)
            continue
        else:
            try:
                results = response.json()
                created_date = results.get("createdDate", "")
                updated_date = results.get("updatedDate", "")
                expires_date = results.get("expiresDate", "")
                registrar_name = results.get("registrarName", "")
                status = results.get("status", "")

                if created_date:
                    whois_data["createdDate"] = created_date
                if updated_date:
                    whois_data["updatedDate"] = updated_date
                if expires_date:
                    whois_data["expiresDate"] = expires_date
                if registrar_name:
                    whois_data["registrar_name"] = registrar_name
                if status:
                    whois_data["status"] = status

                if whois_data:
                    whois_data["domainName"] = results.get("domain", "")

                    contacts = results.get("contacts", [])
                    for contact in contacts:
                        name = contact.get("name", "")
                        organization = contact.get("organization", "")
                        email = contact.get("email", "")

                        if name:
                            whois_data["registrant_name"] = name
                        if organization:
                            whois_data["registrant_organization"] = organization
                        if email:
                            whois_data["registrant_email"] = email

            except Exception as e:
                print(e)
            break

    return whois_data


def get_dns_records(domain):
    data = {"a": [], "mx": [], "spf": ""}

    url = f"https://api.securitytrails.com/v1/domain/{domain}"

    headers = {
        "accept": "application/json",
        "APIKEY": API_KEY,
    }

    results = {}

    while True:
        response = requests.get(url, headers=headers)
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
    print(get_whois("google.com", "domain"))
