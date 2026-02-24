import os
import requests
import logging

logger = logging.getLogger(__name__)

API_KEY = os.getenv('APININJAS')


def dns_lookup(domain):
    """API Ninjas DNS lookup with API key validation"""
    if not API_KEY:
        return {"error": "No API Ninjas API key available"}
    
    url = f"https://api.api-ninjas.com/v1/dnslookup?domain={domain}"
    headers = {'X-Api-Key': API_KEY}
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        logger.error(f"API Ninjas DNS lookup failed for {domain}: {e}")
        return {"error": str(e)}
