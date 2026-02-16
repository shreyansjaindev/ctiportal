"""
API URL Configuration.

Includes:
- System endpoints: Health checks, authentication, user info, app metadata
- Utility endpoints: Text formatting, email analysis, screenshots, AD lookups, exports
"""
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    # System views
    HealthView,
    UserMeView,
    AppsView,
    # Utility views
    TextFormatterView,
    MailHeaderAnalyzerView,
    ScreenshotView,
    ActiveDirectoryView,
    ThreatstreamExportView,
)

urlpatterns = [
    # System Endpoints
    path("health/", HealthView.as_view(), name="health"),
    
    # Authentication
    path("auth/", include([
        path("token/", TokenObtainPairView.as_view(), name="token-obtain"),
        path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    ])),
    
    # Users
    path("users/", include([
        path("me/", UserMeView.as_view(), name="users-me"),
    ])),
    
    # Applications
    path("applications/", AppsView.as_view(), name="applications-list"),
    
    # Utility Tools
    path("tools/", include([
        path("text-formatting/", TextFormatterView.as_view(), name="tools-text-formatting"),
        path("mail-header-analysis/", MailHeaderAnalyzerView.as_view(), name="tools-mail-header-analysis"),
        path("screenshots/", ScreenshotView.as_view(), name="tools-screenshots"),
        path("active-directory/", ActiveDirectoryView.as_view(), name="tools-active-directory"),
        path("threatstream-exports/", ThreatstreamExportView.as_view(), name="tools-threatstream-exports"),
    ])),
    
    # App Routes
    path("domain-monitoring/", include("domain_monitoring.urls")),
    path("intelligence-harvester/", include("intelligence_harvester.urls")),
    path("reverse-whois-monitoring/", include("reverse_whois_monitoring.urls")),
]

