import requests
import sys
import os
import urllib.parse
import logging

logger = logging.getLogger(__name__)

API_KEY = os.getenv("IBM_XFORCE", "").split(",")[0]


def make_api_request(endpoint, headers):
    url = f"https://api.xforce.ibmcloud.com/{endpoint}"

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
    except Exception as e:
        logger.error(f"Error in API request to {url}: {e}")
        return {"error": str(e)}

    return response.json()


def ibm_ip(ip, headers):
    data = make_api_request(f"ipr/history/{ip}", headers)

    if data.get("error", None):
        return {"error": data["error"]}

    ip_category = str(data["history"][-1]["cats"]).translate({ord(i): None for i in "{'}"})
    ip_category = "Unsuspicious" if len(ip_category) == 0 else ip_category

    ip_score = str(data["history"][-1]["score"]).strip()

    ip_data = {"IP Category": ip_category, "Risk Score": ip_score}

    return ip_data


def ibm_cve(cve, headers):
    cve_data = {}
    temp_list = []

    data = make_api_request(f"vulnerabilities/search/{cve}", headers)[0]

    if data.get("error", None):
        return data

    if data.get("xfdbid", None):
        cve_data["ID"] = data.get("xfdbid", "Not Found")
        cve_data["Title"] = data.get("title", "Not Found")
        cve_data["Details"] = {
            "Tag Name": data.get("tagname", "Not Found"),
            "Reported Date": data.get("reported", "Not Found"),
            "Description": data.get("description", "Not Found"),
        }
        cve_data["Risk Score"] = data.get("risk_level", "Not Found")
        cve_data["CVSS"] = data.get("cvss", "Not Found")
        cve_data["Consequences"] = data.get("consequences", "Not Found")
        cve_data["Temporal Score"] = data.get("temporal_score", "Not Found")
        cve_data["Exploitability"] = data.get("exploitability", "Not Found")
        cve_data["Remediation Level"] = data.get("remediation_level", "Not Found")
        cve_data["Report Confidence"] = data.get("report_confidence", "Not Found")

        cve_data["Remedy"] = data.get("remedy", "Not Found")

        if data.get("signatures", None):
            cve_data["IBM Network Protection"] = data["signatures"]

        else:
            cve_data["IBM Network Protection"] = "Not Found"

        cve_data["Affected Products"] = data.get("platforms_affected", "Not Found")
        cve_data["Dependent Products"] = data.get("platforms_dependent", "Not Found")

        if data.get("references", None):
            if isinstance(data["references"], list):
                for ref_data in data["references"]:
                    temp_list.append(ref_data.get("link_target"))
                cve_data["References"] = temp_list
            else:
                cve_data["References"] = data.get("references", "Error")

    return cve_data


def ibm_url(query, headers):
    url_data = {}
    encoded_query = urllib.parse.quote(query, safe="")

    data = make_api_request(f"url/{encoded_query}", headers)

    if data.get("error", None):
        return data

    data = data.get("result")
    if data:
        url_data["Risk"] = data.get("score", "Not Found")
        url_data["URL"] = data.get("url", "Not Found")
        url_data["Categorization"] = data.get("cats", "Not Found")

        if url_data["Categorization"] != "Not Found":
            url_data["Categorization"] = list(url_data["Categorization"].keys())[0]

    return url_data


def ibm_hash(hash, headers):
    hash_data = {}

    data = make_api_request(f"malware/{hash}", headers)

    if data.get("error", None):
        return data

    data = data.get("malware")

    if data:
        hash_data["Risk"] = data.get("risk")
        external_source_data = data.get("origins").get("external")
        hash_data["Source"] = external_source_data.get("source")
        hash_data["First Seen"] = external_source_data.get("firstSeen")
        hash_data["Last Seen"] = external_source_data.get("lastSeen")
        hash_data["Malware Type"] = external_source_data.get("malwareType")
        hash_data["Platform"] = external_source_data.get("platform")
        hash_data["Detection Coverage"] = external_source_data.get("detectionCoverage")
        hash_data["Malware Family"] = external_source_data.get("family")

    return hash_data


def ibm(query, input_type):
    if not API_KEY:
        logger.error("API key not found")
        return {"error": "API key not found"}

    data = {}

    headers = {
        "Accept": "application/json",
        "Authorization": f"Basic {API_KEY}",
    }

    function_map = {
        "ipv4": ibm_ip,
        "ipv6": ibm_ip,
        "cve": ibm_cve,
        "url": ibm_url,
        "domain": ibm_url,
        "md5": ibm_hash,
        "sha1": ibm_hash,
        "sha256": ibm_hash,
        "sha512": ibm_hash,
    }

    if input_type in function_map:
        data = function_map[input_type](query, headers)

    return data


if __name__ == "__main__":
    query = sys.argv[1]
    input_type = sys.argv[2]
    print(ibm(query, input_type))
