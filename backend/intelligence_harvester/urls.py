from django.urls import path, include
from rest_framework import routers
from .views import *

app_name = "intelligence_harvester"

router = routers.DefaultRouter()
router.register(r"sources", SourceViewSet, basename="sources")
router.register(r"identifier", IdentifierViewSet, basename="identifier")
router.register(r"search", IndicatorLookupViewSet, basename="search")

urlpatterns = [
    path("", include(router.urls)),
]
