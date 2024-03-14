from django.urls import path, include
from . import views

urlpatterns = [
    path("", views.get_routes, name="api-routes"),
    path("frontend/", include("frontend.urls")),
    path("domain-monitoring/", include("domain_monitoring.urls")),
    path("intelligence-harvester/", include("intelligence_harvester.urls")),
]
