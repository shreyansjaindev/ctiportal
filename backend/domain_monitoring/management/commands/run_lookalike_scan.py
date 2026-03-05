from django.core.management.base import BaseCommand, CommandError

from domain_monitoring.services import run_lookalike_scan_since


class Command(BaseCommand):
    help = "Run lookalike-domain matching against newly registered domains since a given point in time."

    def add_arguments(self, parser):
        parser.add_argument(
            "--since-from",
            default=None,
            help="ISO date or datetime. Defaults to the current time, which means only newly added domains are scanned.",
        )
        parser.add_argument(
            "--workers",
            type=int,
            default=1,
            help="Process worker count. Defaults to 1.",
        )

    def handle(self, *args, **options):
        since_from = options["since_from"]
        workers = options["workers"]

        try:
            created_count = run_lookalike_scan_since(since_from, workers=workers)
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        suffix = f" since {since_from}" if since_from else " for newly added domains"
        self.stdout.write(
            self.style.SUCCESS(
                f"Created or updated {created_count} lookalike domains{suffix}."
            )
        )
