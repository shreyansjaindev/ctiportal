"""
Company management ViewSets.
"""
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from ..filters import CompanyDomainFilter, CompanyFilter
from ..models import Company, CompanyDomain
from ..serializers import CompanyDomainSerializer, CompanySerializer


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
    ordering_fields = ["name", "created", "last_modified"]
    search_fields = ["name"]


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
    ordering_fields = ["value", "created", "last_modified"]
    search_fields = ["value"]
