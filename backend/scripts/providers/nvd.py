import sys
import requests


def _store_cvss(data, version, metric):
    cvss_data = metric.get("cvssData", {})
    version_prefix = version.replace(".", "_")

    data[f"cvss_v{version_prefix}_score"] = cvss_data.get("baseScore")
    data[f"cvss_v{version_prefix}_vector"] = cvss_data.get("vectorString")

    severity = metric.get("baseSeverity") or cvss_data.get("baseSeverity")
    if severity:
        data[f"cvss_v{version_prefix}_severity"] = severity

    return {
        "version": version,
        "score": cvss_data.get("baseScore"),
        "vector": cvss_data.get("vectorString"),
        "severity": severity,
    }


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

            data["cve_id"] = vuln.get("id", cve.upper())
            data["published_date"] = vuln.get("published")
            data["last_modified_date"] = vuln.get("lastModified")

            descriptions = vuln.get("descriptions", [])
            english_description = next(
                (item.get("value") for item in descriptions if item.get("lang") == "en" and item.get("value")),
                None,
            )
            if english_description:
                data["description"] = english_description

            # Extract CVSS scores
            metrics = vuln.get("metrics", {})

            preferred_cvss = None

            if "cvssMetricV40" in metrics and metrics["cvssMetricV40"]:
                preferred_cvss = _store_cvss(data, "4", metrics["cvssMetricV40"][0])

            if "cvssMetricV31" in metrics and metrics["cvssMetricV31"]:
                cvss_v31 = _store_cvss(data, "3.1", metrics["cvssMetricV31"][0])
                if preferred_cvss is None:
                    preferred_cvss = cvss_v31
            elif "cvssMetricV30" in metrics and metrics["cvssMetricV30"]:
                cvss_v30 = _store_cvss(data, "3.0", metrics["cvssMetricV30"][0])
                if preferred_cvss is None:
                    preferred_cvss = cvss_v30

            if "cvssMetricV2" in metrics and metrics["cvssMetricV2"]:
                cvss_v2 = _store_cvss(data, "2", metrics["cvssMetricV2"][0])
                if preferred_cvss is None:
                    preferred_cvss = cvss_v2

            if preferred_cvss:
                data["cvss_version"] = preferred_cvss["version"]
                data["cvss_score"] = preferred_cvss["score"]
                data["severity"] = preferred_cvss["severity"]
                data["cvss_vector"] = preferred_cvss["vector"]

            # CWE IDs
            data["cwe_ids"] = []
            for weakness in vuln.get("weaknesses", []):
                for description in weakness.get("description", []):
                    cwe_id = description.get("value", "").replace("CWE-", "")
                    if cwe_id and cwe_id not in data["cwe_ids"]:
                        data["cwe_ids"].append(cwe_id)

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
