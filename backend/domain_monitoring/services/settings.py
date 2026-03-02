from __future__ import annotations

from domain_monitoring.models import DomainMonitoringSettings


def get_domain_monitoring_settings() -> DomainMonitoringSettings:
    return DomainMonitoringSettings.get_solo()
