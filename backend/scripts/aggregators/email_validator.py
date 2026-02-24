"""
Email validation aggregator with multiple provider support
"""
import logging
from typing import Optional, Dict, Any, List
import re

logger = logging.getLogger(__name__)

# Import providers
from ..providers.apilayer import emailvalidator as apilayer_validator

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
    elif provider == 'apilayer':
        result = _try_apilayer(email)
        if not result.get('error'):
            result['_provider'] = 'apilayer'
        return result
    elif provider is not None:
        return {
            'error': f'Provider {provider} not available'
        }
    
    # Auto-fallback chain
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


def _try_apilayer(email: str) -> Dict[str, Any]:
    """Try APILayer email validation"""
    return apilayer_validator(email, 'email')
