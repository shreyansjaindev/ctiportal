"""
Reverse WHOIS Monitoring URL Configuration

Endpoints:
- /monitoring-terms/ - Create, list, retrieve, update, delete monitoring terms
"""
from django.urls import path, include
from rest_framework import routers

from .views import MonitoringTermViewSet

app_name = "reverse_whois_monitoring"

router = routers.DefaultRouter()
router.register(r"monitoring-terms", MonitoringTermViewSet, basename="monitoring-terms")

urlpatterns = [
    path("", include(router.urls)),
]
