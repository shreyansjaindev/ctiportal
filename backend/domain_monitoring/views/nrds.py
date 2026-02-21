"""
Newly Registered Domain ViewSets (read-only).
"""
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from ..filters import NewlyRegisteredDomainFilter
from ..models import NewlyRegisteredDomain
from ..serializers import NewlyRegisteredDomainSerializer


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
    ordering_fields = ["created", "value"]
    search_fields = ["value"]
