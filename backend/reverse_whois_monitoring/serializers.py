"""
Serializers for reverse WHOIS monitoring data.
"""
from rest_framework import serializers

from .models import MonitoringTerm


class MonitoringTermSerializer(serializers.ModelSerializer):
    """Serialize reverse WHOIS monitoring terms"""
    username = serializers.CharField(source="user.username", read_only=True)
    
    class Meta:
        model = MonitoringTerm
        fields = ["id", "search_query", "username", "created"]
        read_only_fields = ["username", "created"]
