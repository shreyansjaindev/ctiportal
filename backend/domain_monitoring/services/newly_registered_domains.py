from __future__ import annotations

import logging
from datetime import date, datetime

from domain_monitoring.models import NewlyRegisteredDomain
from domain_monitoring.services.nrd_feeds import NRDFeedResult, get_newly_registered_domains_df
from domain_monitoring.services.lookalikes import run_lookalike_scan

logger = logging.getLogger(__name__)


def normalize_source_date(source_date: date | str) -> date:
    if isinstance(source_date, date):
        return source_date
    return datetime.strptime(source_date, "%Y-%m-%d").date()


def _normalize_incoming_values(feed_result: NRDFeedResult) -> set[str]:
    dataframe = feed_result.dataframe
    if dataframe is None or dataframe.empty:
        return set()

    return {
        str(value).strip().lower()
        for value in dataframe["domainName"].dropna().tolist()
        if str(value).strip()
    }


def persist_newly_registered_domains(
    requested_source_date: date | str,
    feed_result: NRDFeedResult,
) -> tuple[int, date | None]:
    normalized_date = normalize_source_date(requested_source_date)
    source_date_str = normalized_date.isoformat()
    source_date_used = feed_result.source_date_used or normalized_date
    provider_used = feed_result.provider_used
    incoming_values = _normalize_incoming_values(feed_result)

    if not incoming_values:
        logger.info("No newly registered domain data available for %s", source_date_str)
        return 0, None if feed_result.dataframe is None or feed_result.dataframe.empty else source_date_used

    existing_values = set(
        NewlyRegisteredDomain.objects.filter(
            source_date=source_date_used,
            source=provider_used,
            value__in=incoming_values,
        ).values_list("value", flat=True)
    )
    missing_values = sorted(incoming_values - existing_values)
    rows = [
        NewlyRegisteredDomain(
            value=value,
            source_date=source_date_used,
            source=provider_used,
        )
        for value in missing_values
    ]
    if rows:
        NewlyRegisteredDomain.objects.bulk_create(rows, batch_size=1000)

    if not rows:
        logger.info(
            "No new newly registered domain rows to ingest for requested date %s using feed date %s",
            source_date_str,
            source_date_used.isoformat(),
        )
        return 0, source_date_used

    logger.info(
        "Ingested %s newly registered domain rows for requested date %s using feed date %s",
        len(rows),
        source_date_str,
        source_date_used.isoformat(),
    )
    return len(rows), source_date_used


def ingest_newly_registered_domains(source_date: date | str) -> tuple[int, date | None]:
    normalized_date = normalize_source_date(source_date)
    source_date_str = normalized_date.isoformat()
    feed_result: NRDFeedResult = get_newly_registered_domains_df(source_date_str)
    return persist_newly_registered_domains(source_date, feed_result)


def ingest_and_scan_newly_registered_domains(source_date: date | str, workers: int = 1) -> tuple[int, int, date | None]:
    created_count, source_date_used = ingest_newly_registered_domains(source_date)
    if source_date_used is None:
        logger.info("Skipping lookalike scan because no NRD feed was available for %s", source_date)
        return created_count, 0, None

    lookalike_count = run_lookalike_scan(source_date_used, workers=workers)
    logger.info(
        "Completed NRD ingest + lookalike scan for requested date %s using feed date %s: %s NRDs, %s lookalikes",
        normalize_source_date(source_date).isoformat(),
        source_date_used.isoformat(),
        created_count,
        lookalike_count,
    )
    return created_count, lookalike_count, source_date_used
