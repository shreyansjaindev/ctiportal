import requests
import sys
import tldextract
import re
import time
import os


API_KEY = os.getenv("URLSCAN_IO").split(",")[0]


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
            verdicts_overall_malicious = scan_results["verdicts"]["overall"][
                "malicious"
            ]
            task_report_URL = scan_results["task"]["reportURL"]

            url_scan_data["URL"] = task_url
            url_scan_data["Overall Verdict"] = str(verdicts_overall_score)
            url_scan_data["Malicious"] = str(verdicts_overall_malicious)
            url_scan_data["urlscan.io"] = str(
                scan_results["verdicts"]["urlscan"]["score"]
            )

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
    domain = (
        tldextract.extract(query).registered_domain if input_type == "url" else query
    )

    url = f"https://urlscan.io/api/v1/search/?q=task.domain:{domain}&size=10"
    response = requests.get(url)

    if response.status_code != 200:
        return {}

    data = response.json()

    for entry in data.get("results", []):
        url_data = entry["task"]
        url = url_data["url"]

        if url == query or f"http://{query}/" == url or f"https://{query}/" == url:
            return entry

        if re.match(f"(http|https)://www\.{domain}/*", url):
            return entry

        if re.match(f"(http|https)://\S*\.{domain}\S*", url):
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
            "time": task.get("time"),
            "url": task.get("url"),
            "domain": page.get("domain"),
            "ip": page.get("ip"),
            "asn_name": page.get("asnname"),
            "asn": page.get("asn"),
            "link": data.get("result"),
        }
    return filtered_data


# Supports Domain and URL
def urlscan(query, input_type):
    if not API_KEY:
        return {"error": "API key not found."}

    data = {}

    if input_type in ["domain", "url", "ipv4"]:
        data = filter(search(query, input_type))

    return data


if __name__ == "__main__":
    query = sys.argv[1]
    input_type = sys.argv[2]
    print(urlscan(query, input_type))
