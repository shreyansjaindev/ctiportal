from django.urls import path, include
from rest_framework import routers
from .views import *

router = routers.DefaultRouter()
router.register(
    r"sources",
    SourceViewSet,
    basename="sources",
)
router.register(
    r"identifier",
    IdentifierViewSet,
    basename="identifier",
)
router.register(
    r"search",
    SearchViewSet,
    basename="search",
)

urlpatterns = [
    path("", include(router.urls)),
]
