import re
import sys
import ioc_fanger
import tldextract


def duplicates(query):
    return list(set(query))


def defang(query):
    return ioc_fanger.defang(query).replace("(at)", "[@]")


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


def collector(query, operations):
    data = {}

    query_list = re.split(",|\n|;", query)

    # Filter Whitespaces
    query_list = list(filter(None, query_list))

    cleaned_data = []

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

    data["formattedtext"] = cleaned_data

    return data


if __name__ == "__main__":
    data = sys.argv[1]
    operations = sys.argv[2]
    operations = operations.split(",")
    print(collector(data, operations))
