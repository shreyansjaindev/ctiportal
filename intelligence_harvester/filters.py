import django_filters
from .models import Source


class SourceFilter(django_filters.FilterSet):
    class Meta:
        model = Source
        fields = {"created": ["contains"], "value": ["exact"], "source": ["exact"]}
