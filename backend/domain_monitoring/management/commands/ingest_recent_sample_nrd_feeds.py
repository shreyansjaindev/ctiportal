from __future__ import annotations

from datetime import date, timedelta

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from domain_monitoring.services.newly_registered_domains import persist_newly_registered_domains
from domain_monitoring.services.nrd_feeds import NRDFeedResult
from domain_monitoring.services.nrd_feeds.whoisxmlapi import get_sample_domains_df


SAMPLE_DELAY_DAYS = 1
SAMPLE_WINDOW_DAYS = 5


class Command(BaseCommand):
    help = "Ingest the currently available 5-day WhoisXMLAPI sample NRD window."

    def add_arguments(self, parser):
        parser.add_argument(
            "--as-of-date",
            default=None,
            help="UTC calendar date in YYYY-MM-DD to base the 5-day sample window on. Defaults to the current UTC date.",
        )

    def handle(self, *args, **options):
        as_of_date = options["as_of_date"]
        if as_of_date:
            try:
                today = date.fromisoformat(as_of_date)
            except ValueError as exc:
                raise CommandError("--as-of-date must be in YYYY-MM-DD format.") from exc
        else:
            today = timezone.now().date()
        latest_available_date = today - timedelta(days=SAMPLE_DELAY_DAYS)
        total_created = 0

        for offset in range(SAMPLE_WINDOW_DAYS):
            candidate_date = latest_available_date - timedelta(days=offset)
            feed_result = get_sample_domains_df(candidate_date.isoformat())
            dataframe = feed_result.dataframe
            source_date_used = feed_result.source_date_used

            if dataframe is None or dataframe.empty or source_date_used is None:
                self.stdout.write(f"Skipped {candidate_date.isoformat()}: no sample feed available")
                continue

            created_count, actual_source_date = persist_newly_registered_domains(
                candidate_date,
                NRDFeedResult(
                    dataframe=dataframe,
                    source_date_used=source_date_used,
                    provider_used="whoisxmlapi_sample",
                ),
            )
            if not actual_source_date:
                self.stdout.write(f"Skipped {candidate_date.isoformat()}: sample feed had no domains")
                continue
            if created_count == 0:
                self.stdout.write(f"Skipped {source_date_used.isoformat()}: all domains already ingested")
                continue

            total_created += created_count
            self.stdout.write(
                self.style.SUCCESS(
                    f"Ingested {created_count} sample domains for feed date {actual_source_date.isoformat()}"
                )
            )

        if total_created == 0:
            self.stdout.write("No new sample NRD rows were ingested from the current 5-day sample window.")
            return

        self.stdout.write(self.style.SUCCESS(f"Completed sample NRD ingest. Total rows created: {total_created}"))
