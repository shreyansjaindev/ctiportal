from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count
from .models import *
from .serializers import *
from .filters import *
from scripts.threatstream import threatstream_import_domains_without_approval


class UtilityMixin:
    def get_counts(self, queryset):
        total_count = queryset.count()
        status_counts = queryset.values("status").annotate(count=Count("status")).order_by("status")
        return total_count, status_counts

    def get_limited_queryset(self, queryset, limit=10):
        return queryset[:limit] if queryset.count() > limit else queryset

    def get_queryset_with_counts(self, request, limit=False):
        queryset = self.filter_queryset(self.get_queryset())
        total_count, status_counts = self.get_counts(queryset)
        if limit:
            queryset = self.get_limited_queryset(queryset)
        return queryset, total_count, status_counts

    def list_with_counts(self, request, *args, **kwargs):
        queryset, total_count, status_counts = self.get_queryset_with_counts(
            request, limit=kwargs.get("limit_queryset", False)
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {
                "count": {
                    "total": total_count,
                    "status": {item["status"]: item["count"] for item in status_counts},
                },
                "results": serializer.data,
            }
        )

    @action(detail=False, methods=["post"], url_path="bulk-delete")
    def bulk_delete(self, request, *args, **kwargs):
        ids = request.data.get("ids", [])
        if not ids:
            return Response(
                {"error": "No IDs provided for deletion."}, status=status.HTTP_400_BAD_REQUEST
            )

        model_class = self.queryset.model
        deleted_count, _ = model_class.objects.filter(id__in=ids).delete()

        return Response({"deleted_count": deleted_count}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["patch"], url_path="bulk-patch")
    def bulk_patch(self, request, *args, **kwargs):
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
                error_count += 1
                errors.append(str(e))

        return Response(
            {"updated_count": updated_count, "error_count": error_count, "errors": errors},
            status=status.HTTP_200_OK,
        )


# Company
class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = CompanyFilter
    permission_classes = [IsAuthenticated]


# Company Domains
class CompanyDomainViewSet(viewsets.ModelViewSet):
    queryset = CompanyDomain.objects.all()
    serializer_class = CompanyDomainSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = CompanyDomainFilter
    permission_classes = [IsAuthenticated]


# Watched Resources
class WatchedResourceViewSet(viewsets.ModelViewSet, UtilityMixin):
    queryset = WatchedResource.objects.all()
    serializer_class = WatchedResourceSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = WatchedResourceFilter
    permission_classes = [IsAuthenticated]


# Monitored Domains
class MonitoredDomainViewSet(viewsets.ModelViewSet):
    queryset = MonitoredDomain.objects.all()
    serializer_class = MonitoredDomainSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = MonitoredDomainFilter
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        if not isinstance(request.data, list):
            return super().create(request, *args, **kwargs)

        added_count = 0
        existing_count = 0
        for item in request.data:
            serializer = self.get_serializer(data=item)
            try:
                serializer.is_valid(raise_exception=True)
                self.perform_create(serializer)
                added_count += 1
            except Exception:
                existing_count += 1

        return Response(
            {"added_count": added_count, "existing_count": existing_count},
            status=status.HTTP_201_CREATED,
        )


# Monitored Domain Alerts
class MonitoredDomainAlertViewSet(viewsets.ModelViewSet, UtilityMixin):
    queryset = MonitoredDomainAlert.objects.all()
    serializer_class = MonitoredDomainAlertSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = MonitoredDomainAlertFilter
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        return self.list_with_counts(request, *args, **kwargs)


class MonitoredDomainAlertCommentViewSet(viewsets.ModelViewSet):
    queryset = MonitoredDomainAlertComment.objects.all()
    serializer_class = MonitoredDomainAlertCommentSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# Lookalike Domains
class LookalikeDomainViewSet(viewsets.ModelViewSet, UtilityMixin):
    queryset = LookalikeDomain.objects.all()
    serializer_class = LookalikeDomainSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = LookalikeDomainFilter
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        return self.list_with_counts(request, *args, **kwargs, limit_queryset=True)


class LookalikeDomainCommentViewSet(viewsets.ModelViewSet):
    queryset = LookalikeDomainComment.objects.all()
    serializer_class = LookalikeDomainCommentSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# SSL Certificates
class SslCertificateViewSet(viewsets.ModelViewSet):
    queryset = SSLCertificate.objects.all()
    serializer_class = SslCertificateSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = SSLCertificateFilter
    permission_classes = [IsAuthenticated]


# Newly Registered Domains
class NewlyRegisteredDomainViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = NewlyRegisteredDomain.objects.all()
    serializer_class = NewlyRegisteredDomainSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = NewlyRegisteredDomainFilter
    permission_classes = [IsAuthenticated]


class LookalikeDomainsBlockViewSet(viewsets.ViewSet):
    def create(self, request, *args, **kwargs):
        serializer = DomainsSerializer(data=request.data)
        if serializer.is_valid():
            response = threatstream_import_domains_without_approval(
                serializer.validated_data["domains"], ["DM_Test1", "DM_Test2"]
            )
            if response.status_code == 202:
                return Response(
                    {"message": "Domains successfully imported to Anomali Threatstream"},
                    status=status.HTTP_201_CREATED,
                )
            else:
                return Response(
                    {"error": "Failed to import domains to Anomali Threatstream"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
