"""
Web Search aggregator for OSINT/Google dorking
"""
import logging
import os

logger = logging.getLogger(__name__)


def get_available_providers():
    """Returns list of available web search providers"""
    available = []
    
    # Google Search - check if googlesearch-python is installed
    try:
        import googlesearch
        available.append('google')
    except ImportError:
        pass
    
    return available


def get(query, provider=None, num_results=10):
    """
    Perform web search for a query
    
    Args:
        query: Search query
        provider: Specific provider to use (optional)
        num_results: Number of results to return (default 10)
    
    Returns:
        list: Search results with titles and URLs
    """
    available_providers = get_available_providers()
    
    if not available_providers:
        return {'error': 'No web search providers available'}
    
    # If specific provider requested
    if provider:
        if provider not in available_providers:
            return {'error': f'Provider {provider} not available'}
        
        if provider == 'google':
            return _try_google(query, num_results)
    
    # Try providers in order of preference
    if 'google' in available_providers:
        result = _try_google(query, num_results)
        if isinstance(result, list) or 'error' not in result:
            return result
    
    return {'error': 'All web search providers failed'}


def _try_google(query, num_results=10):
    """Perform Google search"""
    try:
        from .providers.google_search import google_search_results
        results = google_search_results(query)
        
        # Limit to num_results
        return results[:num_results]
    except Exception as e:
        logger.error(f"Google search failed: {e}")
        return {'error': str(e)}
