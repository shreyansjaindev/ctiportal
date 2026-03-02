import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Callable, Iterable

from django.db import transaction
from django.utils import timezone
from ipwhois import IPWhois
import tldextract

from domain_monitoring.models import (
    MonitoredDomain,
    MonitoredDomainAlert,
    MonitoredDomainScreenshotPattern,
    SSLCertificate,
)
from domain_monitoring.services.provider_adapters import (
    fetch_dns_records,
    fetch_subdomains,
    fetch_website_screenshot,
    fetch_website_status,
)
from domain_monitoring.services.screenshot_compare import (
    are_screenshots_similar,
    compute_screenshot_phash,
    matches_screenshot_image,
    matches_screenshot_phash,
)
from domain_monitoring.services.screenshot_storage import delete_screenshot_file


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class DomainMonitoringData:
    a_record: list[str]
    mx_record: list[str]
    spf_record: str
    website_url: str
    website_status_code: str
    website_screenshot: str
    website_screenshot_hash: str
    subdomains: list[str]
    website_certificate: list[str]

    def as_dict(self) -> dict[str, Any]:
        return {
            "a_record": self.a_record,
            "mx_record": self.mx_record,
            "spf_record": self.spf_record,
            "website_url": self.website_url,
            "website_status_code": self.website_status_code,
            "website_screenshot": self.website_screenshot,
            "website_screenshot_hash": self.website_screenshot_hash,
            "subdomains": self.subdomains,
            "website_certificate": self.website_certificate,
        }


MONITORED_DOMAIN_UPDATE_FIELDS = [
    "a_record",
    "mx_record",
    "spf_record",
    "website_url",
    "website_status_code",
    "website_screenshot",
    "website_screenshot_hash",
    "subdomains",
    "website_certificate",
    "last_checked",
    "last_modified",
]

def normalize_list(
    values: Iterable[str],
    transformation: Callable[[list[str]], list[str]] | None = None,
) -> list[str]:
    normalized_values = [value.strip() for value in values if value and value.strip()]
    return transformation(normalized_values) if transformation else normalized_values


def get_changed_list_fields(
    existing_data: dict[str, Any],
    new_data: dict[str, Any],
    fields: Iterable[str],
    transformations: dict[str, Callable[[list[str]], list[str]]] | None = None,
) -> dict[str, list[str]]:
    transformations = transformations or {}
    changes: dict[str, list[str]] = {}

    for field_name in fields:
        existing_list = normalize_list(existing_data.get(field_name, []), transformations.get(field_name))
        new_list = normalize_list(new_data.get(field_name, []), transformations.get(field_name))

        if set(existing_list) != set(new_list):
            changes[field_name] = new_data.get(field_name, [])

    return changes


def get_asns_from_ip_list(ip_list: Iterable[str]) -> list[str]:
    asn_list: list[str] = []
    for ip in ip_list:
        try:
            results = IPWhois(ip).lookup_rdap()
        except Exception as exc:
            logger.warning("Error looking up ASN for IP %s: %s", ip, exc)
            results = {"asn": ""}

        asn = results.get("asn", "")
        if asn:
            asn_list.append(f"AS{asn}")
    return asn_list


def get_domains_from_fqdn_list(fqdn_list: Iterable[str]) -> list[str]:
    domain_list: list[str] = []
    for fqdn in fqdn_list:
        extracted_domain = tldextract.extract(fqdn.strip()).registered_domain
        if extracted_domain:
            domain_list.append(extracted_domain)
    return domain_list


def build_domain_changes(existing_data: dict[str, Any], new_data: dict[str, Any]) -> dict[str, Any]:
    fields = ["a_record", "mx_record", "subdomains"]
    transformations = {"a_record": get_asns_from_ip_list, "mx_record": get_domains_from_fqdn_list}
    changes = get_changed_list_fields(existing_data, new_data, fields, transformations)

    new_spf_record = new_data.get("spf_record", "")
    if new_spf_record and existing_data.get("spf_record", "") != new_spf_record:
        changes["spf_record"] = new_spf_record

    if new_data.get("website_certificate"):
        changes["website_certificate"] = new_data["website_certificate"]

    if new_data.get("website_status_code") in {"200", 200}:
        old_website_screenshot = existing_data.get("website_screenshot")
        old_website_screenshot_hash = existing_data.get("website_screenshot_hash", "")
        new_website_screenshot = new_data.get("website_screenshot")
        new_website_screenshot_hash = new_data.get("website_screenshot_hash", "")

        if new_website_screenshot:
            if old_website_screenshot:
                if old_website_screenshot_hash and new_website_screenshot_hash:
                    if old_website_screenshot_hash == new_website_screenshot_hash:
                        for field in [
                            "a_record",
                            "website_screenshot",
                            "website_screenshot_hash",
                            "website_url",
                            "website_status_code",
                        ]:
                            changes.pop(field, None)
                    else:
                        changes["website_screenshot"] = new_website_screenshot
                        changes["website_screenshot_hash"] = new_website_screenshot_hash
                        if new_data.get("website_url"):
                            changes["website_url"] = new_data["website_url"]
                        if new_data.get("website_status_code"):
                            changes["website_status_code"] = new_data["website_status_code"]
                elif are_screenshots_similar(old_website_screenshot, new_website_screenshot):
                    for field in [
                        "a_record",
                        "website_screenshot",
                        "website_screenshot_hash",
                        "website_url",
                        "website_status_code",
                    ]:
                        changes.pop(field, None)
                else:
                    changes["website_screenshot"] = new_website_screenshot
                    changes["website_screenshot_hash"] = new_website_screenshot_hash
                    if new_data.get("website_url"):
                        changes["website_url"] = new_data["website_url"]
                    if new_data.get("website_status_code"):
                        changes["website_status_code"] = new_data["website_status_code"]
            else:
                changes["website_screenshot"] = new_website_screenshot
                changes["website_screenshot_hash"] = new_website_screenshot_hash

                if new_data.get("website_url"):
                    changes["website_url"] = new_data["website_url"]

                if new_data.get("website_status_code"):
                    changes["website_status_code"] = new_data["website_status_code"]
        else:
            changes.pop("a_record", None)
    else:
        changes.pop("a_record", None)

    return changes


def matches_sponsored_listing_pattern(
    monitored_domain: MonitoredDomain,
    screenshot_filename: str,
    screenshot_hash: str,
) -> bool:
    patterns = MonitoredDomainScreenshotPattern.objects.filter(
        monitored_domain=monitored_domain,
        active=True,
    ).only("screenshot_hash", "screenshot_phash")

    if screenshot_hash and patterns.filter(screenshot_hash=screenshot_hash).exists():
        return True

    for pattern in patterns:
        if pattern.screenshot_phash and matches_screenshot_phash(
            screenshot_filename, pattern.screenshot_phash
        ):
            return True
        if pattern.screenshot and matches_screenshot_image(screenshot_filename, pattern.screenshot):
            return True

    return False


def get_ssl_certificates_for_domain_and_company(domain, company):
    yesterday = timezone.now().date() - timedelta(days=1)
    certificates = SSLCertificate.objects.filter(
        created=yesterday,
        watched_domain=domain,
        company=company,
    ).values_list("cert_domain", flat=True)
    return list(certificates)


def fetch_domain_monitoring_data(domain: str, company) -> DomainMonitoringData:
    logger.info("Fetching DNS records for domain: %s", domain)
    dns_records = fetch_dns_records(domain)
    logger.info("Fetching SSL certificates for domain: %s", domain)
    website_certificate = get_ssl_certificates_for_domain_and_company(domain, company)
    logger.info("Fetching subdomains for domain: %s", domain)
    subdomains = fetch_subdomains(domain)

    website_status = {"url": "", "code": ""}
    website_screenshot = ""
    website_screenshot_hash = ""

    if dns_records.get("a"):
        logger.info("Fetching website status for domain: %s", domain)
        website_status = fetch_website_status(domain)
        if website_status.get("code") in {"200", 200}:
            logger.info("Fetching website screenshot for domain: %s", domain)
            screenshot_result = fetch_website_screenshot(domain)
            website_screenshot = screenshot_result.get("filename", "")
            website_screenshot_hash = screenshot_result.get("hash", "")

    return DomainMonitoringData(
        a_record=dns_records.get("a", []),
        mx_record=dns_records.get("mx", []),
        spf_record=dns_records.get("spf", ""),
        website_url=website_status.get("url", ""),
        website_status_code=str(website_status.get("code", "") or ""),
        website_screenshot=website_screenshot,
        website_screenshot_hash=website_screenshot_hash,
        subdomains=subdomains,
        website_certificate=website_certificate,
    )


def build_existing_domain_data(monitored_domain: MonitoredDomain) -> dict[str, Any]:
    return {
        "a_record": monitored_domain.a_record,
        "mx_record": monitored_domain.mx_record,
        "spf_record": monitored_domain.spf_record,
        "website_url": monitored_domain.website_url,
        "website_status_code": monitored_domain.website_status_code,
        "website_screenshot": monitored_domain.website_screenshot,
        "website_screenshot_hash": monitored_domain.website_screenshot_hash,
        "subdomains": monitored_domain.subdomains,
        "website_certificate": monitored_domain.website_certificate,
    }


def suppress_screenshot_related_changes(changes: dict[str, Any]) -> None:
    for field in [
        "a_record",
        "website_screenshot",
        "website_screenshot_hash",
        "website_url",
        "website_status_code",
    ]:
        changes.pop(field, None)


def update_or_create_alert(monitored_domain, changes):
    if not changes:
        return

    payload = {**changes, "domain_name": monitored_domain.value, "company": monitored_domain.company}
    MonitoredDomainAlert.objects.update_or_create(
        domain_name=monitored_domain.value,
        company=monitored_domain.company,
        defaults=payload,
    )


def persist_monitored_domain_update(
    monitored_domain: MonitoredDomain,
    data: DomainMonitoringData,
    changes: dict[str, Any],
) -> None:
    old_screenshot = monitored_domain.website_screenshot
    old_screenshot_hash = monitored_domain.website_screenshot_hash
    new_screenshot = changes.get("website_screenshot", "")
    data_dict = data.as_dict()

    if old_screenshot and not new_screenshot:
        data_dict["website_screenshot"] = old_screenshot
        data_dict["website_screenshot_hash"] = old_screenshot_hash

    if monitored_domain.last_checked and changes:
        update_or_create_alert(monitored_domain, changes)

    for field, value in data_dict.items():
        setattr(monitored_domain, field, value)
    monitored_domain.last_checked = timezone.now().date()
    monitored_domain.save(update_fields=MONITORED_DOMAIN_UPDATE_FIELDS)
    logger.info("Domain %s updated", monitored_domain.value)


def monitor_monitored_domain(monitored_domain):
    if monitored_domain.status != "active":
        return

    fresh_data = fetch_domain_monitoring_data(monitored_domain.value, monitored_domain.company)
    with transaction.atomic():
        locked_domain = MonitoredDomain.objects.select_for_update().select_related("company").get(
            pk=monitored_domain.pk
        )
        if locked_domain.status != "active":
            return

        existing = build_existing_domain_data(locked_domain)
        changes = build_domain_changes(existing, fresh_data.as_dict())

        if fresh_data.website_screenshot and fresh_data.website_screenshot_hash:
            if matches_sponsored_listing_pattern(
                locked_domain,
                fresh_data.website_screenshot,
                fresh_data.website_screenshot_hash,
            ):
                suppress_screenshot_related_changes(changes)
                delete_screenshot_file(fresh_data.website_screenshot)
                fresh_data = DomainMonitoringData(
                    **{
                        **fresh_data.as_dict(),
                        "website_screenshot": locked_domain.website_screenshot,
                        "website_screenshot_hash": locked_domain.website_screenshot_hash,
                    }
                )

        persist_monitored_domain_update(locked_domain, fresh_data, changes)


def monitor_monitored_domain_by_id(monitored_domain_id):
    monitored_domain = MonitoredDomain.objects.select_related("company").get(pk=monitored_domain_id)
    monitor_monitored_domain(monitored_domain)


def monitor_monitored_domain_safely(monitored_domain_id: int) -> bool:
    try:
        monitor_monitored_domain_by_id(monitored_domain_id)
        return True
    except Exception:
        logger.exception("Error monitoring domain id %s", monitored_domain_id)
        return False


def get_due_monitored_domain_ids() -> list[int]:
    today = timezone.now().date()
    return list(
        MonitoredDomain.objects.filter(status="active").exclude(last_checked=today).values_list("id", flat=True)
    )


def normalize_monitored_domain_ids(monitored_domains: Iterable[MonitoredDomain] | Iterable[int]) -> list[int]:
    monitored_domain_ids: list[int] = []
    for monitored_domain in monitored_domains:
        if isinstance(monitored_domain, MonitoredDomain):
            monitored_domain_ids.append(monitored_domain.pk)
        else:
            monitored_domain_ids.append(int(monitored_domain))
    return monitored_domain_ids


def run_domain_monitor(monitored_domains=None, max_workers=4):
    monitored_domain_ids = (
        normalize_monitored_domain_ids(monitored_domains)
        if monitored_domains is not None
        else get_due_monitored_domain_ids()
    )
    if not monitored_domain_ids:
        return 0

    worker_count = max(1, min(max_workers, len(monitored_domain_ids)))
    with ThreadPoolExecutor(max_workers=worker_count) as executor:
        futures = {executor.submit(monitor_monitored_domain_safely, domain_id): domain_id for domain_id in monitored_domain_ids}
        for future in as_completed(futures):
            future.result()

    return len(monitored_domain_ids)
