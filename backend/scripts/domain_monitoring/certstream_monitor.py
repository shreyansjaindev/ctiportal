import certstream
import time
import concurrent.futures
import re
from api_calls import (
    get_monitored_domains,
    add_ssl_certificate,
)

monitored_domains = []


def compare(message):
    global monitored_domains

    cert_domains = message["data"]["leaf_cert"]["all_domains"]
    cert_index = message["data"]["cert_index"]

    for cert_domain in cert_domains:
        if cert_domain.startswith("www."):
            continue

        for monitored_domain in monitored_domains:
            watched_domain = monitored_domain["value"]

            pattern = r"(.*\.)?" + re.escape(watched_domain) + "$"

            if re.match(pattern, cert_domain):
                print(
                    f"cert_index:{cert_index}; cert_domain:{cert_domain}; watched_domain:{watched_domain}"
                )
                add_ssl_certificate(
                    cert_index=cert_index,
                    cert_domain=cert_domain,
                    watched_domain=watched_domain,
                    company=monitored_domain["company"],
                )


def update_monitored_domains():
    global monitored_domains
    while True:
        # Fetch the updated list of monitored domains
        updated_domains = get_monitored_domains()

        # Update the monitored_domains list
        monitored_domains = updated_domains

        # Wait for a while before fetching the updated list again
        time.sleep(10)


def certstream_monitor():
    max_threads = 100

    with concurrent.futures.ThreadPoolExecutor(max_workers=max_threads) as executor:

        def certstream_callback(message, context):
            if message["message_type"] == "heartbeat":
                return
            if message["message_type"] == "certificate_update":
                executor.submit(compare, message)

        certstream.listen_for_events(certstream_callback, url="wss://certstream.calidog.io/")


if __name__ == "__main__":
    monitored_domains = get_monitored_domains()

    # Start the ThreadPoolExecutor for updating monitored domains
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as main_executor:
        update_thread = main_executor.submit(update_monitored_domains)

        # Start SSL certificate monitoring
        certstream_monitor()
