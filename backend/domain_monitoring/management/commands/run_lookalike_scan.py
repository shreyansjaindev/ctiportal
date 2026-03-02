from django.core.management.base import BaseCommand, CommandError

from domain_monitoring.services import run_lookalike_scan


class Command(BaseCommand):
    help = "Run lookalike-domain matching against newly registered domains."

    def add_arguments(self, parser):
        parser.add_argument(
            "--date",
            required=True,
            help="Source date in YYYY-MM-DD format.",
        )
        parser.add_argument(
            "--workers",
            type=int,
            default=1,
            help="Process worker count. Defaults to 1.",
        )

    def handle(self, *args, **options):
        source_date = options["date"]
        workers = options["workers"]

        try:
            created_count = run_lookalike_scan(source_date, workers=workers)
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(
            self.style.SUCCESS(
                f"Created or updated {created_count} lookalike domains for {source_date}."
            )
        )
