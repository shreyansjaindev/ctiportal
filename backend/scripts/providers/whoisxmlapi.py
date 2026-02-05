import requests
import sys
import json
import os


API_KEYS = os.getenv("WHOISXMLAPI_DRS", "").split(",") if os.getenv("WHOISXMLAPI_DRS") else []


def whois(domain, api_key):
    url = f"https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey={api_key}&domainName={domain}&outputFormat=json"

    response = requests.get(url)
    whois_data = response.json()

    filtered_data = {}

    if not whois_data.get("dataError", ""):
        try:
            registry_data = whois_data["WhoisRecord"]["registryData"]
            keys = ["createdDate", "updatedDate", "expiresDate", "domainName", "status"]
            registrant_keys = ["name", "organization", "email"]

            for key in keys:
                filtered_data[key] = registry_data.get(key, "")

            for key in registrant_keys:
                filtered_data[f"registrant_{key}"] = registry_data["registrant"].get(key, "")

        except Exception as e:
            return {"Error": "An error occurred while processing the data: " + str(e)}

    return filtered_data


def reverse_whois(query, api_key):
    url = "https://reverse-whois-api.whoisxmlapi.com/api/v2"
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    payload = {
        "apiKey": api_key,
        "searchType": "current",
        "mode": "preview",
    }

    search_query = {"include": [query]}

    payload.update(
        {
            f"basicSearchTerms": search_query,
        }
    )

    response = requests.post(url, headers=headers, data=json.dumps(payload))
    reverse_whois_data = response.json()

    return reverse_whois_data


def iplocation(ip, api_key):
    url = f"https://ip-geolocation.whoisxmlapi.com/api/v1?apiKey={api_key}&ipAddress={ip}"

    response = requests.get(url)
    data = response.json()

    result = {}

    try:
        ip_address = data.get("ip", None)
        if ip_address:
            result["IP Address"] = ip_address

        location_data = data.get("location", None)
        if location_data:
            result.update(
                {
                    "Country": location_data.get("country"),
                    "Region": location_data.get("region"),
                    "City": location_data.get("city"),
                    "Coordinates": f"{location_data.get('lat')}, {location_data.get('lng')}",
                    "Postal Code": location_data.get("postalCode"),
                    "Time Zone": location_data.get("timezone"),
                }
            )

        isp = data.get("isp", None)
        if isp:
            result["ISP"] = isp

        as_data = data.get("as", None)
        if as_data:
            result["ASN"] = (
                f"ID: {as_data.get('asn', 'Not Found')}, Name: {as_data.get('name', 'Not Found')}"
            )
    except Exception as e:
        print(e)

    return result


def format_mx_record(data):
    if isinstance(data, list):
        return ", ".join(data).replace(".,", ",")[:-1]
    return data


def emailverification(email, api_key):
    filtered_dict = {}

    url = f"https://emailverification.whoisxmlapi.com/api/v2?apiKey={api_key}&emailAddress={email}"

    response = requests.get(url)
    data = response.json()

    keys_map = {
        "emailAddress": "Email Address",
        "smtpCheck": "SMTP Status",
        "dnsCheck": "DNS Status",
        "mxRecords": "MX Records",
    }

    filtered_dict = {
        v: (
            format_mx_record(data.get(k, "Not Found"))
            if k == "mxRecords"
            else data.get(k, "Not Found")
        )
        for k, v in keys_map.items()
    }

    return filtered_dict


def screenshot(query, api_key):
    if not query.startswith(("http://", "https://")):
        query = "http://" + query

    url = f"https://website-screenshot-api.whoisxmlapi.com/api/v1?apiKey={api_key}&url={query}&imageOutputFormat=base64&type=png&mode=slow"
    response = requests.get(url)
    img = response.content.decode("utf-8")
    return img


def whoisxmlapi_main(query, query_type):
    if not API_KEYS:
        return {}

    product_info = {
        "whois": {"id": 1, "function": whois},
        "emailverification": {"id": 7, "function": emailverification},
        "iplocation": {"id": 8, "function": iplocation},
        "reverse_whois": {"id": 14, "function": reverse_whois},
        "screenshot": {"id": 27, "function": screenshot},
    }

    for api_key in API_KEYS:
        url = f"https://user.whoisxmlapi.com/user-service/account-balance?apiKey={api_key}"
        response = requests.get(url)
        api_credits_data = response.json().get("data")

        for product in api_credits_data:
            if product["product_id"] == product_info[query_type]["id"] and product["credits"] != 0:
                func = product_info[query_type]["function"]
                if func:
                    return func(query, api_key)

    return {"Error": "API Credits Exhausted"}


if __name__ == "__main__":
    # query = sys.argv[1]
    # query_type = sys.argv[2]

    query = "aituvip.com"
    query_type = "reverse_whois"

    print(whoisxmlapi_main(query, query_type))
