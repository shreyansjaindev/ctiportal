"""
Reverse WHOIS monitoring endpoints for tracking domain ownership changes.

Allows users to monitor domains and track WHOIS record history and changes.
"""
import logging

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import MonitoringTerm
from .serializers import MonitoringTermSerializer

logger = logging.getLogger(__name__)


class MonitoringTermViewSet(viewsets.ModelViewSet):
    """
    Manage reverse WHOIS monitoring terms.
    
    Supports:
    - List, retrieve, create, update, delete monitoring terms
    - Track WHOIS record changes over time
    - Per-user monitoring with automatic assignment
    """
    serializer_class = MonitoringTermSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return only monitoring terms for the current user"""
        return MonitoringTerm.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        """Automatically assign the monitoring term to the current user"""
        serializer.save(user=self.request.user)

