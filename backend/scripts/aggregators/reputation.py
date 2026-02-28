"""
IP/Domain/hash reputation aggregator with multiple threat intelligence sources
"""
import logging
from typing import Dict, Any, Optional

from ..providers.virustotal import ip_address as vt_ip, domain as vt_domain, file as vt_hash
from ..providers.abuseipdb import abuseipdb
from ..providers.ibm import ibm_ip, ibm_url, ibm_hash
from ..providers.hybrid_analysis import hybridanalysis

logger = logging.getLogger(__name__)

IP_PROVIDERS = {
    'virustotal': vt_ip,
    'abuseipdb': abuseipdb,
    'ibm_xforce': ibm_ip,
}

DOMAIN_PROVIDERS = {
    'virustotal': vt_domain,
    'ibm_xforce': ibm_url,
}

HASH_PROVIDERS = {
    'virustotal': vt_hash,
    'hybrid_analysis': hybridanalysis,
    'ibm_xforce': ibm_hash,
}


def _dispatch(value: str, providers: dict, provider: Optional[str]) -> Dict[str, Any]:
    if provider is not None:
        if provider not in providers:
            return {'error': f'Provider {provider} not available'}
        result = providers[provider](value)
        if result and not result.get('error'):
            result['_provider'] = provider
        return result or {'error': f'Provider {provider} returned no data'}

    for prov_id, func in providers.items():
        result = func(value)
        if result and not result.get('error'):
            result['_provider'] = prov_id
            return result
    return {'error': 'All reputation providers failed'}


def get_ip(ip: str, provider: Optional[str] = None) -> Dict[str, Any]:
    """Get IP reputation. Options: 'virustotal', 'abuseipdb', 'ibm_xforce'"""
    return _dispatch(ip, IP_PROVIDERS, provider)


def get_domain(domain: str, provider: Optional[str] = None) -> Dict[str, Any]:
    """Get domain reputation. Options: 'virustotal', 'ibm_xforce'"""
    return _dispatch(domain, DOMAIN_PROVIDERS, provider)


def get_hash(file_hash: str, provider: Optional[str] = None) -> Dict[str, Any]:
    """Get file hash reputation. Options: 'virustotal', 'hybrid_analysis', 'ibm_xforce'"""
    return _dispatch(file_hash, HASH_PROVIDERS, provider)

