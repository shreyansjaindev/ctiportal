import re
import requests
import pandas as pd
import os
import logging
from config import BASE_DIR
import time
from dotenv import load_dotenv
from ...utils.api_helpers import check_api_key

load_dotenv()

logging.basicConfig(
    filename="domain_monitoring.log",
    filemode="a",
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

API_KEY = os.getenv("WHOISXMLAPI_NRD_FEED")
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}")
EXTENSION = "csv.gz"
USER = "user"


def is_date_in_correct_format(date):
    return bool(DATE_PATTERN.fullmatch(date))


def generate_filename(date):
    filename = f"nrd.{date}.lite.daily.data.{EXTENSION}"
    return filename


def generate_file_path(date):
    filename = generate_filename(date)
    filepath = os.path.join(BASE_DIR, "scripts", "domain_monitoring", "nrd_data", filename)
    return filepath


def generate_source_url(date):
    host = "https://newly-registered-domains.whoisxmlapi.com/datafeeds"
    filename = generate_filename(date)
    source_url = f"{host}/Newly_Registered_Domains_2.0/lite/daily/{date}/{filename}"
    return source_url


def download_file(date):
    """
    Downloads a file from a URL.
    Retries up to max_retries times if the download fails, with a delay of retry_delay seconds between each attempt.
    Logs an error message and returns None if the file cannot be downloaded after max_retries attempts.
    """
    max_retries = 50
    retry_delay = 1800  # seconds

    error = check_api_key(API_KEY, "WhoisXML")
    if error:
        return None

    if is_date_in_correct_format(date):
        filepath = generate_file_path(date)
        source_url = generate_source_url(date)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)

        for i in range(max_retries):
            with requests.get(source_url, auth=(USER, API_KEY)) as r:
                if r.status_code == 200:
                    r.raise_for_status()
                    with open(filepath, "wb") as f:
                        f.write(r.content)
                    logger.info(f"File downloaded to {filepath}")
                    return filepath
                else:
                    logger.error(f"Error downloading file: {r.status_code}")
                    if i < max_retries - 1:
                        logger.info(f"Retrying in {retry_delay} seconds...")
                        time.sleep(retry_delay)

        logger.error(f"File not available after {max_retries} retries, exiting...")
    else:
        logger.error("Invalid date format")


def get_newly_registered_domains_df(date):
    logger.info("Downloading file...")
    filepath = download_file(date)
    if filepath:
        logger.info("Reading file...")
        df = pd.read_csv(filepath, compression="gzip", usecols=["domainName"])
        return df
    return None


if __name__ == "__main__":
    print(get_newly_registered_domains_df("2024-04-24"))
