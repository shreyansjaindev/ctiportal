from django.core.management.base import BaseCommand, CommandError

from domain_monitoring.models import MonitoredDomain
from domain_monitoring.services.monitoring import run_domain_monitor


class Command(BaseCommand):
    help = "Run domain monitoring for all due domains or a specific monitored domain."

    def add_arguments(self, parser):
        parser.add_argument("--domain", dest="domain", help="Monitor a specific domain value")
        parser.add_argument(
            "--company",
            dest="company",
            help="Optional company name when --domain is provided",
        )
        parser.add_argument(
            "--workers",
            dest="workers",
            type=int,
            default=4,
            help="Number of worker threads to use for scheduled runs",
        )

    def handle(self, *args, **options):
        domain = options["domain"]
        company = options.get("company")
        workers = options["workers"]

        monitored_domains = None
        if domain:
            monitored_domains = MonitoredDomain.objects.select_related("company").filter(
                value=domain,
                status="active",
            )
            if company:
                monitored_domains = monitored_domains.filter(company__name=company)
            monitored_domains = list(monitored_domains)
            if not monitored_domains:
                if company:
                    raise CommandError(f"No active monitored domain found for {domain} ({company})")
                raise CommandError(f"No active monitored domain found for {domain}")

        processed = run_domain_monitor(monitored_domains=monitored_domains, max_workers=workers)
        self.stdout.write(self.style.SUCCESS(f"Processed {processed} monitored domain(s)."))
