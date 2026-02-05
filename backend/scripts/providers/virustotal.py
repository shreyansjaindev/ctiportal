import requests
import sys
import base64
import os

_raw_virustotal = os.getenv("VIRUSTOTAL")
if _raw_virustotal:
    API_KEYS = [k.strip() for k in _raw_virustotal.split(",") if k.strip()]
else:
    API_KEYS = []


def make_api_request(endpoint, headers):
    url = f"https://www.virustotal.com/api/v3/{endpoint}"
    response = requests.get(url, headers=headers)
    return response.json()


def file(query, headers):
    file_data = {}

    response_data = make_api_request(f"files/{query}", headers)
    data = response_data.get("data")
    attributes = data.get("attributes", {})

    file_data["Detection"] = attributes.get("last_analysis_stats", {})
    file_data["Filenames"] = attributes.get("names", "")
    file_data["MD5"] = attributes.get("md5", "")
    file_data["SHA1"] = attributes.get("sha1", "")
    file_data["SHA256"] = attributes.get("sha256", "")

    return file_data


def domain(query, headers):
    domain_data = {}

    response_data = make_api_request(f"domains/{query}", headers)
    data = response_data.get("data")
    attributes = data.get("attributes", {})

    domain_data["Detection"] = attributes.get("last_analysis_stats", {})
    domain_data["Categories"] = attributes.get("categories")

    response_data = make_api_request(f"domains/{query}/subdomains?limit=30", headers)
    data = response_data.get("data")

    subdomains = []
    for value in data:
        subdomains.append(value.get("id"))
    domain_data["Subdomains"] = subdomains

    return domain_data


def url(query, headers):
    url_data = {}
    encoded_query = base64.b64encode(query.encode()).decode()
    response_data = make_api_request(f"urls/{encoded_query}", headers)
    data = response_data.get("data")
    attributes = data.get("attributes", {})

    url_data["Detection"] = attributes.get("last_analysis_stats", {})
    url_data["Redirection Chain"] = attributes.get("redirection_chain", [])
    url_data["Final URL"] = attributes.get("last_final_url", "")

    return url_data


def ip_address(query, headers):
    ip_data = {}

    response_data = make_api_request(f"ip_addresses/{query}", headers)
    data = response_data.get("data")
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
