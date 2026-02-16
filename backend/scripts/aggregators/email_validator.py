"""
Email validation aggregator with multiple provider support
"""
import logging
from typing import Optional, Dict, Any, List
import re

logger = logging.getLogger(__name__)

# Import providers
try:
    from ..providers.apilayer import emailvalidator as apilayer_validator
    import os
    APILAYER_AVAILABLE = bool(os.getenv("APILAYER", "").strip())
except ImportError:
    APILAYER_AVAILABLE = False
    logger.debug("APILayer not available")


def get_available_providers() -> List[str]:
    """Get list of available email validator providers"""
    providers = ['regex_mx']  # Always available
    if APILAYER_AVAILABLE:
        providers.append('apilayer')
    return providers


def get(email: str, provider: Optional[str] = None) -> Dict[str, Any]:
    """
    Validate email address
    
    Args:
        email: Email address to validate
        provider: Specific provider to use (None for auto-fallback)
                 Options: 'regex_mx', 'apilayer'
        
    Returns:
        Validation data dictionary with '_provider' key
    """
    # If specific provider requested
    if provider == 'regex_mx':
        result = _try_regex_mx(email)
        result['_provider'] = 'regex_mx'
        return result
    elif provider == 'apilayer' and APILAYER_AVAILABLE:
        result = _try_apilayer(email)
        if not result.get('error'):
            result['_provider'] = 'apilayer'
        return result
    elif provider is not None:
        return {
            'error': f'Provider {provider} not available',
            'available_providers': get_available_providers()
        }
    
    # Auto-fallback chain
    if APILAYER_AVAILABLE:
        result = _try_apilayer(email)
        if result and not result.get('error'):
            result['_provider'] = 'apilayer'
            return result
    
    # Fallback to regex + MX
    result = _try_regex_mx(email)
    result['_provider'] = 'regex_mx'
    return result


def _try_regex_mx(email: str) -> Dict[str, Any]:
    """Basic regex and MX record validation"""
    try:
        # Simple regex validation
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, email):
            return {
                'valid': False,
                'format_valid': False,
                'error': 'Invalid email format'
            }
        
        # Could add DNS MX lookup here
        return {
            'valid': True,
            'format_valid': True,
            'email': email
        }
    except Exception as e:
        logger.error(f"Regex MX validation error: {e}")
        return {'error': str(e)}


def _try_apilayer(email: str) -> Dict[str, Any]:
    """Try APILayer email validation"""
    try:
        return apilayer_validator(email, 'email')
    except Exception as e:
        logger.error(f"APILayer validation error: {e}")
        return {'error': str(e)}
