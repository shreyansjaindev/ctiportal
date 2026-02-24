"""
Free WHOIS lookup using python-whois library
No API key required
"""
import logging

logger = logging.getLogger(__name__)

import whois as python_whois


def get_whois(domain: str) -> dict:
    """
    Get WHOIS data using free python-whois library
    
    Args:
        domain: Domain name to lookup
        
    Returns:
        Dictionary with WHOIS data
    """
    try:
        w = python_whois.whois(domain)
        
        # Convert dates to strings
        creation_date = w.creation_date
        if isinstance(creation_date, list):
            creation_date = creation_date[0] if creation_date else None
        
        expiration_date = w.expiration_date
        if isinstance(expiration_date, list):
            expiration_date = expiration_date[0] if expiration_date else None
            
        updated_date = w.updated_date
        if isinstance(updated_date, list):
            updated_date = updated_date[0] if updated_date else None
        
        return {
            'domain_name': w.domain_name[0] if isinstance(w.domain_name, list) else w.domain_name,
            'registrar': w.registrar,
            'creation_date': str(creation_date) if creation_date else None,
            'expiration_date': str(expiration_date) if expiration_date else None,
            'updated_date': str(updated_date) if updated_date else None,
            'name_servers': w.name_servers,
            'status': w.status,
            'emails': w.emails,
            'registrant_name': w.name,
            'registrant_organization': w.org,
            'registrant_country': w.country,
        }
    except Exception as e:
        logger.error(f"Free WHOIS lookup error for {domain}: {e}")
        return {'error': str(e)}
