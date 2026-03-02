from __future__ import annotations

from collections.abc import Callable
from typing import Any

from domain_monitoring.choices import DNSProvider, ScreenshotProvider, SubdomainProvider
from domain_monitoring.services.settings import get_domain_monitoring_settings
from scripts.providers.geekflare import get_dns_records as geekflare_get_dns_records
from scripts.providers.securitytrails import get_dns_records as securitytrails_get_dns_records
from scripts.providers.securitytrails import get_subdomains as securitytrails_get_subdomains
from scripts.providers.virustotal import get_subdomains as virustotal_get_subdomains


DNS_ADAPTERS: dict[str, Callable[[str], dict[str, Any]]] = {
    DNSProvider.GEEKFLARE: geekflare_get_dns_records,
    DNSProvider.SECURITYTRAILS: securitytrails_get_dns_records,
}

SUBDOMAIN_ADAPTERS: dict[str, Callable[[str], dict[str, Any]]] = {
    SubdomainProvider.VIRUSTOTAL: virustotal_get_subdomains,
    SubdomainProvider.SECURITYTRAILS: securitytrails_get_subdomains,
}


def get_dns_provider() -> Callable[[str], dict[str, Any]]:
    provider = get_domain_monitoring_settings().dns_provider
    return DNS_ADAPTERS.get(provider, geekflare_get_dns_records)


def get_subdomain_provider() -> Callable[[str], dict[str, Any]]:
    provider = get_domain_monitoring_settings().subdomain_provider
    return SUBDOMAIN_ADAPTERS.get(provider, virustotal_get_subdomains)


def get_screenshot_provider() -> str:
    return get_domain_monitoring_settings().screenshot_provider or ScreenshotProvider.GEEKFLARE
