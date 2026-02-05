"""
Free IP geolocation using ip-api.com
No API key required - 45 requests/minute limit
"""
import logging
import requests

logger = logging.getLogger(__name__)


def get_geolocation(ip: str) -> dict:
    """
    Get IP geolocation using free ip-api.com service
    
    Args:
        ip: IP address to lookup
        
    Returns:
        Dictionary with geolocation data
    """
    url = f"http://ip-api.com/json/{ip}"
    
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        if data.get('status') == 'success':
            return {
                'ip': ip,
                'country': data.get('country'),
                'country_code': data.get('countryCode'),
                'region': data.get('regionName'),
                'region_code': data.get('region'),
                'city': data.get('city'),
                'zip_code': data.get('zip'),
                'latitude': data.get('lat'),
                'longitude': data.get('lon'),
                'timezone': data.get('timezone'),
                'isp': data.get('isp'),
                'organization': data.get('org'),
                'as_number': data.get('as'),
            }
        else:
            return {'error': data.get('message', 'Lookup failed')}
            
    except requests.RequestException as e:
        logger.error(f"IP geolocation error for {ip}: {e}")
        return {'error': str(e)}
    except Exception as e:
        logger.error(f"Unexpected error in IP geolocation: {e}")
        return {'error': str(e)}
