"""
Monitored domain ViewSets with Threatstream integration.
"""
import logging

from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from scripts.integrations.anomali.threatstream import (
    threatstream_import_domains_without_approval,
)

from .mixins import BulkOperationsMixin, CountMixin
from ..filters import MonitoredDomainAlertFilter, MonitoredDomainFilter
from ..models import (
    MonitoredDomain,
    MonitoredDomainAlert,
    MonitoredDomainAlertComment,
    MonitoredDomainScreenshotPattern,
)
from ..serializers import (
    AnomaliThreatstreamDomainsSerializer,
    MonitoredDomainAlertCommentSerializer,
    MonitoredDomainAlertSerializer,
    MonitoredDomainSerializer,
    MonitoredDomainScreenshotPatternSerializer,
    SponsoredListingPatternCreateSerializer,
)
from ..choices import AlertStatus
from ..services.screenshot_compare import compute_screenshot_phash

logger = logging.getLogger(__name__)


class MonitoredDomainViewSet(viewsets.ModelViewSet, CountMixin, BulkOperationsMixin):
    """
    Monitor domains with integration endpoints.
    
    Supports:
    - List, retrieve, create, update, delete monitored domains
    - Count metadata with status breakdown
    - Bulk create, delete, and patch operations
    - Export to Threatstream with approval workflow
    - Filter and ordering
    
    Actions:
    - POST /bulk-delete - Bulk delete domains
    - PATCH /bulk-patch - Bulk status update
    - POST /{id}/export-threatstream - Export single domain to Threatstream
    - POST /bulk-export-threatstream - Export multiple domains to Threatstream
    """
    queryset = MonitoredDomain.objects.all()
    serializer_class = MonitoredDomainSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_class = MonitoredDomainFilter
    permission_classes = [IsAuthenticated]
    ordering_fields = ["value", "created", "last_modified", "last_checked"]
    search_fields = ["value", "status"]

    def list(self, request, *args, **kwargs):
        """List domains with count metadata"""
        return self.list_with_counts(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        """Create single or bulk domains"""
        return self.bulk_create(request, *args, **kwargs)

    @action(detail=False, methods=["post"], url_path="bulk-export-threatstream")
    def bulk_export_threatstream(self, request):
        """Export multiple domains to Anomali Threatstream"""
        try:
            serializer = AnomaliThreatstreamDomainsSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {"error": serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

            domains = serializer.validated_data["domains"]
            tags = serializer.validated_data.get("tags", [])
            
            logger.info(f"Bulk exporting {len(domains)} domains to Anomali Threatstream")
            response = threatstream_import_domains_without_approval(domains, tags)

            if response.status_code == 202:
                logger.info("Domains successfully exported to Anomali Threatstream")
                return Response(
                    {"domains_count": len(domains), "status": "queued"},
                    status=status.HTTP_202_ACCEPTED,
                )
            else:
                logger.error(f"Failed to export domains: {response.status_code}")
                return Response(
                    {"error": "Failed to export domains to Anomali Threatstream"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        except Exception as e:
            logger.error(f"Error in Threatstream export: {e}", exc_info=True)
            return Response(
                {"error": "Failed to process export"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"])
    def export_threatstream(self, request, pk=None):
        """Export single domain to Anomali Threatstream"""
        try:
            domain = self.get_object()
            tags = request.data.get("tags", [])
            
            logger.info(f"Exporting domain {domain.value} to Anomali Threatstream")
            response = threatstream_import_domains_without_approval([domain.value], tags)

            if response.status_code == 202:
                logger.info(f"Domain {domain.value} exported successfully")
                return Response(
                    {"domain": domain.value, "status": "queued"},
                    status=status.HTTP_202_ACCEPTED,
                )
            else:
                logger.error(f"Failed to export domain {domain.value}: {response.status_code}")
                return Response(
                    {"error": "Failed to export domain"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        except Exception as e:
            logger.error(f"Error exporting domain: {e}", exc_info=True)
            return Response(
                {"error": "Failed to export domain"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class MonitoredDomainAlertViewSet(viewsets.ModelViewSet, CountMixin):
    """
    Manage domain monitoring alerts.
    
    Supports:
    - List, retrieve, create, update, delete alerts
    - Comments via nested routes at /{id}/comments/
    - Count metadata with status breakdown
    - Filter and ordering
    """
    queryset = MonitoredDomainAlert.objects.all()
    serializer_class = MonitoredDomainAlertSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_class = MonitoredDomainAlertFilter
    permission_classes = [IsAuthenticated]
    ordering_fields = ["created", "last_modified", "domain_name", "status"]
    search_fields = ["domain_name", "status", "company__name"]

    def list(self, request, *args, **kwargs):
        """List alerts with count metadata"""
        return self.list_with_counts(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="mark-sponsored-listing")
    def mark_sponsored_listing(self, request, pk=None):
        alert = self.get_object()
        serializer = SponsoredListingPatternCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        try:
            monitored_domain = MonitoredDomain.objects.get(
                value=alert.domain_name,
                company=alert.company,
            )
        except MonitoredDomain.DoesNotExist:
            return Response(
                {"error": "Matching monitored domain not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not alert.website_screenshot:
            return Response(
                {"error": "Alert has no screenshot to classify"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pattern, _ = MonitoredDomainScreenshotPattern.objects.update_or_create(
            monitored_domain=monitored_domain,
            screenshot_hash=alert.website_screenshot_hash,
            defaults={
                "pattern_type": serializer.validated_data["pattern_type"],
                "screenshot": alert.website_screenshot,
                "screenshot_phash": compute_screenshot_phash(alert.website_screenshot),
                "active": True,
                "created_by": request.user,
            },
        )

        if alert.status != AlertStatus.CLOSED:
            alert.status = AlertStatus.CLOSED
            alert.save(update_fields=["status", "last_modified"])

        pattern_serializer = MonitoredDomainScreenshotPatternSerializer(pattern)
        return Response(pattern_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post", "patch", "delete"], url_path="comments")
    def comments(self, request, pk=None):
        """Get, create, update, or delete comments for this alert"""
        alert = self.get_object()
        
        if request.method == "GET":
            comments = alert.comments.all()
            serializer = MonitoredDomainAlertCommentSerializer(comments, many=True)
            return Response(serializer.data)
        
        elif request.method == "POST":
            serializer = MonitoredDomainAlertCommentSerializer(data=request.data)
            if serializer.is_valid():
                comment = serializer.save(user=request.user, alert=alert)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        
        elif request.method == "PATCH":
            # Update a specific comment
            comment_id = request.data.get("comment_id")
            if not comment_id:
                return Response({"error": "comment_id required"}, status=status.HTTP_400_BAD_REQUEST)
            try:
                comment = alert.comments.get(id=comment_id)
                serializer = MonitoredDomainAlertCommentSerializer(comment, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    return Response(serializer.data)
                return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
            except MonitoredDomainAlertComment.DoesNotExist:
                return Response({"error": "Comment not found"}, status=status.HTTP_404_NOT_FOUND)
        
        elif request.method == "DELETE":
            # Delete a specific comment
            comment_id = request.data.get("comment_id")
            if not comment_id:
                return Response({"error": "comment_id required"}, status=status.HTTP_400_BAD_REQUEST)
            try:
                comment = alert.comments.get(id=comment_id)
                comment.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)
            except MonitoredDomainAlertComment.DoesNotExist:
                return Response({"error": "Comment not found"}, status=status.HTTP_404_NOT_FOUND)
