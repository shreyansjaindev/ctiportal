from googlesearch import search
import sys


def google_search_results(query):
    """
    Perform Google search and return results.
    Returns URLs directly without scraping titles (more reliable).
    """
    results_list = []
    try:
        for result_url in search(query, num_results=10):
            results_list.append(result_url)
    except Exception as e:
        print(f"Error during Google search: {e}")
    
    return results_list


if __name__ == "__main__":
    query = sys.argv[1]
    print(google_search_results(query))
