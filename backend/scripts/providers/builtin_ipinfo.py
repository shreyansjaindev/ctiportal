"""
Built-in IP info using ipwhois for ASN/network data.
No API key required.
"""
import logging
from ipwhois.net import Net
from ipwhois.asn import IPASN

logger = logging.getLogger(__name__)


def ip_to_asn(ip: str) -> dict:
    """
    Get ASN and network info for an IP using RDAP/whois.

    Args:
        ip: IP address to lookup

    Returns:
        Dictionary with ASN, prefix, description, and registry data
    """
    try:
        net = Net(ip)
        obj = IPASN(net)
        result = obj.lookup()

        normalized = {
            "ip": ip,
            **result,
        }

        return {key: value for key, value in normalized.items() if value not in (None, "")}
    except Exception as e:
        logger.error(f"ASN lookup error for {ip}: {e}")
        return {"error": str(e)}
