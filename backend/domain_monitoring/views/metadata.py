"""
Metadata ViewSets for domain monitoring.
"""
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from api.pagination import ItemsLimitOffsetPagination
from api.response import success
from scripts.constants import DOMAIN_MONITORING_TABS


class DomainMonitoringTabsView(viewsets.ViewSet):
    """List domain monitoring tabs with pagination"""
    permission_classes = [IsAuthenticated]
    pagination_class = ItemsLimitOffsetPagination

    def list(self, request):
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(DOMAIN_MONITORING_TABS, request, view=self)
        if page is not None:
            return paginator.get_paginated_response(page)
        return success(DOMAIN_MONITORING_TABS)
