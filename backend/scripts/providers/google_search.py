from googlesearch import search
import sys
import requests
from bs4 import BeautifulSoup


def get_title(query):
    title = "Title is available for this webpage"
    try:
        response = requests.get(query)
        soup = BeautifulSoup(response.text, "html.parser")
        title_html = soup.find("title")
        if title_html != None:
            title = title_html.text.strip().replace("\n", " ")
    except:
        pass
    return title


def google_search_results(query):
    results_list = []
    for results in search(query):
        results_list.append([get_title(results), results])
    return results_list


if __name__ == "__main__":
    query = sys.argv[1]
    print(google_search_results(query))
