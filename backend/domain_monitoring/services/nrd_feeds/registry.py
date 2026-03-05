from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import date

import pandas as pd

from domain_monitoring.services.settings import get_domain_monitoring_settings

from .whoisxmlapi import (
    get_domains_df as get_whoisxmlapi_domains_df,
    get_sample_domains_df as get_whoisxmlapi_sample_domains_df,
)


@dataclass(frozen=True)
class NRDFeedResult:
    dataframe: pd.DataFrame | None
    source_date_used: date | None
    provider_used: str


NRD_ADAPTERS: dict[str, Callable[[str], NRDFeedResult]] = {
    "whoisxmlapi": get_whoisxmlapi_domains_df,
    "whoisxmlapi_sample": get_whoisxmlapi_sample_domains_df,
}


def get_newly_registered_domains_df(source_date: str) -> NRDFeedResult:
    selected_provider = get_domain_monitoring_settings().nrd_provider.strip().lower()
    adapter = NRD_ADAPTERS.get(selected_provider)
    if adapter is None:
        raise ValueError(f"Unsupported newly registered domains provider: {selected_provider}")
    result = adapter(source_date)
    return NRDFeedResult(
        dataframe=result.dataframe,
        source_date_used=result.source_date_used,
        provider_used=selected_provider,
    )
