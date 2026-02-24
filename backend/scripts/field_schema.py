"""
Field categorization for Intelligence Harvester lookups.

Defines which fields are essential (shown in Overview) vs additional (shown in All Fields)
for each lookup type.
"""

import re
from typing import Dict, Any, List

# ESSENTIAL FIELDS - Single source of truth
# Define which fields are shown in Overview tab for each lookup type
ESSENTIAL_FIELDS: Dict[str, List[str]] = {
    "whois": [
        "domain",
        "domain_name",
        "registrar",
        "registrar_name",
        "created_date",
        "updated_date",
        "expires_date",
        "registrant_name",
        "registrant_organization",
        "registrant_email",
        "registrant_city",
        "registrant_state",
        "registrant_country",
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
    "cve_details": [
        "cve_id",
        "cvss_score",
        "severity",
        "published_date",
    ],
    "website_details": [
        "url",
        "domain",
        "ip",
        "status_code",
        "redirects",
        "scan_mode",
        "total_results",
        "results",
        "link",
        "asn_name",
        "asn",
    ],
    "screenshot": [
        "screenshot_url",
        "status",
    ],
}


def _normalize_field_name(field_name: str) -> str:
        """
        Normalize field name for matching across provider naming styles.

        Examples:
            - created_date, createdDate, Created-Date -> createddate
            - registrant_email, registrantEmail -> registrantemail
        """
        return re.sub(r"[^a-z0-9]", "", field_name.lower())


def categorize_fields(lookup_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Categorize fields into essential and additional based on ESSENTIAL_FIELDS schema.
    Case-insensitive field name comparison.
    
    Args:
        lookup_type: Type of lookup (whois, ip_info, etc.)
        data: Provider result data
        
    Returns:
        Dictionary with 'essential' and 'additional' keys
    """
    essential_field_names = ESSENTIAL_FIELDS.get(lookup_type, [])
    
    # Build normalized set for case/format-insensitive comparison
    essential_normalized = {_normalize_field_name(field) for field in essential_field_names}
    
    essential = {}
    additional = {}
    
    for key, value in data.items():
        # Skip metadata fields (those starting with _)
        if key.startswith("_"):
            continue
        
        # Case/format-insensitive comparison (snake_case / camelCase / kebab-case)
        if _normalize_field_name(key) in essential_normalized:
            essential[key] = value
        else:
            additional[key] = value
    
    return {
        "essential": essential,
        "additional": additional,
    }


