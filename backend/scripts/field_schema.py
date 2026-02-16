"""
Field categorization for Intelligence Harvester lookups.

CENTRALIZED schema defining essential fields by lookup type.
Optional provider-specific field mappings for normalizing different field names.

Single source of truth for what fields are essential vs additional.
"""

from typing import Dict, Any, List, Optional

# ESSENTIAL FIELDS - Single source of truth
# Define which fields are shown in Overview tab for each lookup type
ESSENTIAL_FIELDS: Dict[str, List[str]] = {
    "whois": [
        "registrar",
        "created_date",
        "expires_date",
        "status",
        "domain",
        "registrant_name",
    ],
    "ip_info": [
        "ip",
        "country",
        "city",
        "isp",
        "organization",
    ],
    "reputation": [
        "score",
        "risk_level",
        "is_malicious",
        "abuse_confidence_score",
        "threat_score",
    ],
    "dns": [
        "a",
        "aaaa",
        "mx",
        "ns",
    ],
    "passive_dns": [
        "first_seen",
        "last_seen",
        "ip",
        "record_type",
    ],
    "whois_history": [
        "total_records",
        "earliest_date",
        "latest_date",
    ],
    "reverse_dns": [
        "hostname",
        "ip",
    ],
    "email_validator": [
        "is_valid",
        "email",
        "is_disposable",
    ],
    "vulnerability": [
        "cve_id",
        "cvss_score",
        "severity",
        "published_date",
    ],
    "web_search": [
        "total_results",
    ],
    "website_status": [
        "status_code",
        "is_online",
        "response_time",
        "redirects",
    ],
    "screenshot": [
        "screenshot_url",
        "status",
    ],
}

# FIELD MAPPINGS - Optional provider-specific field normalizations
# Maps provider field names to standard field names
# Only include if a provider returns different field names
FIELD_MAPPINGS: Dict[str, Dict[str, Dict[str, str]]] = {
    "whois": {
        "securitytrails": {
            "createdDate": "created_date",
            "updatedDate": "updated_date",
            "expiresDate": "expires_date",
            "registrarName": "registrar",
            "domain": "domain",
            "status": "status",
            "registrant_name": "registrant_name",
            "registrant_organization": "registrant_organization",
            "registrant_email": "registrant_email",
            "registrant_country": "registrant_country",
            "registrant_city": "registrant_city",
            "registrant_state": "registrant_state",
        },
        "free_whois": {
            "creation_date": "created_date",
            "expiration_date": "expires_date",
            "domain_name": "domain",
            "updated_date": "updated_date",
        }
    },
    "ip_info": {
        "ipapi": {
            "query": "ip",
            "countryCode": "country_code",
            "country": "country",
            "regionName": "region",
            "city": "city",
            "zip": "postal",
            "as": "asn",
            "org": "organization",
            "isp": "isp",
        }
    }
}


def apply_mapping(data: Dict[str, Any], lookup_type: str, provider: Optional[str]) -> Dict[str, Any]:
    """
    Apply provider-specific field mappings to normalize field names.
    Case-insensitive field mapping.
    
    Args:
        data: Raw result from provider
        lookup_type: Type of lookup (whois, ip_info, etc.)
        provider: Provider name (optional, used for lookups in FIELD_MAPPINGS)
                 If None, will try to extract from data._provider
        
    Returns:
        Dictionary with normalized field names
    """
    # If no provider specified, try to get it from the result's _provider field
    if not provider:
        provider = data.get("_provider")
    
    # If still no provider or lookup type not in mappings, return data as-is
    if not provider or lookup_type not in FIELD_MAPPINGS:
        return data
    
    provider_mappings = FIELD_MAPPINGS[lookup_type].get(provider, {})
    if not provider_mappings:
        return data
    
    # Create case-insensitive mapping lookup
    mapping_lower = {k.lower(): v for k, v in provider_mappings.items()}
    
    # Apply the mapping with case-insensitive lookup
    normalized = {}
    for key, value in data.items():
        # Keep metadata fields (starting with _) unchanged
        if key.startswith("_"):
            normalized[key] = value
        else:
            # Case-insensitive field mapping
            normalized_key = mapping_lower.get(key.lower(), key)
            normalized[normalized_key] = value
    
    return normalized


def categorize_fields(lookup_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Categorize fields into essential and additional based on ESSENTIAL_FIELDS schema.
    Case-insensitive field name comparison.
    
    Args:
        lookup_type: Type of lookup (whois, ip_info, etc.)
        data: Result data (should already be normalized via apply_mapping if needed)
        
    Returns:
        Dictionary with 'essential' and 'additional' keys
    """
    essential_field_names = ESSENTIAL_FIELDS.get(lookup_type, [])
    
    # Create lowercase mapping for case-insensitive comparison
    essential_lowercase = {field.lower(): field for field in essential_field_names}
    
    essential = {}
    additional = {}
    
    for key, value in data.items():
        # Skip metadata fields (those starting with _)
        if key.startswith("_"):
            continue
        
        # Case-insensitive comparison
        if key.lower() in essential_lowercase:
            essential[key] = value
        else:
            additional[key] = value
    
    return {
        "essential": essential,
        "additional": additional,
    }


