from django.core.management.base import BaseCommand, CommandError

from domain_monitoring.services import ingest_newly_registered_domains


class Command(BaseCommand):
    help = "Ingest newly registered domains for a source date."

    def add_arguments(self, parser):
        parser.add_argument(
            "--date",
            required=True,
            help="Source date in YYYY-MM-DD format.",
        )

    def handle(self, *args, **options):
        source_date = options["date"]
        try:
            created_count, source_date_used = ingest_newly_registered_domains(source_date)
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        used_suffix = ""
        if source_date_used and source_date_used.isoformat() != source_date:
            used_suffix = f" using feed date {source_date_used.isoformat()}"

        self.stdout.write(
            self.style.SUCCESS(
                f"Ingested {created_count} newly registered domains for {source_date}{used_suffix}."
            )
        )
