import logging
import threading

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from domain_monitoring.models import MonitoredDomain
from domain_monitoring.services.monitoring import monitor_monitored_domain_by_id


logger = logging.getLogger(__name__)


def _trigger_monitoring_in_background(monitored_domain_id):
    try:
        monitor_monitored_domain_by_id(monitored_domain_id)
    except Exception:
        logger.exception("Immediate monitoring failed for monitored domain %s", monitored_domain_id)


@receiver(post_save, sender=MonitoredDomain)
def trigger_monitoring_for_new_domain(sender, instance, created, **kwargs):
    if not created or instance.status != "active":
        return

    transaction.on_commit(
        lambda: threading.Thread(
            target=_trigger_monitoring_in_background,
            args=(instance.pk,),
            daemon=True,
        ).start()
    )
