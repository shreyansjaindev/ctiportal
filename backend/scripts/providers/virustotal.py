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


def _resolve_headers(headers):
    if headers is not None:
        return headers
    if not API_KEYS:
        return None
    return {"x-apikey": API_KEYS[0]}


def file(query, headers=None):
    file_data = {}

    headers = _resolve_headers(headers)
    if not headers:
        return {"error": "No VirusTotal API key available"}

    response_data = make_api_request(f"files/{query}", headers)
    data = response_data.get("data")
    if not data:
        return file_data
    attributes = data.get("attributes", {})

    file_data = dict(attributes)
    return file_data


def domain(query, headers=None):
    domain_data = {}

    headers = _resolve_headers(headers)
    if not headers:
        return {"error": "No VirusTotal API key available"}

    response_data = make_api_request(f"domains/{query}", headers)
    data = response_data.get("data")
    if not data:
        return domain_data
    attributes = data.get("attributes", {})

    domain_data = dict(attributes)

    # Flatten SSL certificate (deeply nested raw object → usable dict)
    cert = domain_data.pop("last_https_certificate", None)
    if isinstance(cert, dict):
        domain_data["ssl_certificate"] = {
            "issuer": cert.get("issuer", {}),
            "subject": cert.get("subject", {}),
            "valid_from": cert.get("validity", {}).get("not_before", ""),
            "valid_to": cert.get("validity", {}).get("not_after", ""),
        }

    return domain_data


def get_subdomains(domain, headers=None):
    """Get first page of subdomains plus the real total count from VirusTotal."""
    headers = _resolve_headers(headers)
    if not headers:
        return {"error": "No VirusTotal API key available"}

    response_data = make_api_request(f"domains/{domain}/subdomains?limit=40", headers)
    data = response_data.get("data")
    if not data:
        return {"subdomains": [], "total_count": 0}

    subdomains = [value.get("id") for value in data if value.get("id")]
    # meta.count is the real total VT has, regardless of how many we fetched
    total_count = response_data.get("meta", {}).get("count", len(subdomains))

    return {"subdomains": subdomains, "total_count": total_count}


def url(query, headers=None):
    url_data = {}
    encoded_query = base64.b64encode(query.encode()).decode()

    headers = _resolve_headers(headers)
    if not headers:
        return {"error": "No VirusTotal API key available"}

    response_data = make_api_request(f"urls/{encoded_query}", headers)
    data = response_data.get("data")
    if not data:
        return url_data
    attributes = data.get("attributes", {})

    url_data = dict(attributes)
    return url_data


def ip_address(query, headers=None):
    ip_data = {}

    headers = _resolve_headers(headers)
    if not headers:
        return {"error": "No VirusTotal API key available"}

    response_data = make_api_request(f"ip_addresses/{query}", headers)
    data = response_data.get("data")
    if not data:
        return ip_data
    attributes = data.get("attributes", {})

    ip_data = dict(attributes)

    # Flatten SSL certificate (deeply nested raw object → usable dict)
    cert = ip_data.pop("last_https_certificate", None)
    if isinstance(cert, dict):
        ip_data["ssl_certificate"] = {
            "issuer": cert.get("issuer", {}),
            "subject": cert.get("subject", {}),
            "valid_from": cert.get("validity", {}).get("not_before", ""),
            "valid_to": cert.get("validity", {}).get("not_after", ""),
        }

    return ip_data


def get_passive_dns(domain):
    """Get passive DNS records from VirusTotal"""
    if not API_KEYS:
        return {"error": "No VirusTotal API key available"}
    
    try:
        headers = {"x-apikey": API_KEYS[0]}
        response_data = make_api_request(f"domains/{domain}/resolutions?limit=40", headers)
        
        data = response_data.get("data", [])
        records = []
        
        for record in data:
            attributes = record.get("attributes", {})
            records.append({
                "ip_address": attributes.get("ip_address"),
                "date": attributes.get("date"),
                "host_name": attributes.get("host_name")
            })
        
        return {
            "records": records,
            "total_count": len(records)
        }
    except Exception as e:
        return {"error": str(e)}


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
