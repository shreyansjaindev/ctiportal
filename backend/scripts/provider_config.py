"""
Unified provider metadata and function registry
Includes: provider info, presets, supported indicators, and function references

Frontend derives logo paths from provider IDs (convention: /assets/logos/{provider_id}.svg|png)
"""

# Import provider functions for registry
from .providers.ibm import ibm
from .providers.securitytrails import get_whois as whois
from .providers.nvd import nvd
from .providers.hybrid_analysis import hybridanalysis
from .providers.screenshotmachine import get_website_screenshot
from .providers.pulse_dive import pulse_dive
from .providers.virustotal import virustotal
from .providers.abuseipdb import abuseipdb
from .providers.apilayer import emailvalidator
from .providers.urlscan import urlscan
from .providers.website_status import get_website_status
from .providers.hostio import hostio
from .providers.phishtank import phishtank

# Import aggregator modules for lookup orchestration
from .aggregators import (
    whois as whois_aggregator,
    ip_info,
    reputation,
    cve_details,
    email_validator,
    web_status,
    passive_dns,
    whois_history,
    dns,
    reverse_dns,
    screenshot as screenshot_aggregator,
    subdomains,
)

# Blacklists feature removed: requires Selenium/Chrome for mxtoolbox scraping
# Use OSINT APIs instead for domain/IP reputation checks

# Map lookup types to their aggregator modules
LOOKUP_MODULES = {
    'whois': whois_aggregator,
    'ip_info': ip_info,
    'reputation': reputation,
    'dns': dns,
    'passive_dns': passive_dns,
    'whois_history': whois_history,
    'reverse_dns': reverse_dns,
    'screenshot': screenshot_aggregator,
    'email_validator': email_validator,
    'cve_details': cve_details,
    'website_status': web_status,
    'web_scan': web_status,
    'subdomains': subdomains,
}

# Map indicator types to applicable lookup types
INDICATOR_LOOKUPS = {
    'domain': ['whois', 'dns', 'passive_dns', 'subdomains', 'whois_history', 'screenshot', 'reputation', 'website_status', 'web_scan'],
    'url': ['website_status', 'web_scan', 'screenshot', 'reputation'],
    'ipv4': ['ip_info', 'reverse_dns', 'reputation', 'website_status', 'web_scan'],
    'ipv6': ['ip_info', 'reverse_dns', 'reputation'],
    'email': ['email_validator'],
    'cve': ['cve_details'],
    'md5': ['reputation'],
    'sha1': ['reputation'],
    'sha256': ['reputation'],
    'sha512': ['reputation'],
    'keyword': [],
}

# Function registry for engine.py (bulk collection)
# Maps source IDs to their functions and supported types
SOURCE_REGISTRY = {
    "ibm": {
        "title": "IBM X-Force",
        "function": ibm,
        "supported_types": ["domain", "url", "ipv4", "md5", "sha1", "sha256", "sha512", "cve"],
    },
    "whois": {
        "title": "WHOIS",
        "function": whois,
        "supported_types": ["domain", "url"],
    },
    "nvd": {
        "title": "NVD",
        "function": nvd,
        "supported_types": ["cve"],
    },
    "hybridanalysis": {
        "title": "Hybrid Analysis",
        "function": hybridanalysis,
        "supported_types": ["md5", "sha1", "sha256", "sha512"],
    },
    "screenshot": {
        "title": "Screenshot",
        "function": get_website_screenshot,
        "supported_types": ["domain", "url", "ipv4"],
    },
    "pulsedive": {
        "title": "Pulsedive",
        "function": pulse_dive,
        "supported_types": ["domain", "url", "ipv4"],
    },
    "virustotal": {
        "title": "VirusTotal",
        "function": virustotal,
        "supported_types": ["domain", "ipv4", "url", "md5", "sha1", "sha256", "sha512"],
    },
    "abuseipdb": {
        "title": "AbuseIPDB",
        "function": abuseipdb,
        "supported_types": ["ipv4"],
    },
    "emailvalidator": {
        "title": "Email Validator",
        "function": emailvalidator,
        "supported_types": ["email"],
    },
    "urlscan": {
        "title": "urlscan.io",
        "function": urlscan,
        "supported_types": ["domain", "url", "ipv4"],
    },
    "websitestatus": {
        "title": "HTTP Status",
        "function": get_website_status,
        "supported_types": ["domain", "url", "ipv4"],
    },
    "hostio": {
        "title": "host.io",
        "function": hostio,
        "supported_types": ["domain", "url"],
    },
    "phishtank": {
        "title": "PhishTank",
        "function": phishtank,
        "supported_types": ["domain", "url", "ipv4"],
    },
}

# Preset configurations
PROVIDER_PRESETS = {
    'basic': {
        'name': 'Basic',
        'description': 'Core built-in and low-friction providers for everyday lookups',
        'providers': {
            'whois': ['builtin_whois'],
            'dns': ['builtin_dns'],
            'ip_info': ['builtin_ipinfo'],
            'reverse_dns': ['builtin_dns'],
            'website_status': ['builtin_http'],
            'email_validator': ['builtin_smtp'],
            'cve_details': ['nvd'],
        }
    },
    'advanced': {
        'name': 'Advanced',
        'description': 'Broader lookup coverage with stronger enrichment providers',
        'providers': {
            'whois': ['builtin_whois'],
            'ip_info': ['builtin_ipinfo'],
            'reputation': ['virustotal'],
            'dns': ['builtin_dns'],
            'passive_dns': ['securitytrails'],
            'subdomains': ['virustotal'],
            'reverse_dns': ['builtin_dns'],
            'whois_history': ['whoisxml'],
            'cve_details': ['nvd'],
            'website_status': ['builtin_http'],
            'web_scan': ['urlscan'],
            'email_validator': ['builtin_smtp'],
        }
    },
    'full': {
        'name': 'Full',
        'description': 'Complete provider set for comprehensive intelligence',
        'providers': {
            'whois': ['builtin_whois', 'whoisxml', 'securitytrails'],
            'dns': ['builtin_dns'],
            'ip_info': ['builtin_ipinfo', 'ipapi'],
            'reputation': ['virustotal', 'abuseipdb'],
            'passive_dns': ['virustotal'],
            'subdomains': ['virustotal'],
            'whois_history': ['whoisxml'],
            'reverse_dns': ['builtin_dns'],
            'screenshot': ['screenshotlayer', 'screenshotmachine'],
            'email_validator': ['builtin_smtp', 'apilayer'],
            'cve_details': ['nvd'],
            'website_status': ['builtin_http', 'httpstatus'],
            'web_scan': ['urlscan'],
        }
    }
}

PROVIDER_METADATA = {
    # WHOIS Providers
    'whois': {
        'builtin_whois': {
            'id': 'builtin_whois',
            'name': 'Built-in WHOIS',
            'supported_indicators': ['domain'],
        },
        'whoisxml': {
            'id': 'whoisxml',
            'name': 'WhoisXML API',
            'supported_indicators': ['domain'],
        },
        'securitytrails': {
            'id': 'securitytrails',
            'name': 'SecurityTrails',
            'supported_indicators': ['domain'],
        }
    },
    
    # Passive DNS Providers
    # Order matches aggregator fallback order in passive_dns.py
    'passive_dns': {
        'securitytrails': {
            'id': 'securitytrails',
            'name': 'SecurityTrails',
            'supported_indicators': ['domain', 'ipv4', 'ipv6'],
        },
        'virustotal': {
            'id': 'virustotal',
            'name': 'VirusTotal',
            'supported_indicators': ['domain', 'ipv4', 'ipv6'],
        },
    },
    
    # Reputation Providers (IP, Domain, File Hash)
    'reputation': {
        'virustotal': {
            'id': 'virustotal',
            'name': 'VirusTotal',
            'supported_indicators': ['ipv4', 'ipv6', 'domain', 'hash'],
        },
        'abuseipdb': {
            'id': 'abuseipdb',
            'name': 'AbuseIPDB',
            'supported_indicators': ['ipv4', 'ipv6'],
        },
        'ibm_xforce': {
            'id': 'ibm_xforce',
            'name': 'IBM X-Force',
            'supported_indicators': ['ipv4', 'ipv6', 'domain', 'hash'],
        },
        'hybrid_analysis': {
            'id': 'hybrid_analysis',
            'name': 'Hybrid Analysis',
            'supported_indicators': ['hash'],
        }
    },
    
    # WHOIS History Providers
    'whois_history': {
        'whoisxml': {
            'id': 'whoisxml',
            'name': 'WhoisXML API',
            'supported_indicators': ['domain'],
        },
        'securitytrails': {
            'id': 'securitytrails',
            'name': 'SecurityTrails',
            'supported_indicators': ['domain'],
        }
    },
    
    # DNS Lookup Providers
    'dns': {
        'builtin_dns': {
            'id': 'builtin_dns',
            'name': 'Built-in DNS',
            'supported_indicators': ['domain'],
        },
        'cloudflare': {
            'id': 'cloudflare',
            'name': 'Cloudflare DNS',
            'supported_indicators': ['domain'],
        },
        'securitytrails': {
            'id': 'securitytrails',
            'name': 'SecurityTrails',
            'supported_indicators': ['domain'],
        },
        'api_ninjas': {
            'id': 'api_ninjas',
            'name': 'API Ninjas',
            'supported_indicators': ['domain'],
        }
    },
    
    # Reverse DNS Providers
    # Order matches aggregator fallback order in reverse_dns.py
    'reverse_dns': {
        'securitytrails': {
            'id': 'securitytrails',
            'name': 'SecurityTrails',
            'supported_indicators': ['ipv4', 'ipv6'],
        },
        'builtin_dns': {
            'id': 'builtin_dns',
            'name': 'Built-in DNS',
            'supported_indicators': ['ipv4', 'ipv6'],
        },
    },
    
    # IP Info Providers (Geolocation & ASN)
    'ip_info': {
        'builtin_ipinfo': {
            'id': 'builtin_ipinfo',
            'name': 'Built-in IP Info',
            'supported_indicators': ['ipv4', 'ipv6'],
        },
        'ipapi': {
            'id': 'ipapi',
            'name': 'IP-API',
            'supported_indicators': ['ipv4', 'ipv6'],
        },
        'ipinfoio': {
            'id': 'ipinfoio',
            'name': 'IPInfo.io',
            'supported_indicators': ['ipv4', 'ipv6'],
        },
        'whoisxml': {
            'id': 'whoisxml',
            'name': 'WhoisXML API',
            'supported_indicators': ['ipv4', 'ipv6'],
        },
    },

    # Screenshot Providers
    'screenshot': {
        'screenshotlayer': {
            'id': 'screenshotlayer',
            'name': 'ScreenshotLayer',
            'supported_indicators': ['domain', 'url'],
        },
        'screenshotmachine': {
            'id': 'screenshotmachine',
            'name': 'ScreenshotMachine',
            'supported_indicators': ['domain', 'url'],
        }
    },
    
    # Email Validator Providers
    # Order matches aggregator fallback order in email_validator.py
    'email_validator': {
        'apilayer': {
            'id': 'apilayer',
            'name': 'APILayer',
            'supported_indicators': ['email'],
        },
        'hunterio': {
            'id': 'hunterio',
            'name': 'Hunter.io',
            'supported_indicators': ['email'],
        },
        'whoisxml': {
            'id': 'whoisxml',
            'name': 'WhoisXML API',
            'supported_indicators': ['email'],
        },
        'builtin_smtp': {
            'id': 'builtin_smtp',
            'name': 'Built-in SMTP',
            'supported_indicators': ['email'],
        },
    },

    # Vulnerability Database Providers
    'cve_details': {
        'nvd': {
            'id': 'nvd',
            'name': 'NVD (NIST)',
            'supported_indicators': ['cve'],
        },
        'ibm_xforce': {
            'id': 'ibm_xforce',
            'name': 'IBM X-Force',
            'supported_indicators': ['cve'],
        },
    },
    
    # Website Status Providers
    'website_status': {
        'httpstatus': {
            'id': 'httpstatus',
            'name': 'HTTPStatus.io',
            'supported_indicators': ['domain', 'url'],
        },
        'builtin_http': {
            'id': 'builtin_http',
            'name': 'Built-in HTTP',
            'supported_indicators': ['domain', 'url'],
        }
    },
    # Web Scan Providers
    'web_scan': {
        'urlscan': {
            'id': 'urlscan',
            'name': 'URLScan.io',
            'supported_indicators': ['domain', 'url', 'ipv4'],
        },
    },

    # Subdomain Enumeration Providers
    'subdomains': {
        'virustotal': {
            'id': 'virustotal',
            'name': 'VirusTotal',
            'supported_indicators': ['domain'],
        },
        'securitytrails': {
            'id': 'securitytrails',
            'name': 'SecurityTrails',
            'supported_indicators': ['domain'],
        },
    }
}

def get_provider_info(category: str, provider_id: str) -> dict:
    """Get metadata for a specific provider"""
    return PROVIDER_METADATA.get(category, {}).get(provider_id, {})


def get_category_providers(category: str) -> dict:
    """Get all providers for a category"""
    return PROVIDER_METADATA.get(category, {})


def get_all_categories() -> list:
    """Get list of all provider categories"""
    return list(PROVIDER_METADATA.keys())


def get_presets() -> dict:
    """Get all preset configurations"""
    return PROVIDER_PRESETS.copy()


def get_preset(preset_name: str) -> dict | None:
    """Get a specific preset configuration"""
    return PROVIDER_PRESETS.get(preset_name)
