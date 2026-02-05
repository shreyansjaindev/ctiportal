from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import views
from . import views_aggregators

urlpatterns = [
    # API Root
    path("", views.GetRoutes.as_view(), name="api-root"),
    
    # Version 1 API
    path("v1/", include([
        # Health Check
        path("health/", views.HealthView.as_view(), name="health"),
        
        # Authentication
        path("auth/", include([
            path("token/", TokenObtainPairView.as_view(), name="token-obtain"),
            path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
        ])),
        
        # Users
        path("users/", include([
            path("me/", views.UserMeView.as_view(), name="users-me"),
        ])),
        
        # Applications
        path("applications/", views.AppsView.as_view(), name="applications-list"),
        
        # Intelligence Resources
        path("intelligence/", include([
            path("sources/", views.IntelligenceSourcesView.as_view(), name="intelligence-sources-list"),
        ])),
        path("indicators/", include([
            path("detections/", views.IndicatorDetectView.as_view(), name="indicators-detections"),
        ])),
        
        # Domain Monitoring Resources
        path("domain-monitoring/", include([
            path("tabs/", views.DomainMonitoringTabsView.as_view(), name="domain-monitoring-tabs-list"),
            path("", include("domain_monitoring.urls")),
        ])),
        
        # Utility Tools
        path("tools/", include([
            path("text-formatting/", views.TextFormatterView.as_view(), name="tools-text-formatting"),
            path("mail-header-analysis/", views.MailHeaderAnalyzerView.as_view(), name="tools-mail-header-analysis"),
            path("screenshots/", views.ScreenshotView.as_view(), name="tools-screenshots"),
            path("active-directory/", views.ActiveDirectoryView.as_view(), name="tools-active-directory"),
            path("threatstream-exports/", views.ThreatstreamExportView.as_view(), name="tools-threatstream-exports"),
        ])),
        
        # Aggregated Lookups with Provider Support
        path("providers/", views_aggregators.AllProvidersView.as_view(), name="all-providers"),
        
        path("whois/", include([
            path("", views_aggregators.WhoisView.as_view(), name="whois-lookup"),
            path("providers/", views_aggregators.WhoisProvidersView.as_view(), name="whois-providers"),
        ])),
        
        path("geolocation/", include([
            path("", views_aggregators.GeolocationView.as_view(), name="geolocation-lookup"),
            path("providers/", views_aggregators.GeolocationProvidersView.as_view(), name="geolocation-providers"),
        ])),
        
        path("reputation/", include([
            path("ip/", views_aggregators.IPReputationView.as_view(), name="reputation-ip"),
            path("domain/", views_aggregators.DomainReputationView.as_view(), name="reputation-domain"),
            path("providers/", views_aggregators.ReputationProvidersView.as_view(), name="reputation-providers"),
        ])),

        path("vulnerability/", include([
            path("", views_aggregators.VulnerabilityView.as_view(), name="vulnerability-lookup"),
            path("providers/", views_aggregators.VulnerabilityProvidersView.as_view(), name="vulnerability-providers"),
        ])),
        
        # App-specific Resources
        path("intelligence-harvester/", include("intelligence_harvester.urls")),
    ])),
]
