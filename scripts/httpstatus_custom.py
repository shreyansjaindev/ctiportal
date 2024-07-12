import requests
import sys


def httpstatus(query):
    status_dict = {}

    # Check Query Protocol
    if "http://" in query:
        query_protocol = "unsecure"
        query = query.replace("http://", "", 1)
    elif "https://" in query:
        query_protocol = "secure"
        query = query.replace("https://", "", 1)
    else:
        query_protocol = "no_protocol"

    # status_dict['protocol'] = query_protocol

    # HTTP Response
    response = requests.head("http://" + query, allow_redirects=True)
    status_dict["http"] = {
        "0": {
            "protocol": response.url.split(":")[0],
            "url": response.url,
            "status_code": response.status_code,
        }
    }
    redirects = response.history
    if redirects != []:
        count = 1
        for redirect in reversed(redirects):
            status_dict["http"][str(count)] = {
                "url": redirect.url,
                "status_code": redirect.status_code,
            }
            count += 1

    # HTTPS Response
    if (
        "https://" not in status_dict["http"]["0"]["url"]
        and query in status_dict["http"]["0"]["url"]
    ):
        response = requests.head("https://" + query, allow_redirects=True)
        status_dict["https"] = {
            "0": {
                "protocol": response.url.split(":")[0],
                "url": response.url,
                "status_code": response.status_code,
            }
        }
        redirects = response.history
        if redirects != []:
            count = 1
            for redirect in reversed(redirects):
                status_dict["https"][str(count)] = {
                    "url": redirect.url,
                    "status_code": redirect.status_code,
                }
                count += 1

    return status_dict


if __name__ == "__main__":
    try:
        print(httpstatus(sys.argv[1]))
    except Exception as e:
        print(e)
