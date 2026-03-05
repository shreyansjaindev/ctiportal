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
    
    Supports list/retrieve with filtering by source date/source and domain search.
    """
    queryset = NewlyRegisteredDomain.objects.all()
    serializer_class = NewlyRegisteredDomainSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_class = NewlyRegisteredDomainFilter
    permission_classes = [IsAuthenticated]
    ordering_fields = ["created", "value", "source_date", "source"]
    search_fields = ["value"]
