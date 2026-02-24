"""
Unified provider metadata and function registry
Includes: provider info, presets, supported indicators, and function references

Frontend derives logo paths from provider IDs (convention: /assets/logos/{provider_id}.svg|png)
"""

# Import provider functions for registry
from .aggregators.lookup import lookup
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
    geolocation,
    reputation,
    cve_details,
    email_validator,
    web_status,
    passive_dns,
    whois_history,
    dns,
    reverse_dns,
    screenshot as screenshot_aggregator,
)

# Blacklists feature removed: requires Selenium/Chrome for mxtoolbox scraping
# Use OSINT APIs instead for domain/IP reputation checks

# Map lookup types to their aggregator modules
LOOKUP_MODULES = {
    'whois': whois_aggregator,
    'ip_info': geolocation,
    'reputation': reputation,
    'dns': dns,
    'passive_dns': passive_dns,
    'whois_history': whois_history,
    'reverse_dns': reverse_dns,
    'screenshot': screenshot_aggregator,
    'email_validator': email_validator,
    'cve_details': cve_details,
    'website_details': web_status,
}

# Map indicator types to applicable lookup types
INDICATOR_LOOKUPS = {
    'domain': ['whois', 'dns', 'passive_dns', 'whois_history', 'screenshot', 'reputation', 'website_details'],
    'url': ['website_details', 'screenshot', 'reputation'],
    'ipv4': ['ip_info', 'reverse_dns', 'reputation', 'website_details'],
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
    "lookup": {
        "title": "Standard Lookup",
        "function": lookup,
        "supported_types": ["domain", "url", "ipv4"],
    },
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
        'description': 'Essential providers for quick lookups',
        'providers': {
            'whois': ['free_whois'],
        }
    },
    'advanced': {
        'name': 'Advanced',
        'description': 'Expanded provider set for detailed analysis',
        'providers': {
            'whois': ['free_whois'],
            'ip_info': ['ipapi'],
            'reputation': ['virustotal'],
        }
    },
    'full': {
        'name': 'Full',
        'description': 'Complete provider set for comprehensive intelligence',
        'providers': {
            'whois': ['free_whois', 'whoisxml', 'securitytrails'],
            'dns': ['system_dns'],
            'ip_info': ['ipapi'],
            'reputation': ['virustotal', 'abuseipdb'],
            'passive_dns': ['virustotal'],
            'whois_history': ['whoisxml'],
            'reverse_dns': ['system_dns'],
            'screenshot': ['screenshotlayer', 'screenshotmachine'],
            'email_validator': ['apilayer'],
            'cve_details': ['nvd'],
            'website_details': ['httpstatus', 'urlscan'],
        }
    }
}

PROVIDER_METADATA = {
    # WHOIS Providers
    'whois': {
        'free_whois': {
            'id': 'free_whois',
            'name': 'Python WHOIS',
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
    'passive_dns': {
        'virustotal': {
            'id': 'virustotal',
            'name': 'VirusTotal',
            'supported_indicators': ['domain', 'ipv4', 'ipv6'],
        },
        'securitytrails': {
            'id': 'securitytrails',
            'name': 'SecurityTrails',
            'supported_indicators': ['domain', 'ipv4', 'ipv6'],
        }
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
            'supported_indicators': ['ipv4', 'ipv6', 'domain'],
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
        'system_dns': {
            'id': 'system_dns',
            'name': 'System DNS',
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
    'reverse_dns': {
        'system_dns': {
            'id': 'system_dns',
            'name': 'System DNS',
            'supported_indicators': ['ipv4', 'ipv6'],
        },
        'google_dns': {
            'id': 'google_dns',
            'name': 'Google DNS',
            'supported_indicators': ['ipv4', 'ipv6'],
        }
    },
    
    # IP Info Providers (Geolocation & ASN)
    'ip_info': {
        'ipapi': {
            'id': 'ipapi',
            'name': 'IP-API',
            'supported_indicators': ['ipv4', 'ipv6'],
        },
        'ipinfo': {
            'id': 'ipinfo',
            'name': 'IPInfo.io',
            'supported_indicators': ['ipv4', 'ipv6'],
        }
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
    'email_validator': {
        'apilayer': {
            'id': 'apilayer',
            'name': 'APILayer',
            'supported_indicators': ['email'],
        },
        'hunter': {
            'id': 'hunter',
            'name': 'Hunter.io',
            'supported_indicators': ['email'],
        }
    },
    
    # Vulnerability Database Providers
    'cve_details': {
        'nvd': {
            'id': 'nvd',
            'name': 'NVD (NIST)',
            'supported_indicators': ['cve'],
        },
        'vulners': {
            'id': 'vulners',
            'name': 'Vulners',
            'supported_indicators': ['cve'],
        }
    },
    
    # Website Details Providers
    'website_details': {
        'urlscan': {
            'id': 'urlscan',
            'name': 'URLScan.io',
            'supported_indicators': ['domain', 'url', 'ipv4'],
        },
        'httpstatus': {
            'id': 'httpstatus',
            'name': 'HTTPStatus.io',
            'supported_indicators': ['domain', 'url'],
        },
        'requests': {
            'id': 'requests',
            'name': 'HTTP Requests',
            'supported_indicators': ['domain', 'url'],
        }
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
