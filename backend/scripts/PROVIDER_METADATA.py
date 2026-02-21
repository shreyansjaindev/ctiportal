"""
Unified provider metadata and function registry
Includes: provider info, presets, supported indicators, and function references

Frontend derives logo paths from provider IDs (convention: /assets/logos/{provider_id}.svg|png)
"""

# Import provider functions for registry
import logging

logger = logging.getLogger(__name__)

# Import all provider functions
try:
    from .aggregators.lookup import lookup
except ImportError:
    logger.debug("lookup not available")
    lookup = None

try:
    from .providers.ibm import ibm
except ImportError:
    logger.debug("IBM X-Force not available")
    ibm = None

try:
    from .providers.securitytrails import get_whois as whois
except ImportError:
    logger.debug("SecurityTrails WHOIS not available")
    whois = None

try:
    from .providers.nvd import nvd
except ImportError:
    logger.debug("NVD not available")
    nvd = None

try:
    from .providers.hybrid_analysis import hybridanalysis
except ImportError:
    logger.debug("Hybrid Analysis not available")
    hybridanalysis = None

try:
    from .providers.screenshotmachine import get_website_screenshot
except ImportError:
    logger.debug("ScreenshotMachine not available")
    get_website_screenshot = None

try:
    from .providers.pulse_dive import pulse_dive
except ImportError:
    logger.debug("Pulsedive not available")
    pulse_dive = None

try:
    from .providers.virustotal import virustotal
except ImportError:
    logger.debug("VirusTotal not available")
    virustotal = None

try:
    from .providers.abuseipdb import abuseipdb
except ImportError:
    logger.debug("AbuseIPDB not available")
    abuseipdb = None

try:
    from .providers.apilayer import emailvalidator
except ImportError:
    logger.debug("APILayer Email Validator not available")
    emailvalidator = None

try:
    from .providers.urlscan import urlscan
except ImportError:
    logger.debug("URLScan not available")
    urlscan = None

try:
    from .providers.website_status import get_website_status
except ImportError:
    logger.debug("Website Status not available")
    get_website_status = None

try:
    from .providers.hostio import hostio
except ImportError:
    logger.debug("Host.io not available")
    hostio = None

try:
    from .providers.phishtank import phishtank
except ImportError:
    logger.debug("PhishTank not available")
    phishtank = None

# Blacklists feature removed: requires Selenium/Chrome for mxtoolbox scraping
# Use OSINT APIs instead for domain/IP reputation checks

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
            'screenshot': ['screenshotmachine'],
            'email_validator': ['apilayer'],
            'vulnerability': ['nvd'],
            'web_search': ['google'],
            'website_status': ['httpstatus'],
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
            'supported_indicators': ['domain', 'ip'],
        },
        'securitytrails': {
            'id': 'securitytrails',
            'name': 'SecurityTrails',
            'supported_indicators': ['domain', 'ip'],
        }
    },
    
    # Reputation Providers (IP, Domain, File Hash)
    'reputation': {
        'virustotal': {
            'id': 'virustotal',
            'name': 'VirusTotal',
            'supported_indicators': ['ip', 'domain', 'hash'],
        },
        'abuseipdb': {
            'id': 'abuseipdb',
            'name': 'AbuseIPDB',
            'supported_indicators': ['ip'],
        },
        'ibm_xforce': {
            'id': 'ibm_xforce',
            'name': 'IBM X-Force',
            'supported_indicators': ['ip', 'domain'],
        },
        'urlscan': {
            'id': 'urlscan',
            'name': 'URLScan.io',
            'supported_indicators': ['domain', 'url'],
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
            'supported_indicators': ['ip'],
        },
        'google_dns': {
            'id': 'google_dns',
            'name': 'Google DNS',
            'supported_indicators': ['ip'],
        }
    },
    
    # IP Info Providers (Geolocation & ASN)
    'ip_info': {
        'ipapi': {
            'id': 'ipapi',
            'name': 'IP-API',
            'supported_indicators': ['ip'],
        },
        'ipinfo': {
            'id': 'ipinfo',
            'name': 'IPInfo.io',
            'supported_indicators': ['ip'],
        }
    },
    
    # Screenshot Providers
    'screenshot': {
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
    'vulnerability': {
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
    
    # Web Search Providers
    'web_search': {
        'google': {
            'id': 'google',
            'name': 'Google',
            'supported_indicators': ['domain', 'keyword'],
        },
        'bing': {
            'id': 'bing',
            'name': 'Bing',
            'supported_indicators': ['domain', 'keyword'],
        }
    },
    
    # Website Status Providers
    'website_status': {
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
