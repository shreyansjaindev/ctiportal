import concurrent.futures
from datetime import datetime, timezone
import hashlib
import json
import logging

from intelligence_harvester.models import Source

from .lookup import lookup
from .ibm import ibm
from .securitytrails import get_whois as whois
from .symantec_sitereview import symantec_sitereview
from .nvd import nvd
from .hybrid_analysis import hybridanalysis
from .screenshotmachine import get_website_screenshot
from .pulse_dive import pulse_dive
from .virustotal import virustotal
from .blacklists import blacklists
from .abuseipdb import abuseipdb
from .emailvalidator import emailvalidator
from .urlscan import urlscan
from .httpstatus import httpstatus
from .hostio import hostio
from .phishtank import phishtank


logging.basicConfig(
    filename="intelligence_harvester.log",
    filemode="a",
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


SOURCE_INFO = {
    "lookup": {
        "title": "Standard Lookup",
        "function": lookup,
        "supported_types": ["domain", "url", "ipv4"],
    },
    "ibm": {
        "title": "IBM X-Force",
        "function": ibm,
        "supported_types": [
            "domain",
            "url",
            "ipv4",
            "md5",
            "sha1",
            "sha256",
            "sha512",
            "cve",
        ],
    },
    "whois": {
        "title": "WHOIS",
        "function": whois,
        "supported_types": ["domain", "url"],
    },
    "symantec": {
        "title": "Symantec Sitereview",
        "function": symantec_sitereview,
        "supported_types": ["domain", "url", "ipv4"],
    },
    "nvd": {"title": "NVD", "function": nvd, "supported_types": ["cve"]},
    "hybridanalysis": {
        "title": "Hybrid Analysis",
        "function": hybridanalysis,
        "supported_types": ["md5", "sha1", "sha256", "sha512"],
    },
    "screenshot": {
        "title": "Screenshot",
        "function": get_website_screenshot,
        "supported_types": ["domain", "url", "ipv4"],
    },
    "pulsedive": {
        "title": "Pulsedive",
        "function": pulse_dive,
        "supported_types": ["domain", "url", "ipv4"],
    },
    "virustotal": {
        "title": "VirusTotal",
        "function": virustotal,
        "supported_types": ["domain", "ipv4", "url", "md5", "sha1", "sha256", "sha512"],
    },
    "abuseipdb": {
        "title": "AbuseIPDB",
        "function": abuseipdb,
        "supported_types": ["ipv4"],
    },
    "emailvalidator": {
        "title": "Email Validator",
        "function": emailvalidator,
        "supported_types": ["email"],
    },
    "urlscan": {
        "title": "urlscan.io",
        "function": urlscan,
        "supported_types": ["domain", "url", "ipv4"],
    },
    "httpstatus": {
        "title": "HTTP Status",
        "function": httpstatus,
        "supported_types": ["domain", "url", "ipv4"],
    },
    "hostio": {
        "title": "host.io",
        "function": hostio,
        "supported_types": ["domain", "url"],
    },
    "phishtank": {
        "title": "PhishTank",
        "function": phishtank,
        "supported_types": ["domain", "url", "ipv4"],
    },
    "blacklists": {
        "title": "Blacklists",
        "function": blacklists,
        "supported_types": ["domain", "ipv4"],
    },
}


def generate_sha256_hash(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def get_cached_data(hashed_value, source):
    cached_data = Source.objects.filter(hashed_value=hashed_value, source=source)

    if cached_data:
        timestamp_created = cached_data[0].created
        timestamp_now = datetime.now(timezone.utc)

        # Time elapsed (in minutes)
        time_elapsed = (
            (timestamp_now - timestamp_created).total_seconds().__floordiv__(60)
        )

        if time_elapsed < 480:
            return cached_data[0].data

        cached_data.delete()

    return None


def generate_excel(wb, data):
    wb.remove(wb.active)  # remove the default sheet created

    for value, indicator_data in data.get("data", {}).items():
        value_type = indicator_data["value_type"]
        for source, source_data in indicator_data["source_data"].items():
            if not source_data["results"]:
                continue

            if source == "screenshot":
                continue

            if source == "hostio":
                source_data["results"] = source_data["results"]["related"]

            sheet_name = f"{source} - {value_type}"
            headers = list(source_data["results"].keys())

            if sheet_name in wb.sheetnames:
                sheet = wb[sheet_name]
            else:
                sheet = wb.create_sheet(sheet_name)
                sheet.append(["value"] + headers)

            row_data = [value]

            for header in headers:
                data_to_append = source_data["results"][header]
                if isinstance(data_to_append, list):
                    try:
                        data_to_append = ", ".join(data_to_append)
                    except:
                        data_to_append = str(data_to_append)
                elif isinstance(data_to_append, dict):
                    data_to_append = json.dumps(data_to_append)
                row_data.append(data_to_append)

            sheet.append(row_data)

    return wb


def thread_creator(executor, value, value_type, sources):
    threads = {
        source: executor.submit(SOURCE_INFO[source]["function"], value, value_type)
        for source in sources
        if value_type in SOURCE_INFO[source]["supported_types"]
    }
    return threads


def update_results_and_database(threads_info, results):
    for thread_info in threads_info:
        for source, future in thread_info["futures"].items():
            value = thread_info["value"]
            value_type = thread_info["value_type"]
            external_link = generate_external_link(source, value, value_type)
            try:
                result = future.result()
                results[value]["source_data"].update(
                    {
                        source: {
                            "results": result,
                            "external_link": external_link,
                        }
                    }
                )

                if source == "screenshot":
                    continue

                if result.get("error"):
                    continue

                Source.objects.update_or_create(
                    value=value,
                    value_type=value_type,
                    hashed_value=generate_sha256_hash(value),
                    source=source,
                    data=json.dumps(result),
                )

            except Exception as e:
                logger.error(f"Error processing {source} for {value}: {e}")
                results[value]["source_data"].update(
                    {source: {"results": {"Error": str(e)}}}
                )
    return results


def generate_external_link(source, value, value_type):
    external_links_patterns = {
        "ibm": {
            "base_url": "https://exchange.xforce.ibmcloud.com",
            "endpoints": {
                "ipv4": "ip",
                "ipv6": "ip",
                "domain": "url",
                "url": "url",
                "md5": "malware",
                "sha1": "malware",
                "sha256": "malware",
                "sha512": "malware",
                "cve": "vulnerabilities",
            },
        },
        "virustotal": {
            "base_url": "https://www.virustotal.com/gui",
            "endpoints": {
                "ipv4": "ip-address",
                "ipv6": "ip-address",
                "domain": "domain",
                "url": "domain",
                "md5": "file",
                "sha1": "file",
                "sha256": "file",
                "sha512": "file",
            },
        },
        "hostio": {
            "base_url": "https://host.io",
            "endpoints": {
                "domain": "",
                "url": "",
            },
        },
    }

    if source in external_links_patterns.keys():
        base_url = external_links_patterns[source]["base_url"]
        endpoint = external_links_patterns[source]["endpoints"][value_type]
        return f"{base_url}/{endpoint}/{value}"


def remove_empty_values(d):
    if not isinstance(d, dict):
        return d
    return {
        k: remove_empty_values(v) for k, v in d.items() if v and remove_empty_values(v)
    }


def collect_data(input_data):
    results = {}

    with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
        threads_info = []

        for data in input_data:
            id = data.get("id")
            value = data.get("value").lower()
            hashed_value = generate_sha256_hash(value)
            value_type = data.get("value_type")
            sources = data.get("sources")
            results[value] = {"id": id, "value_type": value_type, "source_data": {}}

            non_cached_sources = []

            for source in sources:
                if value_type not in SOURCE_INFO[source]["supported_types"]:
                    continue

                external_link = generate_external_link(source, value, value_type)
                cached_data = get_cached_data(hashed_value, source)

                if cached_data:
                    results[value]["source_data"].update(
                        {
                            source: {
                                "results": json.loads(cached_data),
                                "external_link": external_link,
                            }
                        }
                    )
                    continue

                non_cached_sources.append(source)

            if non_cached_sources:
                threads_info.append(
                    {
                        "value": value,
                        "value_type": value_type,
                        "futures": thread_creator(
                            executor, value, value_type, non_cached_sources
                        ),
                    }
                )

        if threads_info:
            results = update_results_and_database(threads_info, results)

        if results:
            return results

    return None
