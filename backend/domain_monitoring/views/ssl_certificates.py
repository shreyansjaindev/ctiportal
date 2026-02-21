"""
SSL/TLS Certificate monitoring ViewSets.
"""
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from ..filters import SSLCertificateFilter
from ..models import SSLCertificate
from ..serializers import SSLCertificateSerializer


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
