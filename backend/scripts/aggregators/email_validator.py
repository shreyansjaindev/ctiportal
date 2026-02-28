"""
Email validation aggregator with multiple provider support
"""
import logging
import os
from typing import Optional, Dict, Any

from ..utils.api_helpers import check_api_key
from ..providers.apilayer import emailvalidator as apilayer_validator
from ..providers.builtin_smtp import smtp_validate
from ..providers.hunterio import verify_email as hunterio_verify
from ..providers.whoisxmlapi import emailverification as whoisxml_emailverification

logger = logging.getLogger(__name__)


def _whoisxml_emailverify(email: str) -> dict:
    """WhoisXML email verification with multi-key rotation."""
    api_keys_str = os.getenv("WHOISXMLAPI_DRS", "")
    error = check_api_key(api_keys_str, "WhoisXML")
    if error:
        return error
    for api_key in [k.strip() for k in api_keys_str.split(",") if k.strip()]:
        try:
            return whoisxml_emailverification(email, api_key)
        except Exception as e:
            logger.error(f"WhoisXML emailverification error with key: {e}")
    return {'error': 'WhoisXML email verification failed for all API keys'}


# Fallback order: APILayer → Hunterio → WhoisXML → Built-in SMTP
PROVIDERS = {
    'apilayer': apilayer_validator,
    'hunterio': hunterio_verify,
    'whoisxml': _whoisxml_emailverify,
    'builtin_smtp': smtp_validate,
}


def get(email: str, provider: Optional[str] = None) -> Dict[str, Any]:
    """
    Validate an email address.

    Args:
        email: Email address to validate
        provider: Specific provider to use (None for auto-fallback). Options: 'apilayer', 'hunterio', 'whoisxml', 'builtin_smtp'
    """
    if provider is not None:
        if provider not in PROVIDERS:
            return {'error': f'Provider {provider} not available'}
        result = PROVIDERS[provider](email)
        if not result.get('error'):
            result['_provider'] = provider
        return result

    for prov_id, func in PROVIDERS.items():
        result = func(email)
        if result and not result.get('error'):
            result['_provider'] = prov_id
            return result

    return {'error': 'All email validation providers failed'}
