from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from domain_monitoring.services import ingest_and_scan_newly_registered_domains


class Command(BaseCommand):
    help = "Ingest newly registered domains and then run the lookalike scan for the effective feed date."

    def add_arguments(self, parser):
        parser.add_argument(
            "--date",
            default=None,
            help="Requested source date in YYYY-MM-DD format. Defaults to today.",
        )
        parser.add_argument(
            "--workers",
            type=int,
            default=1,
            help="Process worker count for the lookalike scan. Defaults to 1.",
        )

    def handle(self, *args, **options):
        source_date = options["date"] or timezone.localdate().isoformat()
        workers = options["workers"]

        try:
            ingested_count, lookalike_count, source_date_used = ingest_and_scan_newly_registered_domains(
                source_date,
                workers=workers,
            )
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        used_suffix = ""
        if source_date_used and source_date_used.isoformat() != source_date:
            used_suffix = f" using feed date {source_date_used.isoformat()}"

        self.stdout.write(
            self.style.SUCCESS(
                "Completed NRD pipeline for "
                f"{source_date}{used_suffix}: ingested {ingested_count} domains, "
                f"created/updated {lookalike_count} lookalike matches."
            )
        )
