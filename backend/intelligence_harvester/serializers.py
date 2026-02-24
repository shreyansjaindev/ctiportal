from rest_framework import serializers


class IndicatorSerializer(serializers.Serializer):
    """Serializer for identifier endpoint - validates list of indicator strings"""
    indicators = serializers.ListField(child=serializers.CharField())

    def to_internal_value(self, data):
        data["indicators"] = list(filter(None, data.get("indicators", [])))
        return super().to_internal_value(data)


class BatchIndicatorLookupSerializer(serializers.Serializer):
    """Serializer for batch indicator lookup requests."""
    indicators = serializers.ListField(child=serializers.CharField(), allow_empty=False)
    providers_by_type = serializers.DictField(
        child=serializers.ListField(child=serializers.CharField()),
        required=True,
    )
