from django.urls import path, include
from . import views

urlpatterns = [
    path("", views.GetRoutes.as_view(), name="api-routes"),
    path("intelligence-harvester/", include("intelligence_harvester.urls")),
    path("domain-monitoring/", include("domain_monitoring.urls")),
    path("frontend/", include("frontend.urls")),
]
