from django.apps import AppConfig


class DomainMonitoringConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "domain_monitoring"

    def ready(self):
        import domain_monitoring.signals  # noqa: F401
