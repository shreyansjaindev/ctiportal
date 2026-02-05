SOURCES = {
    "lookup": {
        "title": "Standard Lookup",
        "url": "",
        "supported_types": ["domain", "url", "ipv4"],
        "capabilities": ["dns"],
    },
    "ibm": {
        "title": "IBM X-Force Exchange",
        "url": "",
        "supported_types": [
            "domain",
            "url",
            "ipv4",
            "md5",
            "sha1",
            "sha256",
            "sha512",
            "cve",
        ],
        "capabilities": ["reputation", "vulnerability"],
    },
    "screenshot": {
        "title": "Website Screenshot",
        "url": "",
        "supported_types": ["domain", "url", "ipv4"],
        "capabilities": ["screenshot"],
    },
    "virustotal": {
        "title": "VirusTotal",
        "url": "",
        "supported_types": [
            "domain",
            "url",
            "ipv4",
            "md5",
            "sha1",
            "sha256",
            "sha512",
        ],
        "capabilities": ["reputation", "passive-dns"],
    },
    "hybridanalysis": {
        "title": "Hybrid Analysis",
        "url": "",
        "supported_types": ["md5", "sha1", "sha256", "sha512"],
        "capabilities": ["malware-analysis"],
    },
    "whois": {
        "title": "WHOIS",
        "url": "",
        "supported_types": ["domain", "url"],
        "capabilities": ["whois"],
    },
    "blacklists": {
        "title": "Blacklists",
        "url": "",
        "supported_types": ["domain", "ipv4"],
        "capabilities": ["blocklists"],
    },
    "urlscan": {
        "title": "urlscan.io",
        "url": "",
        "supported_types": ["domain", "url", "ipv4"],
        "capabilities": ["passive-dns"],
    },
    "hostio": {
        "title": "host.io",
        "url": "",
        "supported_types": ["domain", "url"],
        "capabilities": ["passive-dns"],
    },
    "phishtank": {
        "title": "PhishTank",
        "url": "",
        "supported_types": ["domain", "url", "ipv4"],
        "capabilities": ["blocklists"],
    },
    "websitestatus": {
        "title": "Website Status",
        "url": "",
        "supported_types": ["domain", "url", "ipv4"],
        "capabilities": ["availability"],
    },
    "abuseipdb": {
        "title": "AbuseIPDB",
        "url": "",
        "supported_types": ["ipv4"],
        "capabilities": ["blocklists"],
    },
    "emailvalidator": {
        "title": "Email Validator",
        "url": "",
        "supported_types": ["email"],
        "capabilities": ["email"],
    },
    "pulsedive": {
        "title": "Pulsedive",
        "url": "",
        "supported_types": ["domain", "url", "ipv4"],
        "capabilities": ["reputation"],
    },
    "nvd": {
        "title": "National Vulnerability Database (NVD)",
        "url": "",
        "supported_types": ["cve"],
        "capabilities": ["vulnerability"],
    },
}

ADDITIONAL_SOURCES = {
    "anomali": "Anomali ThreatStream",
    "alienvault": "AlienVault",
    "talos": "Talos Intelligence",
    "securitytrails": "SecurityTrails",
    "threatcrowd": "Threatcrowd",
    "spyse": "Spyse",
    "spur": "Spur",
    "ctlsearch": "Certificate Transparency Logs (CTL) Search",
}

APPS = [
    {
        "name": "Intelligence Harvester",
        "path": "/intelligence-harvester",
        "color": "label-primary",
        "icon": "world",
        "quick_link": True,
    },
    {
        "name": "Domain Monitoring",
        "path": "/domain-monitoring",
        "color": "label-dark",
        "icon": "activity-heartbeat",
        "quick_link": True,
    },
    {
        "name": "Text Formatter",
        "path": "/text-formatter",
        "color": "label-warning",
        "icon": "pencil",
        "quick_link": True,
    },
    {
        "name": "URL Decoder",
        "path": "/url-decoder",
        "color": "label-danger",
        "icon": "link",
    },
    {
        "name": "Website Screenshot",
        "path": "/screenshot",
        "color": "label-success",
        "icon": "screenshot",
    },
    {
        "name": "Mail Header Analyzer",
        "path": "/mail-header-analyzer",
        "color": "label-info",
        "icon": "mail",
    },
    {
        "name": "Anomali ThreatStream Search",
        "path": "/threatstream",
        "color": "light",
        "image": "",
    },
    {
        "name": "Microsoft Active Directory Validator",
        "path": "/active-directory",
        "color": "light",
        "image": "",
    },
]

DOMAIN_MONITORING_TABS = [
    {
        "id": "alerts",
        "label": "Alerts",
        "active": False,
        "badge_count": 0,
        "headers": [
            "",
            "Alert ID",
            "Alert Date",
            "Domain Name",
            "A Record",
            "MX Record",
            "SPF Record",
            "Website URL",
            "Website Status Code",
            "Subdomains",
            "Website Screenshot",
            "Website Certificate",
            "Status",
        ],
    },
    {
        "id": "lookalike-domains",
        "label": "Lookalike Domains",
        "active": True,
        "badge_count": 0,
        "headers": [
            "",
            "Source Date",
            "Date Added",
            "Domain Name",
            "Watched Resource",
            "Source",
            "Company",
            "Review Status",
            "Monitoring Status",
        ],
    },
    {
        "id": "monitored-domains",
        "label": "Monitored Domains",
        "active": False,
        "badge_count": 0,
        "headers": [
            "",
            "Date Added",
            "Last Checked",
            "Domain Name",
            "Company",
            "Status",
        ],
    },
    {
        "id": "resources",
        "label": "Watched Resources",
        "active": False,
        "badge_count": 0,
        "headers": [
            "",
            "Date Added",
            "Resource Value",
            "Resource Type",
            "Exclude Keywords",
            "Company",
            "Status",
            "",
        ],
    },
]

SECURITY_HEADERS = [
    "Received-SPF",
    "Authentication-Results",
    "DKIM-Signature",
    "ARC-Authentication-Results",
]

SUMMARY_HEADERS = [
    "Received",
    "Subject",
    "From",
    "To",
    "MessageID",
    "Date",
    "Cc",
    "ReturnPath",
]


# attr_dict = {
#         "value": ["exact", "startswith", "contains", "regex", "regexp"],
#         "ip": ["exact", "startswith", "contains"],
#         "type": ["exact"],
#         "itype": ["exact", "startswith", "contains", "regex", "regexp"],
#         "tags.name": ["exact", "startswith", "contains"],
#         "status": ["exact"],
#         "tlp": ["exact"],
#         "threat_type": ["exact"],
#         "source_reported_confidence": ["exact", "gt", "lt", "gte", "lte"],
#         "is_public": ["exact"],
#         "meta.severity": ["exact", "startswith", "contains"],
#     }

# values = {
#     "status": ["active", "inactive", "falsepos"],
#     "type": ["domain", "email", "ip", "hash", "string", "url"],
#     "is_public": ["true", "false"],
#     "meta.severity": ["low", "medium", "high", "very-high"],
# }
