from __future__ import annotations

import io
import logging
import os
import re
import time
from dataclasses import dataclass
from datetime import date

import pandas as pd
import requests

from scripts.utils.api_helpers import check_api_key


logger = logging.getLogger(__name__)

WHOISXMLAPI_NRD_FEED = os.getenv("WHOISXMLAPI_NRD_FEED")
WHOISXML_DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
WHOISXML_EXTENSION = "csv.gz"
WHOISXML_USER = "user"


@dataclass(frozen=True)
class WhoisXmlFeedResult:
    dataframe: pd.DataFrame | None
    source_date_used: date | None


def _is_valid_date(source_date: str) -> bool:
    return bool(WHOISXML_DATE_PATTERN.fullmatch(source_date))


def _get_filename(source_date: str) -> str:
    return f"nrd.{source_date}.lite.daily.data.{WHOISXML_EXTENSION}"


def _get_source_url(source_date: str) -> str:
    return (
        "https://newly-registered-domains.whoisxmlapi.com/datafeeds/"
        f"Newly_Registered_Domains_2.0/lite/daily/{source_date}/{_get_filename(source_date)}"
    )


def _get_sample_source_url(source_date: str) -> str:
    return f"https://newly-registered-domains.whoisxmlapi.com/sample/nrd.{source_date}.lite.daily.1000.csv"


def _download_file_bytes(source_date: str) -> bytes | None:
    if not _is_valid_date(source_date):
        raise ValueError(f"Invalid source date format: {source_date}")

    error = check_api_key(WHOISXMLAPI_NRD_FEED, "WHOISXMLAPI_NRD_FEED")
    if error:
        return None

    source_url = _get_source_url(source_date)

    max_retries = 50
    retry_delay = 1800

    for attempt in range(max_retries):
        with requests.get(source_url, auth=(WHOISXML_USER, WHOISXMLAPI_NRD_FEED), timeout=60) as response:
            if response.status_code == 200:
                response.raise_for_status()
                logger.info("Downloaded WhoisXMLAPI NRD feed for %s into memory", source_date)
                return response.content

        logger.error("WhoisXMLAPI NRD download failed with status %s", response.status_code)
        if attempt < max_retries - 1:
            logger.info("Retrying WhoisXMLAPI NRD download in %s seconds", retry_delay)
            time.sleep(retry_delay)

    logger.error("WhoisXMLAPI NRD file unavailable after %s retries", max_retries)
    return None


def _download_sample_file_bytes(source_date: str) -> tuple[bytes, date] | None:
    if not _is_valid_date(source_date):
        raise ValueError(f"Invalid source date format: {source_date}")

    requested_date = date.fromisoformat(source_date)
    source_url = _get_sample_source_url(source_date)
    response = requests.get(source_url, timeout=60)
    if response.status_code == 200 and response.content.strip():
        logger.info("Downloaded WhoisXMLAPI sample NRD feed for %s", source_date)
        return response.content, requested_date

    if response.status_code != 404:
        logger.warning(
            "WhoisXMLAPI sample NRD request for %s returned status %s",
            source_date,
            response.status_code,
        )

    logger.info("No WhoisXMLAPI sample NRD feed available for %s", source_date)
    return None


def get_domains_df(source_date: str) -> WhoisXmlFeedResult:
    file_bytes = _download_file_bytes(source_date)
    if not file_bytes:
        return WhoisXmlFeedResult(dataframe=None, source_date_used=None)

    return WhoisXmlFeedResult(
        dataframe=pd.read_csv(io.BytesIO(file_bytes), compression="gzip", usecols=["domainName"]),
        source_date_used=date.fromisoformat(source_date),
    )


def get_sample_domains_df(source_date: str) -> WhoisXmlFeedResult:
    download_result = _download_sample_file_bytes(source_date)
    if not download_result:
        return WhoisXmlFeedResult(dataframe=None, source_date_used=None)

    file_bytes, source_date_used = download_result
    return WhoisXmlFeedResult(
        dataframe=pd.read_csv(io.BytesIO(file_bytes), usecols=["domainName"]),
        source_date_used=source_date_used,
    )
