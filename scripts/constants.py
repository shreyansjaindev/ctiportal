SOURCES = {
    "lookup": {
        "title": "Standard Lookup",
        "url": "frontend/assets/img/icons/misc/lookup.png",
        "supported_types": ["domain", "url", "ipv4"],
    },
    "ibm": {
        "title": "IBM X-Force Exchange",
        "url": "frontend/assets/img/icons/brands/ibm.png",
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
    },
    "screenshot": {
        "title": "Website Screenshot",
        "url": "frontend/assets/img/icons/misc/screenshot.png",
        "supported_types": ["domain", "url", "ipv4"],
    },
    "symantec": {
        "title": "Symantec Sitereview",
        "url": "frontend/assets/img/icons/brands/symantec.png",
        "supported_types": ["domain", "url", "ipv4"],
    },
    "virustotal": {
        "title": "VirusTotal",
        "url": "frontend/assets/img/icons/brands/virustotal.png",
        "supported_types": [
            "domain",
            "url",
            "ipv4",
            "md5",
            "sha1",
            "sha256",
            "sha512",
        ],
    },
    "hybridanalysis": {
        "title": "Hybrid Analysis",
        "url": "frontend/assets/img/icons/brands/hybridanalysis.png",
        "supported_types": ["md5", "sha1", "sha256", "sha512"],
    },
    "whois": {
        "title": "WHOIS",
        "url": "frontend/assets/img/icons/brands/whoisxmlapi.png",
        "supported_types": ["domain", "url"],
    },
    "blacklists": {
        "title": "Blacklists",
        "url": "frontend/assets/img/icons/misc/blacklists.png",
        "supported_types": ["domain", "ipv4"],
    },
    "urlscan": {
        "title": "urlscan.io",
        "url": "frontend/assets/img/icons/brands/urlscan.png",
        "supported_types": ["domain", "url", "ipv4"],
    },
    "hostio": {
        "title": "host.io",
        "url": "frontend/assets/img/icons/brands/hostio.png",
        "supported_types": ["domain", "url"],
    },
    "phishtank": {
        "title": "PhishTank",
        "url": "frontend/assets/img/icons/brands/phishtank.png",
        "supported_types": ["domain", "url", "ipv4"],
    },
    "httpstatus": {
        "title": "HTTP Status",
        "url": "frontend/assets/img/icons/brands/httpstatus.io.png",
        "supported_types": ["domain", "url", "ipv4"],
    },
    "abuseipdb": {
        "title": "AbuseIPDB",
        "url": "frontend/assets/img/icons/brands/abuseipdb.png",
        "supported_types": ["ipv4"],
    },
    "emailvalidator": {
        "title": "Email Validator",
        "url": "frontend/assets/img/icons/misc/emailvalidator.png",
        "supported_types": ["email"],
    },
    "pulsedive": {
        "title": "Pulsedive",
        "url": "frontend/assets/img/icons/brands/pulsedive.png",
        "supported_types": ["domain", "url", "ipv4"],
    },
    "nvd": {
        "title": "National Vulnerability Database (NVD)",
        "url": "frontend/assets/img/icons/brands/nvd.png",
        "supported_types": ["cve"],
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
        "url": "frontend-intelligenceharvester",
        "color": "label-primary",
        "icon": "world",
        "quick_link": True,
    },
    {
        "name": "Domain Monitoring",
        "url": "frontend-domainmonitoring",
        "color": "label-dark",
        "icon": "activity-heartbeat",
        "quick_link": True,
    },
    {
        "name": "Text Formatter",
        "url": "frontend-textformatter",
        "color": "label-warning",
        "icon": "pencil",
        "quick_link": True,
    },
    {
        "name": "URL Decoder",
        "url": "frontend-urldecoder",
        "color": "label-danger",
        "icon": "link",
    },
    {
        "name": "Website Screenshot",
        "url": "frontend-screenshot",
        "color": "label-success",
        "icon": "screenshot",
    },
    {
        "name": "Mail Header Analyzer",
        "url": "frontend-mha",
        "color": "label-info",
        "icon": "mail",
    },
    {
        "name": "Anomali ThreatStream Search",
        "url": "frontend-threatstream",
        "color": "light",
        "image": "frontend/assets/img/icons/brands/anomali.png",
    },
    {
        "name": "Microsoft Active Directory Validator",
        "url": "frontend-activedirectory",
        "color": "light",
        "image": "frontend/assets/img/icons/brands/microsoft.png",
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
