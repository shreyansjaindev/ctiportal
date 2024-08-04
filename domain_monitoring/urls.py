from django.urls import path, include
from rest_framework import routers
from .views import *

router = routers.DefaultRouter()
router.register(r"companies", CompanyViewSet, basename="companies")
router.register(r"company-domains", CompanyDomainViewSet, basename="company-domains")
router.register(r"watched-resources", WatchedResourceViewSet, basename="watched-resources")
router.register(r"monitored-domains", MonitoredDomainViewSet, basename="monitored-domains")
router.register(
    r"monitored-domain-alerts", MonitoredDomainAlertViewSet, basename="monitored-domain-alerts"
)
router.register(r"lookalike-domains", LookalikeDomainViewSet, basename="lookalike-domains")
router.register(r"ssl-certificates", SslCertificateViewSet, basename="ssl-certificates")
router.register(
    r"newly-registered-domains", NewlyRegisteredDomainViewSet, basename="newly-registered-domains"
)

router.register(
    r"monitored-domain-alert-comments",
    MonitoredDomainAlertCommentViewSet,
    basename="monitored-domain-alert-comments",
)

router.register(
    r"lookalike-domain-comments",
    LookalikeDomainCommentViewSet,
    basename="lookalike-domain-comments",
)

router.register(
    r"anomali-threatstream-domain-import",
    AnomaliThreatstreamDomainImportViewSet,
    basename="anomali-threatstream-domain-import",
)

router.register(
    r"trellix-etp-domain-add", TrellixETPDomainAddViewSet, basename="trellix-etp-domain-add"
)


urlpatterns = [
    path("", include(router.urls)),
]
