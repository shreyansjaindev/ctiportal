from django.urls import path, include
from rest_framework import routers

from .views import IdentifierViewSet, IndicatorLookupViewSet, AllProvidersView

app_name = "intelligence_harvester"

router = routers.DefaultRouter()
router.register(r"identifier", IdentifierViewSet, basename="identifier")
router.register(r"search", IndicatorLookupViewSet, basename="search")
router.register(r"providers", AllProvidersView, basename="providers")

urlpatterns = [
    path("", include(router.urls)),
]
