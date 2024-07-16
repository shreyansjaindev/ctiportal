from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django_filters.rest_framework import DjangoFilterBackend
from .models import *
from .serializers import *
from .filters import *
from urllib.parse import parse_qs
from scripts.threatstream import threatstream_import_domains_without_approval


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
class WatchedResourceViewSet(viewsets.ModelViewSet):
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
        many = isinstance(request.data, list)

        serializer = self.get_serializer(data=request.data, many=many)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


# Monitored Domain Alerts
class MonitoredDomainAlertViewSet(viewsets.ModelViewSet):
    queryset = MonitoredDomainAlert.objects.all()
    serializer_class = MonitoredDomainAlertSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = MonitoredDomainAlertFilter
    permission_classes = [IsAuthenticated]


class MonitoredDomainAlertCommentViewSet(viewsets.ModelViewSet):
    queryset = MonitoredDomainAlertComment.objects.all()
    serializer_class = MonitoredDomainAlertCommentSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# Lookalike Domains
class LookalikeDomainViewSet(viewsets.ModelViewSet):
    queryset = LookalikeDomain.objects.all()
    serializer_class = LookalikeDomainSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = LookalikeDomainFilter
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        is_datatables_request = (
            "draw" in request.GET and "start" in request.GET and "length" in request.GET
        )

        if is_datatables_request:
            draw = int(request.GET.get("draw", 0))
            start = int(request.GET.get("start", 0))
            length = int(request.GET.get("length", 10))
            search_params = parse_qs(request.GET.urlencode())

            queryset = self.filter_queryset(self.get_queryset())

            for param, value in search_params.items():
                if param.startswith("search[") and param.endswith("]"):
                    field_name = param[7:-1]
                    if field_name != "regex":
                        filter_kwargs = {f"{field_name}__icontains": value[0]}
                        queryset = queryset.filter(**filter_kwargs)

            order_column_index = int(request.GET.get("order[0][column]", 0))
            order_direction = request.GET.get("order[0][dir]", "asc")

            # Determine ordering dynamically from the query parameters
            ordering_fields = [
                field
                for field in request.GET.getlist("columns[" + str(order_column_index) + "][data]")
            ]

            ordering = [ordering_fields[0]]  # Default to the first field

            if order_direction == "desc":
                ordering[0] = "-" + ordering[0]

            queryset = queryset.order_by(*ordering)

            total_records = queryset.count()
            filtered_records = total_records

            queryset = queryset[start : start + length]

            serializer = self.get_serializer(queryset, many=True)

            response_data = {
                "draw": draw,
                "recordsTotal": total_records,
                "recordsFiltered": filtered_records,
                "data": serializer.data,
            }

            return Response(response_data)
        else:
            return super().list(request, *args, **kwargs)


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
