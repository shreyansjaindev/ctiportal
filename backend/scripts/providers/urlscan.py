import requests
import sys
import tldextract
import re
import time
import os
import logging
from ..utils.api_helpers import check_api_key

logger = logging.getLogger(__name__)

_raw_urlscan = os.getenv("URLSCAN_IO")
if _raw_urlscan:
    API_KEY = _raw_urlscan.split(",")[0].strip()
else:
    API_KEY = None


def scan(query):
    url_scan_data = {}
    url_to_scan = query.strip()

    headers = {
        "Content-Type": "application/json",
        "API-Key": API_KEY,
    }

    response = requests.post(
        "https://urlscan.io/api/v1/scan/",
        headers=headers,
        data='{"url": "%s", "public": "on" }' % url_to_scan,
    ).json()

    try:
        if "successful" in response["message"]:
            # uuid, this is the factor that identifies the scan
            uuid_variable = str(response["uuid"])
            # sleep for 45 seconds. The scan takes awhile, if we try to retrieve the scan too soon, it will return an error.
            time.sleep(45)
            # retrieving the scan using the uuid for this scan
            scan_results = requests.get(
                "https://urlscan.io/api/v1/result/%s/" % uuid_variable
            ).json()

            task_url = scan_results["task"]["url"]
            verdicts_overall_score = scan_results["verdicts"]["overall"]["score"]
            verdicts_overall_malicious = scan_results["verdicts"]["overall"]["malicious"]
            task_report_URL = scan_results["task"]["reportURL"]

            url_scan_data["URL"] = task_url
            url_scan_data["Overall Verdict"] = str(verdicts_overall_score)
            url_scan_data["Malicious"] = str(verdicts_overall_malicious)
            url_scan_data["urlscan.io"] = str(scan_results["verdicts"]["urlscan"]["score"])

            if scan_results["verdicts"]["urlscan"]["malicious"]:
                url_scan_data["Malicious Results"] = str(
                    scan_results["verdicts"]["urlscan"]["malicious"]
                )  # True

            for line in scan_results["verdicts"]["urlscan"]["categories"]:
                url_scan_data["Categories Results"] = "\t" + str(line)  # phishing

            for line in scan_results["verdicts"]["engines"]["verdicts"]:
                url_scan_data["Categories Results"] = (
                    url_scan_data["Categories Results"]
                    + str(line["engine"])
                    + " score: "
                    + str(line["score"])
                )  # googlesafebrowsing

                for item in line["categories"]:
                    # social_engineering
                    url_scan_data["Categories Results"] = (
                        url_scan_data["Categories Results"] + "\t" + item
                    )

            url_scan_data["See full report for more details"] = str(task_report_URL)
            return url_scan_data
        else:
            print("{" + response["message"] + "}")
    except:
        print("{" + "Error reaching URLScan.io" + "}")


def search(query, input_type):
    """Search URLScan.io for scans matching the given query."""
    # Extract domain from URL if input_type is "url", otherwise use query as-is
    domain = tldextract.extract(query).registered_domain if input_type == "url" else query

    url = f"https://urlscan.io/api/v1/search/?q=task.domain:{domain}&size=10"

    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        logger.error(f"Error searching URLScan.io: {e}")
        return {}

    data = response.json()

    # Compile regex patterns once for better performance
    www_pattern = re.compile(rf"^https?://www\.{re.escape(domain)}/?.*$")
    subdomain_pattern = re.compile(rf"^https?://.*\.{re.escape(domain)}.*$")

    for entry in data.get("results", []):
        url_data = entry.get("task", {})
        url = url_data.get("url", "")

        if not url:
            continue

        # Exact matches (with and without protocol)
        if url == query or url == f"http://{query}/" or url == f"https://{query}/":
            return entry

        # Match www.domain pattern
        if www_pattern.match(url):
            return entry

        # Match subdomain.domain pattern
        if subdomain_pattern.match(url):
            return entry

    return {}


def filter(data):
    filtered_data = {}
    id = data.get("_id")
    if id:
        task = data.get("task", {})
        page = data.get("page", {})
        filtered_data = {
            "id": id,
            "time": task.get("time", ""),
            "url": task.get("url", ""),
            "domain": page.get("domain", ""),
            "ip": page.get("ip", ""),
            "asn_name": page.get("asnname", ""),
            "asn": page.get("asn", ""),
            "link": data.get("result", "").replace("api/v1/", "", 1),
        }
    return filtered_data


# Supports Domain and URL
def urlscan(query, input_type):
    error = check_api_key(API_KEY, "URLScan")
    if error:
        return error

    data = {}
    print("Query: ", query)

    if input_type in ["domain", "url", "ipv4"]:
        data = filter(search(query, input_type))

    return data


if __name__ == "__main__":
    query = sys.argv[1]
    input_type = sys.argv[2]
    print(urlscan(query, input_type))
