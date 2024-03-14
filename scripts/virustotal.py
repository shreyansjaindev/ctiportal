import requests
import sys
import urllib.parse
import os

API_KEYS = os.getenv("VIRUSTOTAL").split(",")


def file(query, headers):
    file_data = {}

    url = f"https://www.virustotal.com/api/v3/files/{query}"
    response = requests.get(url, headers=headers)

    data = response.json().get("data")

    attributes = data.get("attributes", {})

    file_data["Detection"] = attributes.get("last_analysis_stats", {})
    file_data["Filenames"] = attributes.get("names", "")
    file_data["MD5"] = attributes.get("md5", "")
    file_data["SHA1"] = attributes.get("sha1", "")
    file_data["SHA256"] = attributes.get("sha256", "")

    return file_data


def domain(query, headers):
    domain_data = {}

    url = f"https://www.virustotal.com/api/v3/domains/{query}"
    response = requests.get(url, headers=headers)

    data = response.json().get("data")
    attributes = data.get("attributes", {})

    domain_data["Detection"] = attributes.get("last_analysis_stats", {})
    domain_data["Categories"] = attributes.get("categories")

    url = f"https://www.virustotal.com/api/v3/domains/{query}/subdomains?limit=30"
    response = requests.get(url, headers=headers)

    data = response.json().get("data")
    subdomains = []
    for value in data:
        subdomains.append(value.get("id"))
    domain_data["Subdomains"] = subdomains

    return domain_data


def url(query, headers):
    encoded_query = urllib.parse.quote(query, safe="")
    url = f"https://www.virustotal.com/api/v3/urls/{encoded_query}"
    response = requests.get(url, headers=headers)

    return response.json()


def ip_address(query, headers):
    ip_data = {}

    url = f"https://www.virustotal.com/api/v3/ip_addresses/{query}"
    response = requests.get(url, headers=headers)

    data = response.json().get("data")
    attributes = data.get("attributes", {})

    ip_data["Detection"] = attributes.get("last_analysis_stats", {})
    ip_data["CIDR"] = attributes.get("network", "")
    ip_data["AS Number"] = attributes.get("asn", "")
    ip_data["AS Owner"] = attributes.get("as_owner", "")
    ip_data["Country"] = attributes.get("country", "")

    return ip_data


def virustotal(query, input_type):
    if not API_KEYS:
        return {}

    processing_functions = {
        "md5": file,
        "sha1": file,
        "sha256": file,
        "sha512": file,
        "domain": domain,
        "url": url,
        "ipv4": ip_address,
        "ipv6": ip_address,
    }

    for api_key in API_KEYS:
        headers = {"x-apikey": api_key}

        # Get the appropriate processing function based on the input_type
        processing_function = processing_functions.get(input_type)
        if processing_function:
            return processing_function(query, headers)

    return {}


if __name__ == "__main__":
    query = sys.argv[1]
    input_type = sys.argv[2]
    print(virustotal(query, input_type))
