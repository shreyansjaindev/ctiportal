"""Domain Monitoring URL Configuration with Modern REST API Structure

Endpoints:
- /companies/ - Company management (CRUD, search)
- /company-domains/ - Company domain associations (CRUD, filter)
- /watched-resources/ - Monitored resources (IPs, domains, emails; CRUD, search)
- /monitored-domains/ - Active domain monitoring (CRUD, search, bulk ops)
  - /{id}/export-threatstream - Export single domain to Threatstream (POST, 202 Accepted)
  - /bulk-export-threatstream - Bulk export to Threatstream (POST, 202 Accepted)
  - /bulk-delete - Bulk delete domains (POST)
  - /bulk-patch - Bulk status update (PATCH)
- /monitored-domain-alerts/ - Domain monitoring alerts (CRUD, search)
  - /{id}/comments/ - Nested comments (GET/POST/PATCH/DELETE)
- /lookalike-domains/ - Lookalike domain detection (CRUD, search, bulk ops)
  - /{id}/comments/ - Nested comments (GET/POST/PATCH/DELETE)
- /newly-registered-domains/ - Newly registered domain tracking (read-only, search)
- /ssl-certificates/ - SSL/TLS certificate monitoring (CRUD, search)
- /integrations/trellix-etp/add-domains - Add domains to Trellix ETP (POST, 202 Accepted)
- /integrations/proofpoint/add-domains - Add domains to Proofpoint (POST, 200 OK)

Comment Operations:
- GET /{parent-id}/comments/ - List all comments
- POST /{parent-id}/comments/ - Create new comment with {"text": "..."}
- PATCH /{parent-id}/comments/ - Update comment with {"comment_id": id, "text": "..."}
- DELETE /{parent-id}/comments/ - Delete comment with {"comment_id": id}

Response Format:
- Success: HTTP status code + resource data
- Error: {"error": "description"} with appropriate status code
- Bulk operations: {"created": count, "failed": count, "errors": [...]}
- No Content (204): Empty body
- Pagination: {"count": total, "next": url, "previous": url, "items": [...]}
"""

from django.urls import path, include
from rest_framework import routers

from .views import (
    CompanyViewSet,
    CompanyDomainViewSet,
    WatchedResourceViewSet,
    MonitoredDomainViewSet,
    MonitoredDomainAlertViewSet,
    LookalikeDomainViewSet,
    NewlyRegisteredDomainViewSet,
    SSLCertificateViewSet,
    TrellixETPIntegrationViewSet,
    ProofpointIntegrationViewSet,
)

# Main router with resource endpoints
router = routers.DefaultRouter()
router.register(r"companies", CompanyViewSet, basename="companies")
router.register(r"company-domains", CompanyDomainViewSet, basename="company-domains")
router.register(r"watched-resources", WatchedResourceViewSet, basename="watched-resources")
router.register(r"monitored-domains", MonitoredDomainViewSet, basename="monitored-domains")
router.register(
    r"monitored-domain-alerts", MonitoredDomainAlertViewSet, basename="monitored-domain-alerts"
)
router.register(r"lookalike-domains", LookalikeDomainViewSet, basename="lookalike-domains")
router.register(r"ssl-certificates", SSLCertificateViewSet, basename="ssl-certificates")
router.register(
    r"newly-registered-domains", NewlyRegisteredDomainViewSet, basename="newly-registered-domains"
)

# Provider integrations
router.register(
    r"integrations/trellix-etp",
    TrellixETPIntegrationViewSet,
    basename="integrations-trellix-etp",
)
router.register(
    r"integrations/proofpoint",
    ProofpointIntegrationViewSet,
    basename="integrations-proofpoint",
)

urlpatterns = [
    path("", include(router.urls)),
]
