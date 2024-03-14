import re
import requests
import pandas as pd
import os
import logging
from config import BASE_DIR
import time
from dotenv import load_dotenv

load_dotenv()


# Configure logging
logging.basicConfig(
    filename="app.log",
    filemode="w",
    format="%(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)

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
    filepath = os.path.join(BASE_DIR, "additional_scripts", "nrd_data", filename)
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

    if not API_KEY:
        logging.error("API key not found.")
        return

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
                    logging.info(f"File downloaded to {filepath}.")
                    return
                else:
                    logging.error(f"Error downloading file: {r.status_code}")
                    if i < max_retries - 1:
                        logging.info(f"Retrying in {retry_delay} seconds...")
                        time.sleep(retry_delay)

        logging.error(f"File not available after {max_retries} retries, exiting...")
    else:
        logging.error("Invalid date format.")


def get_newly_registered_domains_df(date):
    logging.info("Downloading file...")
    download_file(date)
    logging.info("File downloaded.")

    filepath = generate_file_path(date)

    logging.info("Reading file...")
    df = pd.read_csv(filepath, compression="gzip", usecols=["domainName"])
    logging.info("File read.")
    return df


if __name__ == "__main__":
    print(get_newly_registered_domains_df("2023-11-11"))
