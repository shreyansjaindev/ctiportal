"""
IP/Domain reputation aggregator with multiple threat intelligence sources
"""
from typing import Dict, Any, List, Optional

from ..providers.virustotal import ip_address as vt_ip, domain as vt_domain, file as vt_hash
from ..providers.abuseipdb import abuseipdb
from ..providers.ibm import ibm_ip, ibm_url
from ..providers.hybrid_analysis import hybridanalysis


def get_ip(ip: str, provider: Optional[str] = None) -> Dict[str, Any]:
    """
    Get IP reputation from multiple sources
    
    Args:
        ip: IP address to check
        provider: Specific provider to use
    
    Returns:
        Reputation data
    """
    # Provider-specific request
    if provider == 'virustotal':
        result = vt_ip(ip)
        if result and not result.get('error'):
            result['_provider'] = 'virustotal'
        return result if result else {'error': 'Provider virustotal not available'}
    
    if provider == 'abuseipdb':
        result = abuseipdb(ip, 'ipv4')
        if result and not result.get('error'):
            result['_provider'] = 'abuseipdb'
        return result if result else {'error': 'Provider abuseipdb not available'}
    
    if provider == 'ibm_xforce':
        result = ibm_ip(ip)
        if result and not result.get('error'):
            result['_provider'] = 'ibm_xforce'
        return result if result else {'error': 'Provider ibm_xforce not available'}
    
    if provider is not None:
        return {'error': f'Provider {provider} not available'}
    
    return {'error': 'No reputation providers available'}


def get_domain(domain: str, provider: Optional[str] = None) -> Dict[str, Any]:
    """Get domain reputation from providers"""
    # Provider-specific request
    if provider == 'virustotal':
        result = vt_domain(domain)
        if result and not result.get('error'):
            result['_provider'] = 'virustotal'
        return result if result else {'error': 'Provider virustotal not available'}
    
    if provider == 'ibm_xforce':
        result = ibm_url(domain)
        if result and not result.get('error'):
            result['_provider'] = 'ibm_xforce'
        return result if result else {'error': 'Provider ibm_xforce not available'}
    
    if provider is not None:
        return {'error': f'Provider {provider} not available'}
    
    return {'error': 'No reputation providers available'}


def get_hash(file_hash: str, provider: Optional[str] = None) -> Dict[str, Any]:
    """Get file hash reputation from providers"""
    # Provider-specific request
    if provider == 'virustotal':
        result = vt_hash(file_hash)
        if result and not result.get('error'):
            result['_provider'] = 'virustotal'
        return result if result else {'error': 'Provider virustotal not available'}
    
    if provider == 'hybrid_analysis':
        result = hybridanalysis(file_hash, 'hash')
        if result and not result.get('error'):
            result['_provider'] = 'hybrid_analysis'
        return result if result else {'error': 'Provider hybrid_analysis not available'}
    
    if provider is not None:
        return {'error': f'Provider {provider} not available'}
    
    return {'error': 'No file hash reputation providers available'}



