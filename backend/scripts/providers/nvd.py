import requests
import sys
import os


def get_results(cve):
    """
    Fetch CVE details from NVD API 2.0 (free official API)
    No authentication required for basic queries
    """
    data = {}

    try:
        # NVD API 2.0 endpoint - free and no authentication required
        url = "https://services.nvd.nist.gov/rest/json/cves/2.0"
        params = {
            "cveId": cve.upper(),
        }

        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()

        cve_data = response.json()

        if "vulnerabilities" in cve_data and len(cve_data["vulnerabilities"]) > 0:
            vuln = cve_data["vulnerabilities"][0]["cve"]

            # Extract CVSS scores
            metrics = vuln.get("metrics", {})

            # CVSS 3.x
            if "cvssMetricV31" in metrics:
                cvss3 = metrics["cvssMetricV31"][0]["cvssData"]
                data["CVSS 3.x"] = cvss3.get("baseScore", "N/A")
                data["CVSS 3.x Vector"] = cvss3.get("vectorString", "N/A")
            elif "cvssMetricV30" in metrics:
                cvss3 = metrics["cvssMetricV30"][0]["cvssData"]
                data["CVSS 3.x"] = cvss3.get("baseScore", "N/A")
                data["CVSS 3.x Vector"] = cvss3.get("vectorString", "N/A")

            # CVSS 2.0
            if "cvssMetricV2" in metrics:
                cvss2 = metrics["cvssMetricV2"][0]["cvssData"]
                data["CVSS 2.0"] = cvss2.get("baseScore", "N/A")
                data["CVSS 2.0 Vector"] = cvss2.get("vectorString", "N/A")

            # CWE IDs
            data["CWE IDs"] = []
            for weakness in vuln.get("weaknesses", []):
                for description in weakness.get("description", []):
                    cwe_id = description.get("value", "").replace("CWE-", "")
                    if cwe_id and cwe_id not in data["CWE IDs"]:
                        data["CWE IDs"].append(cwe_id)

    except requests.exceptions.RequestException as e:
        print(f"Error occurred during NVD API request: {e}")

    except (KeyError, ValueError) as e:
        print(f"Error occurred during JSON parsing: {e}")

    except Exception as e:
        print(f"Unexpected error occurred: {e}")

    return data


def nvd(value):
    return get_results(value)


if __name__ == "__main__":
    print(get_results(sys.argv[1]))
