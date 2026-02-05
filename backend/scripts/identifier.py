import ioc_fanger
import re
import sys

REGEX = {
    "sha256": re.compile(r"\b[A-Fa-f0-9]{64}\b"),
    "sha1": re.compile(r"\b[A-Fa-f0-9]{40}\b"),
    "md5": re.compile(r"\b[A-Fa-f0-9]{32}\b"),
    "ipv4": re.compile(
        r"^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
    ),
    "ipv6": re.compile(r"^([a-f\d]{1,4}:){7}[a-f\d]{1,4}$"),
    "domain": re.compile(r"^(?!(https:\/\/|http:\/\/|www\.))([a-zA-Z0-9.-]+\.([a-zA-Z]{2,})+)$"),
    "email": re.compile(
        r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"
    ),
    "url": re.compile(
        r"http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\(\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+"
    ),
    "url_with_http": re.compile(
        r"^((https:\/\/|http:\/\/|www\.))(((([a-zA-Z0-9])|([a-zA-Z0-9][a-zA-Z0-9\-]{0,86}[a-zA-Z0-9]))\.(([a-zA-Z0-9])|([a-zA-Z0-9][a-zA-Z0-9\-]{0,73}[a-zA-Z0-9]))\.(([a-zA-Z0-9]{2,12}\.[a-zA-Z0-9]{2,12})|([a-zA-Z0-9]{2,25})))|((([a-zA-Z0-9])|([a-zA-Z0-9][a-zA-Z0-9\-]{0,162}[a-zA-Z0-9]))\.(([a-zA-Z0-9]{2,12}\.[a-zA-Z0-9]{2,12})|([a-zA-Z0-9]{2,25})))).*$"
    ),
    "url_without_http": re.compile(
        r"^(((([a-zA-Z0-9])|([a-zA-Z0-9][a-zA-Z0-9\-]{0,86}[a-zA-Z0-9]))\.(([a-zA-Z0-9])|([a-zA-Z0-9][a-zA-Z0-9\-]{0,73}[a-zA-Z0-9]))\.(([a-zA-Z0-9]{2,12}\.[a-zA-Z0-9]{2,12})|([a-zA-Z0-9]{2,25})))|((([a-zA-Z0-9])|([a-zA-Z0-9][a-zA-Z0-9\-]{0,162}[a-zA-Z0-9]))\.(([a-zA-Z0-9]{2,12}\.[a-zA-Z0-9]{2,12})|([a-zA-Z0-9]{2,25})))).*$"
    ),
    "cve": re.compile(r"(CVE|cve)-\d{4}-\d{4,7}"),
}


def get_indicator_list(query: str):
    return re.split(" +|,|\r?\n|;", query)


def get_indicator_type(query_list: list):
    result = []
    for query in query_list:
        query = query.strip()

        # IOC Fang
        query = ioc_fanger.fang(query)

        query_type = "keyword"

        for key, value in REGEX.items():
            if re.search(value, query):
                query_type = key
                break

        result.append({"value": query, "type": query_type})
    return result


if __name__ == "__main__":
    query = sys.argv[1]
    print(list(get_indicator_type(get_indicator_list(query))))
