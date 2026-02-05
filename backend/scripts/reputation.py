"""
IP/Domain reputation aggregator with multiple threat intelligence sources
"""
import logging
import os
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

try:
    from .providers.virustotal import ip as vt_ip, domain as vt_domain
    VT_AVAILABLE = True
except ImportError:
    VT_AVAILABLE = False
    logger.debug("VirusTotal not available")

try:
    from .providers.abuseipdb import abuseipdb
    ABUSEIPDB_AVAILABLE = True
except ImportError:
    ABUSEIPDB_AVAILABLE = False
    logger.debug("AbuseIPDB not available")

try:
    from .providers.ibm import ibm_ip, ibm_domain
    IBM_AVAILABLE = True
except ImportError:
    IBM_AVAILABLE = False
    logger.debug("IBM X-Force not available")

try:
    from .providers.hybrid_analysis import hybridanalysis
    HYBRID_ANALYSIS_AVAILABLE = True
except ImportError:
    HYBRID_ANALYSIS_AVAILABLE = False
    logger.debug("Hybrid Analysis not available")


def get_available_providers(resource_type: str = 'ip') -> List[str]:
    """Get available reputation providers for resource type"""
    providers = []
    
    if resource_type == 'ip':
        if VT_AVAILABLE:
            providers.append('virustotal')
        if ABUSEIPDB_AVAILABLE:
            providers.append('abuseipdb')
        if IBM_AVAILABLE:
            providers.append('ibm_xforce')
    elif resource_type == 'domain':
        if VT_AVAILABLE:
            providers.append('virustotal')
        if IBM_AVAILABLE:
            providers.append('ibm_xforce')
    elif resource_type in ['hash', 'md5', 'sha1', 'sha256', 'sha512']:
        if VT_AVAILABLE:
            providers.append('virustotal')
        if HYBRID_ANALYSIS_AVAILABLE:
            providers.append('hybrid_analysis')
    
    return providers


def _try_provider(provider_id, provider_func, available_flag, *args):
    """
    Helper to try a specific provider and add provider metadata.
    Returns result dict with _provider if successful, or error dict.
    """
    if not available_flag:
        return None
    
    result = provider_func(*args)
    if not result.get('error'):
        result['_provider'] = provider_id
    return result


def get_ip(ip: str, provider: Optional[str] = None, aggregate: bool = True) -> Dict[str, Any]:
    """
    Get IP reputation from multiple sources
    
    Args:
        ip: IP address to check
        provider: Specific provider to use
        aggregate: If True and no provider specified, combine all sources
    
    Returns:
        Reputation data with score (0-100) and risk level
    """
    # Provider-specific request
    if provider == 'virustotal':
        result = _try_provider('virustotal', _try_virustotal_ip, VT_AVAILABLE, ip)
        return result if result else {'error': 'Provider virustotal not available'}
    
    if provider == 'abuseipdb':
        result = _try_provider('abuseipdb', _try_abuseipdb, ABUSEIPDB_AVAILABLE, ip)
        return result if result else {'error': 'Provider abuseipdb not available'}
    
    if provider == 'ibm_xforce':
        result = _try_provider('ibm_xforce', _try_ibm_ip, IBM_AVAILABLE, ip)
        return result if result else {'error': 'Provider ibm_xforce not available'}
    
    if provider is not None:
        return {'error': f'Provider {provider} not available', 'available_providers': get_available_providers('ip')}
    
    # Aggregate from all providers
    if aggregate:
        return _aggregate_ip_reputation(ip)
    
    # Try first available
    for provider_id, func, flag in [('virustotal', _try_virustotal_ip, VT_AVAILABLE),
                                     ('abuseipdb', _try_abuseipdb, ABUSEIPDB_AVAILABLE)]:
        result = _try_provider(provider_id, func, flag, ip)
        if result and not result.get('error'):
            return result
    
    return {'error': 'No reputation providers available'}


def get_domain(domain: str, provider: Optional[str] = None) -> Dict[str, Any]:
    """Get domain reputation from providers"""
    # Provider-specific request
    if provider == 'virustotal':
        result = _try_provider('virustotal', _try_virustotal_domain, VT_AVAILABLE, domain)
        return result if result else {'error': 'Provider virustotal not available'}
    
    if provider == 'ibm_xforce':
        result = _try_provider('ibm_xforce', _try_ibm_domain, IBM_AVAILABLE, domain)
        return result if result else {'error': 'Provider ibm_xforce not available'}
    
    if provider is not None:
        return {'error': f'Provider {provider} not available', 'available_providers': get_available_providers('domain')}
    
    # Try first available
    result = _try_provider('virustotal', _try_virustotal_domain, VT_AVAILABLE, domain)
    return result if result and not result.get('error') else {'error': 'No reputation providers available'}


def get_hash(file_hash: str, provider: Optional[str] = None) -> Dict[str, Any]:
    """Get file hash reputation from providers"""
    # Provider-specific request
    if provider == 'virustotal':
        result = _try_provider('virustotal', _try_virustotal_hash, VT_AVAILABLE, file_hash)
        return result if result else {'error': 'Provider virustotal not available'}
    
    if provider == 'hybrid_analysis':
        result = _try_provider('hybrid_analysis', _try_hybrid_analysis, HYBRID_ANALYSIS_AVAILABLE, file_hash)
        return result if result else {'error': 'Provider hybrid_analysis not available'}
    
    if provider is not None:
        return {'error': f'Provider {provider} not available', 'available_providers': get_available_providers('hash')}
    
    # Try first available
    for provider_id, func, flag in [('virustotal', _try_virustotal_hash, VT_AVAILABLE),
                                     ('hybrid_analysis', _try_hybrid_analysis, HYBRID_ANALYSIS_AVAILABLE)]:
        result = _try_provider(provider_id, func, flag, file_hash)
        if result and not result.get('error'):
            return result
    
    return {'error': 'No file hash reputation providers available'}


def _aggregate_ip_reputation(ip: str) -> Dict[str, Any]:
    """Aggregate IP reputation from all sources"""
    results = {}
    score = 0
    max_score = 0
    
    # Try VirusTotal
    if VT_AVAILABLE:
        vt_data = _try_virustotal_ip(ip)
        if vt_data and not vt_data.get('error'):
            results['virustotal'] = vt_data
            # Calculate score from VT detections
            detections = vt_data.get('Detection', {})
            malicious = detections.get('malicious', 0)
            total = sum(detections.values()) if detections else 0
            if total > 0:
                score += (malicious / total) * 50
            max_score += 50
    
    # Try AbuseIPDB
    if ABUSEIPDB_AVAILABLE:
        abuse_data = _try_abuseipdb(ip)
        if abuse_data and not abuse_data.get('error'):
            results['abuseipdb'] = abuse_data
            confidence = abuse_data.get('abuseConfidenceScore', 0)
            score += (confidence / 100) * 50
            max_score += 50
    
    # Calculate final reputation score (0-100)
    final_score = int((score / max_score * 100)) if max_score > 0 else 0
    
    return {
        'ip': ip,
        'reputation_score': final_score,
        'risk_level': _get_risk_level(final_score),
        'sources': results,
        'source_count': len(results),
        '_provider': 'aggregated'
    }


def _get_risk_level(score: int) -> str:
    """Convert score to risk level"""
    if score >= 75:
        return 'critical'
    elif score >= 50:
        return 'high'
    elif score >= 25:
        return 'medium'
    elif score > 0:
        return 'low'
    else:
        return 'clean'


def _try_virustotal_ip(ip: str) -> Dict[str, Any]:
    """Try VirusTotal IP lookup"""
    try:
        api_keys = os.getenv("VIRUSTOTAL", "").split(",")
        if not api_keys or not api_keys[0].strip():
            return {'error': 'VirusTotal API key not configured'}
        
        headers = {"x-apikey": api_keys[0].strip()}
        return vt_ip(ip, headers)
    except Exception as e:
        logger.error(f"VirusTotal IP error: {e}")
        return {'error': str(e)}


def _try_virustotal_domain(domain: str) -> Dict[str, Any]:
    """Try VirusTotal domain lookup"""
    try:
        api_keys = os.getenv("VIRUSTOTAL", "").split(",")
        if not api_keys or not api_keys[0].strip():
            return {'error': 'VirusTotal API key not configured'}
        
        headers = {"x-apikey": api_keys[0].strip()}
        return vt_domain(domain, headers)
    except Exception as e:
        logger.error(f"VirusTotal domain error: {e}")
        return {'error': str(e)}


def _try_abuseipdb(ip: str) -> Dict[str, Any]:
    """Try AbuseIPDB lookup"""
    try:
        return abuseipdb(ip, 'ipv4')
    except Exception as e:
        logger.error(f"AbuseIPDB error: {e}")
        return {'error': str(e)}


def _try_ibm_ip(ip: str) -> Dict[str, Any]:
    """Try IBM X-Force IP lookup"""
    try:
        api_key = os.getenv("IBM_XFORCE", "").split(",")[0]
        if not api_key:
            return {'error': 'IBM X-Force API key not configured'}
        
        headers = {"Authorization": f"Basic {api_key}"}
        return ibm_ip(ip, headers)
    except Exception as e:
        logger.error(f"IBM X-Force IP error: {e}")
        return {'error': str(e)}


def _try_ibm_domain(domain: str) -> Dict[str, Any]:
    """Try IBM X-Force domain lookup"""
    try:
        api_key = os.getenv("IBM_XFORCE", "").split(",")[0]
        if not api_key:
            return {'error': 'IBM X-Force API key not configured'}
        
        headers = {"Authorization": f"Basic {api_key}"}
        return ibm_domain(domain, headers)
    except Exception as e:
        logger.error(f"IBM X-Force domain error: {e}")
        return {'error': str(e)}


def _try_virustotal_hash(file_hash: str) -> Dict[str, Any]:
    """Try VirusTotal file hash lookup"""
    try:
        from .providers.virustotal import file_hash as vt_hash
        
        api_keys = os.getenv("VIRUSTOTAL", "").split(",")
        if not api_keys or not api_keys[0].strip():
            return {'error': 'VirusTotal API key not configured'}
        
        headers = {"x-apikey": api_keys[0].strip()}
        return vt_hash(file_hash, headers)
    except Exception as e:
        logger.error(f"VirusTotal hash error: {e}")
        return {'error': str(e)}


def _try_hybrid_analysis(file_hash: str) -> Dict[str, Any]:
    """Try Hybrid Analysis hash lookup"""
    try:
        return hybridanalysis(file_hash, 'hash')
    except Exception as e:
        logger.error(f"Hybrid Analysis error: {e}")
        return {'error': str(e)}

