"""
Vulnerability lookup aggregator with multiple provider support
"""
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

# Import providers
from ..providers.nvd import nvd as nvd_lookup


def get(cve: str, provider: Optional[str] = None) -> Dict[str, Any]:
    """
    Get CVE vulnerability information
    
    Args:
        cve: CVE identifier (e.g., CVE-2021-44228)
        provider: Specific provider to use (None for auto-fallback)
                 Options: 'nvd', 'vulners'
        
    Returns:
        Vulnerability data dictionary with '_provider' key
    """
    # If specific provider requested
    if provider == 'nvd':
        result = _try_nvd(cve)
        if not result.get('error'):
            result['_provider'] = 'nvd'
        return result
    elif provider is not None:
        return {
            'error': f'Provider {provider} not available'
        }
    
    # Auto-fallback chain
    result = _try_nvd(cve)
    if result and not result.get('error'):
        result['_provider'] = 'nvd'
        return result
    
    return {'error': 'No vulnerability providers available'}


def _try_nvd(cve: str) -> Dict[str, Any]:
    """Try NVD lookup"""
    try:
        result = nvd_lookup(cve, 'cve')
        if not result:
            return {'error': 'No data found'}
        return result
    except Exception as e:
        logger.error(f"NVD lookup error: {e}")
        return {'error': str(e)}
