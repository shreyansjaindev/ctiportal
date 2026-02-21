"""
Watched resource ViewSets.
"""
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from ..filters import WatchedResourceFilter
from ..models import WatchedResource
from ..serializers import WatchedResourceSerializer


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
    ordering_fields = ["value", "resource_type", "status", "created"]
    search_fields = ["value", "resource_type"]
