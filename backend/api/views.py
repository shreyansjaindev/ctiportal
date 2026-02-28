"""
API views for system utilities and generic operations.

This module contains views for:
- System endpoints: Health checks, authentication, user info, app metadata
- Utility endpoints: Text formatting, email analysis, screenshots, AD lookups, exports
"""
import logging

from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from api.pagination import ItemsLimitOffsetPagination
from api.response import error, success
from api.serializers import UserMeSerializer
from scripts.integrations.anomali.threatstream import (
    threatstream_export,
    threatstream_export_feeds,
)
from scripts.providers.screenshotmachine import bulk_screenshot
from scripts.utils.ad_users import get_aduser
from scripts.utils.mha import mha as mha_analyzer
from scripts.utils.textformatter import collector as text_formatter

logger = logging.getLogger(__name__)


APPS = [
    {"name": "Intelligence Harvester", "path": "/intelligence-harvester"},
    {"name": "Domain Monitoring", "path": "/domain-monitoring"},
    {"name": "Text Formatter", "path": "/text-formatter"},
    {"name": "URL Decoder", "path": "/url-decoder"},
    {"name": "Website Screenshot", "path": "/screenshot"},
    {"name": "Mail Header Analyzer", "path": "/mail-header-analyzer"},
    {"name": "Anomali ThreatStream Search", "path": "/threatstream"},
    {"name": "Microsoft Active Directory Validator", "path": "/active-directory"},
]


class HealthView(APIView):
    """Health check endpoint — public so load balancers and deploy platforms can probe it."""
    permission_classes = []
    authentication_classes = []

    def get(self, request):
        return success({"status": "ok"})


class UserMeView(APIView):
    """Retrieve current authenticated user information"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserMeSerializer(request.user)
        return success(serializer.data)


class AppsView(APIView):
    """List available applications"""
    permission_classes = [IsAuthenticated]
    pagination_class = ItemsLimitOffsetPagination

    def get(self, request):
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(APPS, request, view=self)
        if page is not None:
            return paginator.get_paginated_response(page)
        return success(APPS)


# =============================================================================
# Utility Views
# =============================================================================

class TextFormatterView(APIView):
    """Format and normalize text data"""
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser]

    def post(self, request):
        try:
            checklist = request.data.get("checklist")
            query = request.data.get("query")
            if not query:
                logger.warning("Text formatter called without query")
                return error("query is required", code="validation_error", status_code=400)
            logger.debug(f"Text formatting for query: {query[:50]}...")
            context = {"data": text_formatter(query, checklist), "checklist": checklist}
            return success(context)
        except Exception as e:
            logger.error(f"Error in text formatter: {e}", exc_info=True)
            return error("Failed to format text", code="processing_error", status_code=500)


class MailHeaderAnalyzerView(APIView):
    """Analyze email headers for metadata and security information"""
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser]

    def post(self, request):
        try:
            header = request.data.get("header")
            if not header:
                logger.warning("Mail header analyzer called without header")
                return error("header is required", code="validation_error", status_code=400)
            logger.debug("Analyzing mail headers")
            return success({"mha": mha_analyzer(header.strip())})
        except Exception as e:
            logger.error(f"Error analyzing mail headers: {e}", exc_info=True)
            return error("Failed to analyze headers", code="processing_error", status_code=500)


class ScreenshotView(APIView):
    """Take screenshots of URLs (batch operation)"""
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser]

    def post(self, request):
        try:
            query = request.data.get("query")
            if not query:
                logger.warning("Screenshot view called without query")
                return error("query is required", code="validation_error", status_code=400)
            query_list = query.rstrip().split("\n")
            logger.info(f"Processing screenshots for {len(query_list)} targets")
            data = bulk_screenshot(query_list)
            return success(data)
        except Exception as e:
            logger.error(f"Error taking screenshots: {e}", exc_info=True)
            return error("Failed to take screenshots", code="processing_error", status_code=500)


class ActiveDirectoryView(APIView):
    """Lookup users in Active Directory"""
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser]

    def post(self, request):
        try:
            query = request.data.get("query")
            if not query:
                logger.warning("Active Directory view called without query")
                return error("query is required", code="validation_error", status_code=400)
            logger.info(f"AD user lookup for: {query}")
            data = get_aduser(query.strip())
            return success(data)
        except Exception as e:
            logger.error(f"Error in Active Directory lookup: {e}", exc_info=True)
            return error("Failed to lookup AD user", code="processing_error", status_code=500)


class ThreatstreamExportView(APIView):
    """Export indicators to Anomali Threatstream"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, JSONParser, FormParser]

    def post(self, request):
        try:
            if "file" in request.data:
                logger.info("Threatstream export with file upload")
                input_data = request.data["file"].read().decode("utf-8").rstrip()
                context = threatstream_export_feeds(input_data)
                return success(context)
            filters = request.data.get("filters")
            if not filters:
                logger.warning("Threatstream export called without filters or file")
                return error(
                    "filters or file is required",
                    code="validation_error",
                    status_code=400,
                )
            logger.info("Threatstream export with filters")
            context = threatstream_export(filters)
            return success(context)
        except Exception as e:
            logger.error(f"Error in Threatstream export: {e}", exc_info=True)
            return error("Failed to export Threatstream data", code="processing_error", status_code=500)
