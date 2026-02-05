import logging
import time
from concurrent.futures import ThreadPoolExecutor

from ipwhois import IPWhois
import tldextract

from api_calls import (
    get_monitored_domains_with_past_check_date,
    update_monitored_domain,
    get_ssl_certificates_for_domain_and_company,
    post_monitored_domain_alert,
)
from image_utils import is_screenshots_similar

# from securitytrails import get_dns_records
# from screenshotmachine import get_website_screenshot
# from website_status import get_website_status
from siterelic import get_dns_records, get_website_status, get_website_screenshot
from virustotal import get_subdomains

logging.basicConfig(
    filename="domain_monitoring.log",
    filemode="a",
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


def extract_and_filter(raw_list, transformation=None):
    filtered_list = [value.strip() for value in raw_list if value.strip()]
    return transformation(filtered_list) if transformation else filtered_list


def compare_fields(old_data, new_data, fields, transformations={}):
    results = {}

    for field_name in fields:
        old_list = extract_and_filter(old_data.get(field_name, []), transformations.get(field_name))
        new_list = extract_and_filter(new_data.get(field_name, []), transformations.get(field_name))

        if set(old_list) != set(new_list):
            diff_set = set(old_data.get(field_name, [])) - set(new_data.get(field_name, []))
            results[field_name] = list(diff_set)

    return results


def get_asns_from_ip_list(ip_list):
    asn_list = []
    results = {}
    for ip in ip_list:
        try:
            obj = IPWhois(ip)
            results = obj.lookup_rdap()
        except Exception as e:
            logger.error(f"Error looking up ASN for IP {ip}: {str(e)}")
            results["asn"] = ""
        asn = results.get("asn", "")
        if asn:
            asn_list.append(f"AS{asn}")
    return asn_list


def get_domains_from_fqdn_list(fqdn_list):
    domain_list = []
    for fqdn in fqdn_list:
        extracted_domain = tldextract.extract(fqdn.strip()).registered_domain
        if extracted_domain:
            domain_list.append(extracted_domain)
    return domain_list


def change_validator(existing_data, new_data):
    fields = ["a_record", "mx_record", "subdomains"]
    transformations = {"a_record": get_asns_from_ip_list, "mx_record": get_domains_from_fqdn_list}
    results = compare_fields(existing_data, new_data, fields, transformations)

    new_spf_record = new_data.get("spf_record", "")
    if new_spf_record:
        if existing_data.get("spf_record", "") != new_spf_record:
            results["spf_record"] = new_spf_record

    if new_data.get("website_certificate"):
        results["website_certificate"] = new_data["website_certificate"]

    if new_data.get("website_status_code") == "200" or new_data.get("website_status_code") == 200:
        old_website_screenshot = existing_data.get("website_screenshot")
        new_website_screenshot = new_data.get("website_screenshot")

        if new_website_screenshot:
            if old_website_screenshot:
                if is_screenshots_similar(old_website_screenshot, new_website_screenshot):
                    for field in [
                        "a_record",
                        "website_screenshot",
                        "website_url",
                        "website_status_code",
                    ]:
                        results.pop(field, None)
            else:
                results["website_screenshot"] = new_website_screenshot

                if new_data.get("website_url"):
                    results["website_url"] = new_data["website_url"]

                if new_data.get("website_status_code"):
                    results["website_status_code"] = new_data["website_status_code"]
        else:
            results.pop("a_record", None)

    else:
        results.pop("a_record", None)

    return results


def create_alert(domain_name, company, data, changes):
    if changes:
        changes["domain_name"] = domain_name
        changes["company"] = company
        try:
            response = post_monitored_domain_alert(changes)
            if response.status_code == 201:
                return True
        except Exception as e:
            logger.error(f"Error creating alert for domain {domain_name}: {str(e)}")
    return False


def get_domain_data(domain, company):
    logger.info(f"Fetching DNS records for domain: {domain}")
    dns_records = get_dns_records(domain)
    logger.info(f"Fetching SSL certificates for domain: {domain}")
    website_certificate = get_ssl_certificates_for_domain_and_company(domain, company)
    logger.info(f"Fetching subdomains for domain: {domain}")
    subdomains = get_subdomains(domain)

    website_status = {"url": "", "code": ""}
    website_screenshot = ""

    if dns_records.get("a"):
        logger.info(f"Fetching website status for domain: {domain}")
        website_status = get_website_status(domain)
        if website_status.get("code") == "200" or website_status.get("code") == 200:
            logger.info(f"Fetching website screenshot for domain: {domain}")
            website_screenshot = get_website_screenshot(domain)

    return {
        "a_record": dns_records.get("a", []),
        "mx_record": dns_records.get("mx", []),
        "spf_record": dns_records.get("spf", ""),
        "website_url": website_status.get("url", ""),
        "website_status_code": website_status.get("code", ""),
        "website_screenshot": website_screenshot,
        "subdomains": subdomains,
        "website_certificate": website_certificate,
    }


def detect_domain_changes(monitored_domain_data):
    domain = monitored_domain_data.get("value")
    company = monitored_domain_data.get("company")
    last_checked = monitored_domain_data.get("last_checked")

    data = get_domain_data(domain, company)
    changes = change_validator(monitored_domain_data, data)
    old_screenshot = monitored_domain_data.get("website_screenshot", "")
    new_screenshot = changes.get("website_screenshot", "")
    if old_screenshot and not new_screenshot:
        data["website_screenshot"] = old_screenshot

    if last_checked != "1900-01-01" and changes:
        create_alert(domain, company, monitored_domain_data, changes)
    update_monitored_domain(monitored_domain_data["id"], data)
    logger.info(f"Domain {domain} updated")


def monitor_domains():
    while True:
        try:
            monitored_domains = get_monitored_domains_with_past_check_date()

            with ThreadPoolExecutor(max_workers=1) as executor:
                futures = [
                    executor.submit(detect_domain_changes, domain) for domain in monitored_domains
                ]
                for future in futures:
                    if future.result():
                        break
            time.sleep(10)
        except Exception as e:
            logger.error(f"Error in monitoring loop: {str(e)}")


if __name__ == "__main__":
    monitor_domains()
