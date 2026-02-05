import re
import sys
import ioc_fanger
import tldextract
from ioc_finder import find_iocs


def duplicates(query):
    return list(set(query))


def defang(query):
    defanged_query = ioc_fanger.defang(query)

    replacements = {"(at)": "[@]", "hXXp": "http", "hXXps": "https"}
    for old, new in replacements.items():
        defanged_query = defanged_query.replace(old, new)
    return defanged_query


def fang(query):
    return ioc_fanger.fang(query)


def uppercase(query):
    return query.upper()


def lowercase(query):
    return query.lower()


def domain(query):
    # Email Address
    if "@" in query:
        query = query.split("@")[1]

    extracted_domain = tldextract.extract(query).registered_domain

    return extracted_domain if extracted_domain else query


def extract_iocs(query):
    ioc_types = [
        "asns",
        "cves",
        "domains",
        "email_addresses",
        "ipv4_cidrs",
        "ipv4s",
        "ipv6s",
        "md5s",
        "sha1s",
        "sha256s",
        "sha512s",
        "urls",
    ]

    return find_iocs(
        query,
        parse_domain_from_url=False,
        parse_from_url_path=False,
        parse_domain_from_email_address=False,
        parse_address_from_cidr=False,
        parse_domain_name_from_xmpp_address=False,
        parse_urls_without_scheme=False,
        parse_imphashes=False,
        parse_authentihashes=False,
        included_ioc_types=ioc_types,
    )


def collector(query, operations):
    data = {}

    query_list = re.split(",|\n|;", query)

    # Filter Whitespaces
    query_list = list(filter(None, query_list))

    cleaned_data = []

    if "iocs" in operations:
        return extract_iocs(query)

    if "duplicates" in operations:
        cleaned_data = duplicates(cleaned_data)

    for value in query_list:
        temp = value
        if "fang" in operations:
            temp = fang(temp)
        if "domain" in operations:
            temp = domain(temp)
        if "defang" in operations:
            temp = fang(temp)
            temp = defang(temp)
        if "uppercase" in operations:
            temp = uppercase(temp)
        if "lowercase" in operations:
            temp = lowercase(temp)
        cleaned_data.append(temp)

    if "duplicates" in operations:
        cleaned_data = duplicates(cleaned_data)

    data["formatted_text"] = cleaned_data

    return data


if __name__ == "__main__":
    data = sys.argv[1]
    operations = sys.argv[2]
    operations = operations.split(",")
    print(collector(data, operations))
