# Domain Monitoring API Reference for Frontend

**Base URL:** `/api/domain-monitoring/`  
**Authentication:** JWT Bearer Token  
**Error Format:** All errors return `{"error": "description"}` with appropriate HTTP status code

---

## Table of Contents
1. [Company Management](#company-management)
2. [Domain Management](#domain-management)
3. [Watched Resources](#watched-resources)
4. [Monitored Domains](#monitored-domains)
5. [Domain Alerts & Comments](#domain-alerts--comments)
6. [Lookalike Domains](#lookalike-domains)
7. [Newly Registered Domains](#newly-registered-domains)
8. [SSL Certificates](#ssl-certificates)
9. [External Integrations](#external-integrations)
10. [Pagination & Filtering](#pagination--filtering)
11. [Error Handling](#error-handling)

---

## COMPANY MANAGEMENT

### List Companies
```
GET /companies/
```
✅ **Response:** 200 OK  
✅ **Pagination:** Yes (limit/offset)  
✅ **Search:** By name, industry  
✅ **Filter:** By all fields  
✅ **Ordering:** name, created, updated

**Example Response:**
```json
{
  "count": 25,
  "next": "http://api/companies/?limit=50&offset=50",
  "previous": null,
  "items": [
    {
      "id": 1,
      "name": "Acme Corp",
      "industry": "Technology",
      "created": "2024-01-15T10:30:00Z",
      "updated": "2024-02-16T14:22:00Z"
    }
  ]
}
```

### Get Single Company
```
GET /companies/{id}/
```
✅ **Response:** 200 OK | 404 Not Found

### Create Company
```
POST /companies/
Content-Type: application/json

{
  "name": "New Company",
  "industry": "Finance"
}
```
✅ **Response:** 201 Created

### Update Company
```
PUT /companies/{id}/
PATCH /companies/{id}/
Content-Type: application/json

{
  "industry": "Updated Industry"
}
```
✅ **Response:** 200 OK

### Delete Company
```
DELETE /companies/{id}/
```
✅ **Response:** 204 No Content (empty body)

---

## DOMAIN MANAGEMENT

### List Company Domains
```
GET /company-domains/
```
✅ **Response:** 200 OK  
✅ **Pagination:** Yes  
✅ **Search:** By domain name  
✅ **Filter:** By company, status  
✅ **Ordering:** domain, created, updated

### Create Company Domain
```
POST /company-domains/
Content-Type: application/json

{
  "domain": "example.com",
  "company": "Acme Corp",
  "status": "active"
}
```
✅ **Response:** 201 Created

### Update Company Domain
```
PATCH /company-domains/{id}/
```
✅ **Response:** 200 OK

### Delete Company Domain
```
DELETE /company-domains/{id}/
```
✅ **Response:** 204 No Content

---

## WATCHED RESOURCES

### List Watched Resources
```
GET /watched-resources/
```
✅ **Response:** 200 OK  
✅ **Pagination:** Yes  
✅ **Search:** By value (IP, domain, email) and resource_type  
✅ **Filter:** By type, status  
✅ **Ordering:** value, created

**Resource Types:** `ip`, `domain`, `email`

**Example:**
```json
{
  "id": 1,
  "value": "192.168.1.1",
  "resource_type": "ip",
  "company": 1,
  "status": "active",
  "created": "2024-01-15T10:30:00Z"
}
```

---

## MONITORED DOMAINS

### List Monitored Domains
```
GET /monitored-domains/
```
✅ **Response:** 200 OK  
✅ **Pagination:** Yes  
✅ **Search:** By domain, status  
✅ **Filter:** By company, status, priority  
✅ **Ordering:** domain, created, updated

### Create Single Domain
```
POST /monitored-domains/
Content-Type: application/json

{
  "domain": "target.com",
  "company": "Acme Corp",
  "status": "active",
  "priority": "high"
}
```
✅ **Response:** 201 Created

### Bulk Create Domains
```
POST /monitored-domains/
Content-Type: application/json

[
  {"domain": "target1.com", "company": "Acme Corp", "status": "active"},
  {"domain": "target2.com", "company": "Acme Corp", "status": "active"}
]
```
✅ **Response:** 201 Created (all success) | 207 Multi-Status (partial success)

**207 Response Example:**
```json
{
  "created": 1,
  "failed": 1,
  "errors": [
    {
      "index": 1,
      "error": "Domain target2.com already exists"
    }
  ]
}
```

### Bulk Delete Domains
```
POST /monitored-domains/bulk-delete/
Content-Type: application/json

{
  "ids": [1, 2, 3]
}
```
✅ **Response:** 200 OK with `{"deleted": 3}`

### Bulk Update Status
```
PATCH /monitored-domains/bulk-patch/
Content-Type: application/json

{
  "ids": [1, 2, 3],
  "status": "inactive"
}
```
✅ **Response:** 200 OK with `{"updated": 3, "failed": 0, "errors": []}`

### Export Single Domain to Threatstream
```
POST /monitored-domains/{id}/export-threatstream/
Content-Type: application/json

{
  "tags": ["malware", "phishing"]
}
```
✅ **Response:** 202 Accepted  
**Body:** `{"domain": "target.com", "status": "queued"}`

### Bulk Export to Threatstream
```
POST /monitored-domains/bulk-export-threatstream/
Content-Type: application/json

{
  "domains": ["target.com", "target2.com"],
  "tags": ["malware"]
}
```
✅ **Response:** 202 Accepted  
**Body:** `{"domains_count": 2, "status": "queued"}`

---

## DOMAIN ALERTS & COMMENTS

### List Alerts
```
GET /monitored-domain-alerts/
```
✅ **Response:** 200 OK  
✅ **Pagination:** Yes  
✅ **Search:** By monitored_domain.domain, alert_type  
✅ **Ordering:** created, updated, severity

### Get Alert with Comments
```
GET /monitored-domain-alerts/{id}/
```
✅ **Response:** 200 OK

**Response includes nested comments:**
```json
{
  "id": 1,
  "monitored_domain": 5,
  "alert_type": "certificate_expiring",
  "severity": "high",
  "message": "SSL certificate expires in 30 days",
  "comments": [
    {
      "id": 1,
      "text": "Need to renew this",
      "username": "john_doe",
      "created": "2024-02-16T10:00:00Z"
    }
  ],
  "created": "2024-02-15T12:00:00Z"
}
```

### List Alert Comments
```
GET /monitored-domain-alerts/{id}/comments/
```
✅ **Response:** 200 OK (array of comment objects)

### Add Comment to Alert
```
POST /monitored-domain-alerts/{id}/comments/
Content-Type: application/json

{
  "text": "This domain looks suspicious"
}
```
✅ **Response:** 201 Created

**Response:**
```json
{
  "id": 2,
  "text": "This domain looks suspicious",
  "username": "john_doe",
  "created": "2024-02-16T14:22:00Z",
  "updated": "2024-02-16T14:22:00Z"
}
```

### Update Alert Comment
```
PATCH /monitored-domain-alerts/{id}/comments/
Content-Type: application/json

{
  "comment_id": 2,
  "text": "Updated comment text"
}
```
✅ **Response:** 200 OK  
⚠️ **Required:** `comment_id` in request body

### Delete Alert Comment
```
DELETE /monitored-domain-alerts/{id}/comments/
Content-Type: application/json

{
  "comment_id": 2
}
```
✅ **Response:** 204 No Content (empty body)  
⚠️ **Required:** `comment_id` in request body

---

## LOOKALIKE DOMAINS

### List Lookalike Domains
```
GET /lookalike-domains/
```
✅ **Response:** 200 OK  
✅ **Pagination:** Yes (limited to 5000 max)  
✅ **Search:** By domain, lookalike_domain  
✅ **Ordering:** created, similarity_score

⚠️ **Note:** Large result sets are limited to prevent memory issues

### Create Lookalike Domain
```
POST /lookalike-domains/
Content-Type: application/json

{
  "domain": "target.com",
  "lookalike_domain": "targer.com",
  "similarity_score": 95,
  "company": "Acme Corp"
}
```
✅ **Response:** 201 Created | 207 Multi-Status (bulk)

### Comment Operations (Same as Domain Alerts)
```
GET /lookalike-domains/{id}/comments/
POST /lookalike-domains/{id}/comments/
PATCH /lookalike-domains/{id}/comments/
DELETE /lookalike-domains/{id}/comments/
```

---

## NEWLY REGISTERED DOMAINS

### List Newly Registered Domains
```
GET /newly-registered-domains/
```
✅ **Response:** 200 OK (read-only)  
✅ **Pagination:** Yes  
✅ **Search:** By domain, registrar  
✅ **Ordering:** created, domain

⚠️ **Note:** This endpoint is read-only. Use monitored-domains for management.

---

## SSL CERTIFICATES

### List SSL Certificates
```
GET /ssl-certificates/
```
✅ **Response:** 200 OK  
✅ **Pagination:** Yes  
✅ **Search:** By domain, issuer, subject  
✅ **Ordering:** domain, expires  
✅ **Filter:** By expiration status, issuer

**Example:**
```json
{
  "id": 1,
  "domain": "example.com",
  "issuer": "Let's Encrypt",
  "subject": "CN=example.com",
  "expires": "2025-02-15T00:00:00Z",
  "is_expired": false,
  "days_to_expiry": 364
}
```

### Create/Update SSL Certificate
```
POST /ssl-certificates/
PATCH /ssl-certificates/{id}/
```
✅ **Response:** 201 Created | 200 OK

---

## EXTERNAL INTEGRATIONS

### Trellix ETP Integration

#### Add Domains to YARA Rule
```
POST /integrations/trellix-etp/add-domains/
Content-Type: application/json

{
  "domains": ["target.com", "target2.com"]
}
```
✅ **Response:** 202 Accepted  
**Body:** `{"domains_count": 2, "status": "queued"}`

**Error Response (400):**
```json
{
  "error": "Invalid domain format"
}
```

### Proofpoint Integration

#### Add Domains to Blocklist
```
POST /integrations/proofpoint/add-domains/
Content-Type: application/json

{
  "domains": ["target.com", "target2.com"]
}
```
✅ **Response:** 200 OK  
**Body:** Returns Proofpoint API response with added/skipped counts

**Example Success:**
```json
{
  "added": 2,
  "skipped": 0,
  "errors": []
}
```

---

## PAGINATION & FILTERING

### Pagination Parameters
All list endpoints support limit/offset pagination:

```
GET /monitored-domains/?limit=50&offset=100
```

**Default Page Size:** 5000 items  
**Response Format:**
```json
{
  "count": 1500,
  "next": "http://api/monitored-domains/?limit=50&offset=150",
  "previous": "http://api/monitored-domains/?limit=50&offset=50",
  "items": [...]
}
```

### Filtering
Use query parameters for filtering:

```
GET /monitored-domains/?company=1&status=active
GET /monitored-domain-alerts/?severity=high
GET /ssl-certificates/?expires__lt=2025-03-01
```

### Search
Use `search` parameter for full-text search on configured fields:

```
GET /companies/?search=acme
GET /monitored-domains/?search=target.com
```

### Ordering
Use `ordering` parameter to sort results:

```
GET /monitored-domains/?ordering=created
GET /monitored-domains/?ordering=-priority
```
(Prefix with `-` for descending order)

---

## ERROR HANDLING

### Standard Error Format
All errors return HTTP status code + error object:

```json
{
  "error": "Detailed error message describing what went wrong"
}
```

### Common HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| **200 OK** | Successful GET/PUT/PATCH | Updated resource |
| **201 Created** | Resource created | POST succeeded |
| **202 Accepted** | Async operation queued | Threatstream export |
| **204 No Content** | Successful DELETE | Deleted comment |
| **207 Multi-Status** | Partial success in bulk ops | Some items created, some failed |
| **400 Bad Request** | Invalid input | Missing required field |
| **401 Unauthorized** | Missing/invalid JWT token | Token expired |
| **404 Not Found** | Resource doesn't exist | Company ID 999 |
| **500 Server Error** | Unexpected error | Database connection failed |

### Example Error Responses

**Validation Error (400):**
```json
{
  "error": "Validation error",
  "errors": {
    "domain": ["This field is required."]
  }
}
```

**Not Found (404):**
```json
{
  "error": "Not found"
}
```

**Async Operation (202):**
```json
{
  "domains_count": 5,
  "status": "queued"
}
```

---

## AUTHENTICATION

All requests require JWT Bearer Token:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Token is obtained from login endpoint and included in Authorization header.

---

## KEY IMPLEMENTATION NOTES FOR FRONTEND

1. **Error Handling:** Always check for `error` key in response, not `detail`
2. **204 Responses:** No body to parse for DELETE operations
3. **202 Responses:** Async operations - implement polling or webhooks
4. **207 Responses:** Check `failed` count in bulk operations
5. **Comments:** Pass `comment_id` in request body for PATCH/DELETE
6. **Pagination:** Default page size is 5000, adjust `limit` parameter as needed
7. **Search:** Multiple fields supported, check ViewSet docstrings
8. **Bulk Operations:** Can accept single object or array, automatically handled

---

## RATE LIMITING
- Authenticated users: 1000 requests/hour
- Anonymous users: 100 requests/hour

---

**Last Updated:** February 16, 2026  
**API Version:** 1.0  
**Status:** Production Ready
