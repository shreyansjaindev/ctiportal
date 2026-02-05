import ipaddress
import re
from urllib.parse import urljoin

import ioc_fanger
import tldextract
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from api.pagination import ItemsLimitOffsetPagination
from api.response import error, success
from api.serializers import UserMeSerializer
from scripts.ad_users import get_aduser
from scripts.constants import (
    ADDITIONAL_SOURCES,
    APPS,
    DOMAIN_MONITORING_TABS,
    SECURITY_HEADERS,
    SOURCES,
    SUMMARY_HEADERS,
)
from scripts.mha import mha as mha_analyzer
from scripts.providers.screenshotmachine import bulk_screenshot
from scripts.textformatter import collector as text_formatter
from scripts.threatstream import threatstream_export, threatstream_export_feeds


class GetRoutes(APIView):
    def get(self, request):
        base_url = request.build_absolute_uri("/api/v1/")
        route_names = ["intelligence-harvester", "domain-monitoring"]
        routes = {route: urljoin(base_url, f"{route}/") for route in route_names}
        return success({"routes": routes})


class HealthView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return success({"status": "ok"})


class UserMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserMeSerializer(request.user)
        return success(serializer.data)


class AppsView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = ItemsLimitOffsetPagination

    def get(self, request):
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(APPS, request, view=self)
        if page is not None:
            return paginator.get_paginated_response(page)
        return success(APPS)


class IntelligenceSourcesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data_needs = {
            "dns": {
                "label": "DNS",
                "supported_types": ["domain", "url", "ipv4"],
            },
            "whois": {
                "label": "WHOIS",
                "supported_types": ["domain", "url"],
            },
            "passive-dns": {
                "label": "Passive DNS",
                "supported_types": ["domain", "ipv4", "url"],
            },
            "blocklists": {
                "label": "Blocklists",
                "supported_types": ["domain", "ipv4", "url"],
            },
            "reputation": {
                "label": "Reputation",
                "supported_types": ["domain", "ipv4", "url", "md5", "sha1", "sha256", "sha512"],
            },
            "vulnerability": {
                "label": "Vulnerability",
                "supported_types": ["cve"],
            },
            "malware-analysis": {
                "label": "Malware Analysis",
                "supported_types": ["md5", "sha1", "sha256", "sha512"],
            },
            "screenshot": {
                "label": "Screenshot",
                "supported_types": ["domain", "url", "ipv4"],
            },
            "availability": {
                "label": "Availability",
                "supported_types": ["domain", "url", "ipv4"],
            },
            "email": {
                "label": "Email",
                "supported_types": ["email"],
            },
        }

        sources = SOURCES
        sources_by_need = {}
        for need_key, need in data_needs.items():
            sources_by_need[need_key] = [
                key
                for key, source in sources.items()
                if need_key in source.get("capabilities", [])
            ]

        return success(
            {
                "sources": sources,
                "additional_sources": ADDITIONAL_SOURCES,
                "data_needs": data_needs,
                "sources_by_need": sources_by_need,
            }
        )


class IndicatorDetectView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser]

    def post(self, request):
        indicators = request.data.get("indicators", [])
        if isinstance(indicators, str):
            indicators = [indicators]

        def detect(value: str) -> str:
            trimmed = value.strip()
            if not trimmed:
                return "unknown"
            # De-fang common IOC encodings.
            trimmed = ioc_fanger.fang(trimmed)
            lower = trimmed.lower()
            if lower.startswith("http://") or lower.startswith("https://"):
                return "url"
            if re.match(r"^cve-\d{4}-\d{4,}$", lower):
                return "cve"
            if re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", trimmed):
                return "email"
            try:
                ipaddress.IPv4Address(trimmed)
                return "ipv4"
            except ipaddress.AddressValueError:
                pass
            try:
                ipaddress.IPv6Address(trimmed)
                return "ipv6"
            except ipaddress.AddressValueError:
                pass
            if re.match(r"^[a-f0-9]{32}$", lower):
                return "md5"
            if re.match(r"^[a-f0-9]{40}$", lower):
                return "sha1"
            if re.match(r"^[a-f0-9]{64}$", lower):
                return "sha256"
            if re.match(r"^[a-f0-9]{128}$", lower):
                return "sha512"
            # URL without scheme should include a path/query/fragment.
            if re.match(r"^([a-z0-9-]+\.)+[a-z0-9-]{2,}[/#?].*$", lower):
                return "url"
            extracted = tldextract.extract(trimmed)
            if extracted.domain and extracted.suffix:
                return "domain"
            return "keyword"

        results = [
            {"value": value, "type": detect(value)} for value in indicators if value
        ]
        return success(results)


class DomainMonitoringTabsView(APIView):
    permission_classes = [IsAuthenticated]

    pagination_class = ItemsLimitOffsetPagination

    def get(self, request):
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(DOMAIN_MONITORING_TABS, request, view=self)
        if page is not None:
            return paginator.get_paginated_response(page)
        return success(DOMAIN_MONITORING_TABS)


class TextFormatterView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser]

    def post(self, request):
        checklist = request.data.get("checklist")
        query = request.data.get("query")
        if not query:
            return error("query is required", code="validation_error", status_code=400)
        context = {"data": text_formatter(query, checklist), "checklist": checklist}
        return success(context)


class MailHeaderAnalyzerView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser]

    def post(self, request):
        header = request.data.get("header")
        if not header:
            return error("header is required", code="validation_error", status_code=400)
        context = {
            "mha": mha_analyzer(header.strip()),
            "summary_headers": SUMMARY_HEADERS,
            "security_headers": SECURITY_HEADERS,
        }
        return success(context)


class ScreenshotView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser]

    def post(self, request):
        query = request.data.get("query")
        if not query:
            return error("query is required", code="validation_error", status_code=400)
        query_list = query.rstrip().split("\n")
        data = bulk_screenshot(query_list)
        return success(data)


class ActiveDirectoryView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser]

    def post(self, request):
        query = request.data.get("query")
        if not query:
            return error("query is required", code="validation_error", status_code=400)
        data = get_aduser(query.strip())
        return success(data)


class ThreatstreamExportView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, JSONParser, FormParser]

    def post(self, request):
        if "file" in request.data:
            input_data = request.data["file"].read().decode("utf-8").rstrip()
            context = threatstream_export_feeds(input_data)
            return success(context)
        filters = request.data.get("filters")
        if not filters:
            return error(
                "filters or file is required",
                code="validation_error",
                status_code=400,
            )
        context = threatstream_export(filters)
        return success(context)
