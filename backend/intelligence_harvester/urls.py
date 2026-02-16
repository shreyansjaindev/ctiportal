from django.urls import path, include
from rest_framework import routers

from .views import SourceViewSet, IdentifierViewSet, IndicatorLookupViewSet, AllProvidersView, IntelligenceSourcesView

app_name = "intelligence_harvester"

router = routers.DefaultRouter()
router.register(r"sources", SourceViewSet, basename="sources")
router.register(r"identifier", IdentifierViewSet, basename="identifier")
router.register(r"search", IndicatorLookupViewSet, basename="search")
router.register(r"providers", AllProvidersView, basename="providers")
router.register(r"metadata", IntelligenceSourcesView, basename="metadata")

urlpatterns = [
    path("", include(router.urls)),
]
