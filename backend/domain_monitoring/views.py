"""
Domain Monitoring ViewSets with provider integrations and utility operations.

Includes:
- Company and domain management
- DNS/SSL monitoring
- Anomaly detection (lookalike domains, new domains)
- Integrations with Threatstream, Trellix ETP, and Proofpoint
- Comment tracking for domain alerts and lookalike domains
"""
import logging

from django.db.models import Count
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from api.pagination import ItemsLimitOffsetPagination
from api.response import error, success
from scripts.constants import DOMAIN_MONITORING_TABS
from scripts.providers.anomali.threatstream import (
    threatstream_import_domains_without_approval,
)
from scripts.providers.proofpoint import (
    proofpoint_add_domains,
    proofpoint_generate_access_token,
)
from scripts.providers.trellix import process_yara_rules

from .filters import (
    CompanyDomainFilter,
    CompanyFilter,
    LookalikeDomainFilter,
    MonitoredDomainAlertFilter,
    MonitoredDomainFilter,
    NewlyRegisteredDomainFilter,
    SSLCertificateFilter,
    WatchedResourceFilter,
)
from .models import (
    Company,
    CompanyDomain,
    LookalikeDomain,
    LookalikeDomainComment,
    MonitoredDomain,
    MonitoredDomainAlert,
    MonitoredDomainAlertComment,
    NewlyRegisteredDomain,
    SSLCertificate,
    WatchedResource,
)
from .serializers import (
    AnomaliThreatstreamDomainsSerializer,
    CompanyDomainSerializer,
    CompanySerializer,
    DomainsSerializer,
    LookalikeDomainCommentSerializer,
    LookalikeDomainSerializer,
    MonitoredDomainAlertCommentSerializer,
    MonitoredDomainAlertSerializer,
    MonitoredDomainSerializer,
    NewlyRegisteredDomainSerializer,
    SSLCertificateSerializer,
    WatchedResourceSerializer,
)

logger = logging.getLogger(__name__)


# Mixins
class CountMixin:
    """Mixin for viewsets that return count metadata"""
    
    def get_counts(self, queryset):
        """Get total count and status breakdown"""
        total_count = queryset.count()
        status_counts = queryset.values("status").annotate(count=Count("status")).order_by("status")
        return total_count, status_counts

    def get_limited_queryset(self, queryset, limit=5000):
        """Limit queryset to prevent excessive memory usage"""
        return queryset[:limit] if queryset.count() > limit else queryset

    def get_queryset_with_counts(self, request, limit=False):
        """Get filtered queryset with count metadata"""
        queryset = self.filter_queryset(self.get_queryset())
        total_count, status_counts = self.get_counts(queryset)
        if limit:
            queryset = self.get_limited_queryset(queryset)
        return queryset, total_count, status_counts

    def list_with_counts(self, request, *args, **kwargs):
        """List items with count metadata"""
        queryset, total_count, status_counts = self.get_queryset_with_counts(
            request, limit=kwargs.get("limit_queryset", False)
        )
        serializer = self.get_serializer(queryset, many=True)
        # Return pagination-friendly response
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)


class BulkOperationsMixin:
    """Mixin for bulk create, update, and delete operations"""
    
    def bulk_create(self, request, *args, **kwargs):
        """Handle both single and bulk creation of items"""
        if not isinstance(request.data, list):
            return super().create(request, *args, **kwargs)

        created = []
        errors = []
        for idx, item in enumerate(request.data):
            serializer = self.get_serializer(data=item)
            try:
                serializer.is_valid(raise_exception=True)
                self.perform_create(serializer)
                created.append(serializer.data)
            except Exception as e:
                logger.warning(f"Failed to create item {idx}: {e}")
                errors.append({"index": idx, "error": str(e)})

        logger.info(f"Bulk create: {len(created)} added, {len(errors)} failed")
        response_status = status.HTTP_201_CREATED if created and not errors else status.HTTP_207_MULTI_STATUS if created else status.HTTP_400_BAD_REQUEST
        return Response(
            {"created": len(created), "failed": len(errors), "errors": errors if errors else []},
            status=response_status,
        )

    @action(detail=False, methods=["post"], url_path="bulk-delete")
    def bulk_delete(self, request, *args, **kwargs):
        """Bulk delete items by ID"""
        ids = request.data.get("ids", [])
        if not ids:
            return Response(
                {"error": "No IDs provided for deletion."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        model_class = self.queryset.model
        deleted_count, _ = model_class.objects.filter(id__in=ids).delete()
        logger.info(f"Bulk deleted {deleted_count} items")

        return Response(
            {"deleted": deleted_count},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=["patch"], url_path="bulk-patch")
    def bulk_patch(self, request, *args, **kwargs):
        """Bulk update status for multiple items"""
        request_data = request.data
        ids = request_data.get("ids", {})
        instance_status = request_data.get("status")
        updated_count = 0
        error_count = 0
        errors = []

        model_class = self.queryset.model

        for instance_id in ids:
            try:
                instance = model_class.objects.get(id=instance_id)
                serializer = self.get_serializer(
                    instance, data={"status": instance_status}, partial=True
                )
                serializer.is_valid(raise_exception=True)
                serializer.save()
                updated_count += 1
            except Exception as e:
                logger.error(f"Error updating status for id {instance_id}: {e}")
                error_count += 1
                errors.append(str(e))

        logger.info(f"Bulk patch: {updated_count} updated, {error_count} failed")
        return Response(
            {"updated": updated_count, "failed": error_count, "errors": errors},
            status=status.HTTP_200_OK,
        )


# ============================================================================
# METADATA VIEWSETS
# ============================================================================

class DomainMonitoringTabsView(viewsets.ViewSet):
    """List domain monitoring tabs with pagination"""
    permission_classes = [IsAuthenticated]
    pagination_class = ItemsLimitOffsetPagination

    def list(self, request):
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(DOMAIN_MONITORING_TABS, request, view=self)
        if page is not None:
            return paginator.get_paginated_response(page)
        return success(DOMAIN_MONITORING_TABS)


# ============================================================================
# COMPANY MANAGEMENT VIEWSETS
# ============================================================================

class CompanyViewSet(viewsets.ModelViewSet):
    """
    Manage companies with their basic information.
    
    Supports:
    - List, retrieve, create, update, delete companies
    - Filter by multiple fields
    - Ordering
    - Search by name and industry
    """
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_class = CompanyFilter
    permission_classes = [IsAuthenticated]
    ordering_fields = ["name", "created", "updated"]
    search_fields = ["name", "industry"]




class CompanyDomainViewSet(viewsets.ModelViewSet):
    """
    Manage company domain registrations.
    
    Supports:
    - List, retrieve, create, update, delete company domains
    - Filter by company and domain status
    - Ordering by domain name and creation date
    - Search by domain name
    """
    queryset = CompanyDomain.objects.all()
    serializer_class = CompanyDomainSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_class = CompanyDomainFilter
    permission_classes = [IsAuthenticated]
    ordering_fields = ["domain", "created", "updated"]
    search_fields = ["domain"]




# ============================================================================
# RESOURCE MONITORING VIEWSETS
# ============================================================================

class WatchedResourceViewSet(viewsets.ModelViewSet):
    """
    Manage watched resources (IPs, domains, email addresses).
    
    Supports:
    - List, retrieve, create, update, delete watched resources
    - Filter by resource type and status
    - Search by resource value
    """
    queryset = WatchedResource.objects.all()
    serializer_class = WatchedResourceSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_class = WatchedResourceFilter
    permission_classes = [IsAuthenticated]
    ordering_fields = ["value", "created"]
    search_fields = ["value", "resource_type"]


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
    ordering_fields = ["domain", "created", "updated"]
    search_fields = ["domain", "status"]

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
            
            logger.info(f"Exporting domain {domain.domain} to Anomali Threatstream")
            response = threatstream_import_domains_without_approval([domain.domain], tags)

            if response.status_code == 202:
                logger.info(f"Domain {domain.domain} exported successfully")
                return Response(
                    {"domain": domain.domain, "status": "queued"},
                    status=status.HTTP_202_ACCEPTED,
                )
            else:
                logger.error(f"Failed to export domain {domain.domain}: {response.status_code}")
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
    ordering_fields = ["created", "updated", "severity"]
    search_fields = ["monitored_domain__domain", "alert_type"]

    def list(self, request, *args, **kwargs):
        """List alerts with count metadata"""
        return self.list_with_counts(request, *args, **kwargs)

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





# ============================================================================
# DOMAIN ANOMALY DETECTION VIEWSETS
# ============================================================================

class LookalikeDomainViewSet(viewsets.ModelViewSet, CountMixin, BulkOperationsMixin):
    """
    Monitor lookalike domains (typosquatting, homograph attacks).
    
    Supports:
    - List, retrieve, create, update, delete lookalike domains
    - Comments via nested routes at /{id}/comments/
    - Count metadata with status breakdown
    - Bulk operations
    - Limited result sets to prevent memory issues
    """
    queryset = LookalikeDomain.objects.all()
    serializer_class = LookalikeDomainSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_class = LookalikeDomainFilter
    permission_classes = [IsAuthenticated]
    ordering_fields = ["created", "similarity_score"]
    search_fields = ["domain", "lookalike_domain"]

    def list(self, request, *args, **kwargs):
        """List lookalike domains with count metadata (limited to prevent memory issues)"""
        return self.list_with_counts(request, *args, **kwargs, limit_queryset=True)

    def create(self, request, *args, **kwargs):
        """Create single or bulk lookalike domains"""
        return self.bulk_create(request, *args, **kwargs)

    @action(detail=True, methods=["get", "post", "patch", "delete"], url_path="comments")
    def comments(self, request, pk=None):
        """Get, create, update, or delete comments for this lookalike domain"""
        domain = self.get_object()
        
        if request.method == "GET":
            comments = domain.comments.all()
            serializer = LookalikeDomainCommentSerializer(comments, many=True)
            return Response(serializer.data)
        
        elif request.method == "POST":
            serializer = LookalikeDomainCommentSerializer(data=request.data)
            if serializer.is_valid():
                comment = serializer.save(user=request.user, lookalike_domain=domain)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        
        elif request.method == "PATCH":
            # Update a specific comment
            comment_id = request.data.get("comment_id")
            if not comment_id:
                return Response({"error": "comment_id required"}, status=status.HTTP_400_BAD_REQUEST)
            try:
                comment = domain.comments.get(id=comment_id)
                serializer = LookalikeDomainCommentSerializer(comment, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    return Response(serializer.data)
                return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
            except LookalikeDomainComment.DoesNotExist:
                return Response({"error": "Comment not found"}, status=status.HTTP_404_NOT_FOUND)
        
        elif request.method == "DELETE":
            # Delete a specific comment
            comment_id = request.data.get("comment_id")
            if not comment_id:
                return Response({"error": "comment_id required"}, status=status.HTTP_400_BAD_REQUEST)
            try:
                comment = domain.comments.get(id=comment_id)
                comment.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)
            except LookalikeDomainComment.DoesNotExist:
                return Response({"error": "Comment not found"}, status=status.HTTP_404_NOT_FOUND)





class NewlyRegisteredDomainViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Track newly registered domains (read-only).
    
    Supports:
    - List and retrieve newly registered domains
    - Filter by registration date and domain patterns
    - Ordering
    """
    queryset = NewlyRegisteredDomain.objects.all()
    serializer_class = NewlyRegisteredDomainSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_class = NewlyRegisteredDomainFilter
    permission_classes = [IsAuthenticated]
    ordering_fields = ["created", "domain"]
    search_fields = ["domain", "registrar"]


# ============================================================================
# SSL/TLS CERTIFICATE MONITORING
# ============================================================================

class SSLCertificateViewSet(viewsets.ModelViewSet):
    """
    Monitor SSL/TLS certificates.
    
    Supports:
    - List, retrieve, create, update, delete SSL certificate records
    - Filter by domain, expiration status, issuer
    - Ordering by domain and expiration date
    """
    queryset = SSLCertificate.objects.all()
    serializer_class = SSLCertificateSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_class = SSLCertificateFilter
    permission_classes = [IsAuthenticated]
    ordering_fields = ["domain", "expires"]
    search_fields = ["domain", "issuer", "subject"]


# ============================================================================
# EXTERNAL PROVIDER INTEGRATIONS
# ============================================================================

class TrellixETPIntegrationViewSet(viewsets.ViewSet):
    """
    Integrate domain protection with Trellix ETP via YARA rules.
    
    Actions:
    - POST /add-domains - Add domains to YARA rule
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"], url_path="add-domains")
    def add_domains(self, request):
        """Add domains to Trellix ETP YARA rule"""
        try:
            serializer = DomainsSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {"error": serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

            domains = serializer.validated_data["domains"]
            logger.info(f"Adding {len(domains)} domains to Trellix ETP")
            
            response = process_yara_rules(domains)
            
            if response.status_code == 202:
                logger.info("Domains successfully added to Trellix ETP YARA rule")
                return Response(
                    {"domains_count": len(domains), "status": "queued"},
                    status=status.HTTP_202_ACCEPTED,
                )
            else:
                logger.error(f"Failed to add domains to Trellix: {response.status_code}")
                return Response(
                    {"error": "Failed to add domains to Trellix ETP's YARA rule"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        except ValueError as e:
            logger.error(f"Invalid input for Trellix integration: {e}")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error in Trellix integration: {e}", exc_info=True)
            return Response(
                {"error": "Failed to process Trellix request"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ProofpointIntegrationViewSet(viewsets.ViewSet):
    """
    Integrate domain protection with Proofpoint email security.
    
    Actions:
    - POST /add-domains - Add domains to blocklist
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"], url_path="add-domains")
    def add_domains(self, request):
        """Add domains to Proofpoint blocklist"""
        try:
            serializer = DomainsSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {"error": serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

            domains = serializer.validated_data["domains"]
            logger.info(f"Adding {len(domains)} domains to Proofpoint")
            
            try:
                access_token = proofpoint_generate_access_token()
                results = proofpoint_add_domains(domains, access_token=access_token)
                logger.info("Domains successfully added to Proofpoint")
                return Response(results, status=status.HTTP_200_OK)
            except ValueError as e:
                logger.error(f"Proofpoint API error: {e}")
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError as e:
            logger.error(f"Invalid input for Proofpoint: {e}")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error in Proofpoint integration: {e}", exc_info=True)
            return Response(
                {"error": "Failed to process Proofpoint request"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
