"""
CVE/vulnerability lookup aggregator
"""
import logging
from typing import Optional, Dict, Any

from ..providers.nvd import nvd as nvd_lookup
from ..providers.ibm import ibm_cve

logger = logging.getLogger(__name__)

PROVIDERS = {
    'nvd': nvd_lookup,
    'ibm_xforce': ibm_cve,
}


def get(cve: str, provider: Optional[str] = None) -> Dict[str, Any]:
    """
    Get CVE vulnerability information.

    Args:
        cve: CVE identifier (e.g., CVE-2021-44228)
        provider: Specific provider to use (None for auto-fallback). Options: 'nvd', 'ibm_xforce'
    """
    if provider is not None:
        if provider not in PROVIDERS:
            return {'error': f'Provider {provider} not available'}
        result = PROVIDERS[provider](cve)
        if not result.get('error'):
            result['_provider'] = provider
        return result

    for prov_id, func in PROVIDERS.items():
        result = func(cve)
        if result and not result.get('error'):
            result['_provider'] = prov_id
            return result

    return {'error': 'All CVE providers failed'}
