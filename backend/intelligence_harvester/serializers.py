from rest_framework import serializers
from .models import Source


class IndicatorSerializer(serializers.Serializer):
    indicators = serializers.ListField(child=serializers.CharField())

    def to_internal_value(self, data):
        data["indicators"] = list(filter(None, data.get("indicators", [])))
        return super().to_internal_value(data)


class ItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    value = serializers.CharField()
    type = serializers.CharField()
    checklist = serializers.ListField(child=serializers.CharField())


class IndicatorLookupSerializer(serializers.Serializer):
    indicators = serializers.ListField(child=ItemSerializer())


class BatchIndicatorLookupSerializer(serializers.Serializer):
    """Serializer for batch indicator lookup requests."""
    indicators = serializers.ListField(child=serializers.CharField(), allow_empty=False)
    providers_by_type = serializers.DictField(
        child=serializers.ListField(child=serializers.CharField()),
        required=True,
    )


class SourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Source
        fields = "__all__"
