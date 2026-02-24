import logging
import os
import time
from urllib.parse import urlparse

import requests
import tldextract

from ..utils.api_helpers import check_api_key

logger = logging.getLogger(__name__)

_raw_urlscan = os.getenv("URLSCAN_IO")
API_KEY = _raw_urlscan.split(",")[0].strip() if _raw_urlscan else None


def _normalize_report_link(link: str) -> str:
    if not link:
        return ""
    return link.replace("api/v1/", "", 1)


def _detect_scan_input_type(query: str, input_type: str | None = None) -> str:
    if input_type in ["domain", "url", "ipv4"]:
        return input_type

    value = (query or "").strip()
    if not value:
        return "domain"

    parts = value.split(".")
    if len(parts) == 4 and all(p.isdigit() and 0 <= int(p) <= 255 for p in parts):
        return "ipv4"

    if value.startswith(("http://", "https://")):
        return "url"

    return "domain"


def _extract_search_key(query: str, input_type: str) -> str:
    if input_type == "ipv4":
        return query.strip()

    if input_type == "url":
        extracted = tldextract.extract(query)
        domain = extracted.registered_domain
        if domain:
            return domain

        parsed = urlparse(query)
        if parsed.hostname:
            return parsed.hostname

    return query.strip()


def _build_search_query(query: str, input_type: str) -> str:
    key = _extract_search_key(query, input_type)
    if input_type == "ipv4":
        return f"page.ip:{key}"
    return f"task.domain:{key}"


def search(query: str, input_type: str, size: int = 10) -> list:
    """Search URLScan.io for existing scans."""
    search_query = _build_search_query(query, input_type)
    url = f"https://urlscan.io/api/v1/search/?q={search_query}&size={size}"

    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        data = response.json()
        return data.get("results", [])
    except requests.RequestException as e:
        logger.error(f"Error searching URLScan.io: {e}")
        return []


def _pick_best_result(results: list, query: str, input_type: str) -> dict:
    if not results:
        return {}

    needle = query.strip().lower()

    if input_type == "ipv4":
        for entry in results:
            if entry.get("page", {}).get("ip", "").strip() == query.strip():
                return entry
        return results[0]

    for entry in results:
        task_url = entry.get("task", {}).get("url", "").lower().strip()
        page_domain = entry.get("page", {}).get("domain", "").lower().strip()

        if input_type == "url" and task_url.startswith(needle):
            return entry

        if input_type == "domain" and (page_domain == needle or page_domain.endswith(f".{needle}")):
            return entry

    return results[0]


def _get_unique_results(results: list, query: str, input_type: str) -> list:
    """Return unique, filtered URLScan hits relevant to the input."""
    if not results:
        return []

    needle = query.strip().lower()
    filtered_results = []

    for entry in results:
        task_url = entry.get("task", {}).get("url", "").lower().strip()
        page_domain = entry.get("page", {}).get("domain", "").lower().strip()
        page_ip = entry.get("page", {}).get("ip", "").strip()

        if input_type == "ipv4":
            if page_ip == query.strip():
                filtered_results.append(entry)
            continue

        if input_type == "url":
            if task_url.startswith(needle):
                filtered_results.append(entry)
            continue

        if input_type == "domain":
            if page_domain == needle or page_domain.endswith(f".{needle}"):
                filtered_results.append(entry)

    candidates = filtered_results or results

    unique = []
    seen = set()
    for entry in candidates:
        filtered_entry = _filter_entry(entry)
        if not filtered_entry:
            continue
        key = filtered_entry.get("id") or filtered_entry.get("link") or filtered_entry.get("url")
        if key in seen:
            continue
        seen.add(key)
        unique.append(filtered_entry)

    return unique


def _filter_entry(entry: dict) -> dict:
    filtered_data = {}
    result_id = entry.get("_id")
    if result_id:
        task = entry.get("task", {})
        page = entry.get("page", {})
        verdicts = entry.get("verdicts", {})
        overall = verdicts.get("overall", {})

        filtered_data = {
            "id": result_id,
            "time": task.get("time", ""),
            "url": task.get("url", ""),
            "domain": page.get("domain", ""),
            "ip": page.get("ip", ""),
            "asn_name": page.get("asnname", ""),
            "asn": page.get("asn", ""),
            "overall_score": overall.get("score"),
            "overall_malicious": overall.get("malicious"),
            "link": _normalize_report_link(entry.get("result", "")),
        }
    return filtered_data


def _submit_scan(url_to_scan: str) -> dict:
    headers = {
        "Content-Type": "application/json",
        "API-Key": API_KEY,
    }

    try:
        response = requests.post(
            "https://urlscan.io/api/v1/scan/",
            headers=headers,
            json={"url": url_to_scan, "public": "on"},
            timeout=30,
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        logger.error(f"Error submitting URLScan scan: {e}")
        return {"error": str(e)}


def _poll_scan_result(scan_uuid: str, attempts: int = 12, delay_seconds: int = 5) -> dict:
    result_url = f"https://urlscan.io/api/v1/result/{scan_uuid}/"
    for _ in range(attempts):
        try:
            response = requests.get(result_url, timeout=30)
            if response.status_code == 404:
                time.sleep(delay_seconds)
                continue
            response.raise_for_status()
            return response.json()
        except requests.RequestException:
            time.sleep(delay_seconds)
    return {"error": "Timed out waiting for URLScan result"}


def _scan_and_filter(url_to_scan: str) -> dict:
    submitted = _submit_scan(url_to_scan)
    if submitted.get("error"):
        return submitted

    scan_uuid = submitted.get("uuid")
    if not scan_uuid:
        return {"error": submitted.get("message", "Failed to submit scan")}

    scan_result = _poll_scan_result(str(scan_uuid))
    if scan_result.get("error"):
        return scan_result

    filtered = filter(scan_result)
    if not filtered:
        return {"error": "No scan details returned"}

    return filtered


def _build_scan_target(query: str, input_type: str) -> str:
    value = query.strip()
    if input_type == "url":
        return value
    if input_type == "domain":
        return f"https://{value}"
    return value


def urlscan(query: str, input_type: str):
    """
    URLScan search only:
    Returns existing scans for the query. No automatic submission.
    Manual scan submission is handled separately ad-hoc via UI.
    """
    error = check_api_key(API_KEY, "URLScan")
    if error:
        return error

    scan_input_type = _detect_scan_input_type(query, input_type)
    if scan_input_type not in ["domain", "url", "ipv4"]:
        return {"error": f"Unsupported input type: {scan_input_type}"}

    existing_results = search(query, scan_input_type)
    unique_results = _get_unique_results(existing_results, query, scan_input_type)
    if unique_results:
        return {
            "results": unique_results,
            "total_results": len(unique_results),
            "scan_mode": "existing_scan",
        }

    return {"error": "No existing URLScan data found. Manual scan submission available on-demand."}


if __name__ == "__main__":
    import sys

    query = sys.argv[1]
    input_type = sys.argv[2]
    print(urlscan(query, input_type))
