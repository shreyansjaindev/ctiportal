from django.core.management.base import BaseCommand

from domain_monitoring.services import run_certstream_monitor


class Command(BaseCommand):
    help = "Run the certstream monitor for active monitored domains."

    def add_arguments(self, parser):
        parser.add_argument(
            "--refresh-interval",
            type=int,
            default=60,
            help="Seconds between monitored-domain snapshot refreshes.",
        )
        parser.add_argument(
            "--workers",
            type=int,
            default=100,
            help="Thread pool size for certificate comparisons.",
        )

    def handle(self, *args, **options):
        run_certstream_monitor(
            refresh_interval=options["refresh_interval"],
            max_workers=options["workers"],
        )
