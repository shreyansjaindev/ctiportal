"""Helper functions for API operations."""
import logging

logger = logging.getLogger(__name__)


def check_api_key(api_key, service_name):
    """
    Validate API key and return error dict if not configured.
    
    Args:
        api_key: The API key to validate (can be string or None)
        service_name: Name of the service (e.g., "SecurityTrails", "Anomali")
    
    Returns:
        dict: Error dict with message if key is missing/empty, None if valid
        
    Example:
        >>> error = check_api_key(API_KEY, "SecurityTrails")
        >>> if error:
        >>>     return error
    """
    if not api_key:
        error_msg = f"{service_name} API key not configured"
        logger.error(error_msg)
        return {"error": error_msg}
    return None
