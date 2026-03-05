import logging
import threading
from datetime import datetime, time

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from domain_monitoring.models import MonitoredDomain, WatchedResource
from domain_monitoring.services.lookalikes import run_lookalike_scan_since
from domain_monitoring.services.monitoring import monitor_monitored_domain_by_id


logger = logging.getLogger(__name__)


def _trigger_monitoring_in_background(monitored_domain_id):
    try:
        monitor_monitored_domain_by_id(monitored_domain_id)
    except Exception:
        logger.exception("Immediate monitoring failed for monitored domain %s", monitored_domain_id)


def _trigger_lookalike_scan_in_background(since_from: datetime):
    try:
        run_lookalike_scan_since(since_from=since_from, workers=1)
    except Exception:
        logger.exception(
            "Background lookalike scan failed for watched resource update since %s",
            since_from.isoformat(),
        )


def _should_trigger_watched_resource_scan(created: bool, status: str, update_fields) -> bool:
    if status != "active":
        return False

    if created:
        return True

    if not update_fields:
        return True

    relevant_fields = {"value", "resource_type", "properties", "exclude_keywords", "status", "lookalike_match_from"}
    return bool(set(update_fields) & relevant_fields)


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


@receiver(post_save, sender=WatchedResource)
def trigger_lookalike_scan_for_watched_resource(sender, instance, created, update_fields=None, **kwargs):
    if not _should_trigger_watched_resource_scan(created, instance.status, update_fields):
        return

    if instance.lookalike_match_from:
        since_from = timezone.make_aware(
            datetime.combine(instance.lookalike_match_from, time.min),
            timezone.get_current_timezone(),
        )
    else:
        since_from = timezone.now()

    transaction.on_commit(
        lambda: threading.Thread(
            target=_trigger_lookalike_scan_in_background,
            args=(since_from,),
            daemon=True,
        ).start()
    )
