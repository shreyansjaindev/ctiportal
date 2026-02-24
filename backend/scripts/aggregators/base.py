"""
Base utilities for aggregators - common error handling and helpers
"""
import logging
from typing import Dict, Any, Callable

logger = logging.getLogger(__name__)


def call_provider(
    provider_name: str,
    provider_func: Callable,
    *args,
    **kwargs
) -> Dict[str, Any]:
    """
    Call a provider function with standardized error handling
    
    Args:
        provider_name: Name of the provider for logging
        provider_func: The provider function to call
        *args: Positional arguments to pass to the function
        **kwargs: Keyword arguments to pass to the function
    
    Returns:
        dict: Provider result or {'error': str} on failure
    """
    try:
        return provider_func(*args, **kwargs)
    except Exception as e:
        logger.error(f"{provider_name} failed: {e}")
        return {'error': str(e)}
