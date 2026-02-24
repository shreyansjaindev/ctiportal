import requests
import logging

logger = logging.getLogger(__name__)


def dns_query(domain):
    """Cloudflare DNS over HTTPS lookup"""
    url = f"https://cloudflare-dns.com/dns-query?name={domain}&type=A"
    headers = {'accept': 'application/dns-json'}
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        logger.error(f"Cloudflare DNS lookup failed for {domain}: {e}")
        return {"error": str(e)}
