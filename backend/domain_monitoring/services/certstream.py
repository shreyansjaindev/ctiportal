from __future__ import annotations

import concurrent.futures
import logging
import re
import threading
import time

import certstream

from domain_monitoring.models import MonitoredDomain, SSLCertificate

logger = logging.getLogger(__name__)


def get_active_monitored_domains_snapshot() -> list[dict]:
    monitored_domains = (
        MonitoredDomain.objects.select_related("company")
        .filter(status="active", company__status="active")
        .values("value", "company_id", "company__name")
    )
    return [
        {
            "value": item["value"],
            "company_id": item["company_id"],
            "company_name": item["company__name"],
        }
        for item in monitored_domains
    ]


def save_ssl_certificate(cert_index: int, cert_domain: str, watched_domain: str, company_id: int) -> None:
    SSLCertificate.objects.get_or_create(
        cert_index=cert_index,
        cert_domain=cert_domain,
        watched_domain=watched_domain,
        company_id=company_id,
    )


def process_certificate_update(message: dict, monitored_domains: list[dict]) -> None:
    cert_domains = message["data"]["leaf_cert"]["all_domains"]
    cert_index = message["data"]["cert_index"]

    for cert_domain in cert_domains:
        if cert_domain.startswith("www."):
            continue

        for monitored_domain in monitored_domains:
            watched_domain = monitored_domain["value"]
            pattern = r"(.*\.)?" + re.escape(watched_domain) + "$"
            if re.match(pattern, cert_domain):
                logger.info(
                    "Matched certstream domain %s against watched domain %s",
                    cert_domain,
                    watched_domain,
                )
                save_ssl_certificate(
                    cert_index=cert_index,
                    cert_domain=cert_domain,
                    watched_domain=watched_domain,
                    company_id=monitored_domain["company_id"],
                )


def run_certstream_monitor(refresh_interval: int = 60, max_workers: int = 100) -> None:
    monitored_domains = get_active_monitored_domains_snapshot()
    monitored_domains_lock = threading.Lock()

    def refresh_monitored_domains_snapshot() -> None:
        nonlocal monitored_domains
        while True:
            updated_domains = get_active_monitored_domains_snapshot()
            with monitored_domains_lock:
                monitored_domains = updated_domains
            time.sleep(refresh_interval)

    refresh_thread = threading.Thread(target=refresh_monitored_domains_snapshot, daemon=True)
    refresh_thread.start()

    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:

        def certstream_callback(message, _context):
            if message["message_type"] != "certificate_update":
                return
            with monitored_domains_lock:
                snapshot = list(monitored_domains)
            executor.submit(process_certificate_update, message, snapshot)

        certstream.listen_for_events(certstream_callback, url="wss://certstream.calidog.io/")
