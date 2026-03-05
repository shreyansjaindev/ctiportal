"""
Newly Registered Domain ViewSets (read-only).
"""
from rest_framework import serializers, status
from rest_framework.decorators import action
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from ..filters import NewlyRegisteredDomainFilter
from ..models import NewlyRegisteredDomain
from ..serializers import NewlyRegisteredDomainSerializer
from ..services.lookalikes import query_nrd_matches


class NRDMatchQuerySerializer(serializers.Serializer):
    value = serializers.CharField(max_length=255)
    resource_type = serializers.ChoiceField(choices=["domain", "keyword"])
    properties = serializers.ListField(
        child=serializers.CharField(max_length=64),
        required=False,
        default=list,
    )
    exclude_keywords = serializers.ListField(
        child=serializers.CharField(max_length=255),
        required=False,
        default=list,
    )
    lookalike_match_from = serializers.DateField(required=False, allow_null=True)
    lookalike_match_to = serializers.DateField(required=False, allow_null=True)
    since_from = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    since_to = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    limit = serializers.IntegerField(required=False, min_value=1, max_value=50000, default=5000)


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

    @action(detail=False, methods=["post"], url_path="query-matches")
    def query_matches(self, request):
        serializer = NRDMatchQuerySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        try:
            matches = query_nrd_matches(
                value=payload["value"],
                resource_type=payload["resource_type"],
                properties=payload.get("properties", []),
                exclude_keywords=payload.get("exclude_keywords", []),
                lookalike_match_from=payload.get("lookalike_match_from"),
                lookalike_match_to=payload.get("lookalike_match_to"),
                since_from=payload.get("since_from") or None,
                since_to=payload.get("since_to") or None,
                limit=payload.get("limit", 5000),
            )
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"count": len(matches), "items": matches}, status=status.HTTP_200_OK)
