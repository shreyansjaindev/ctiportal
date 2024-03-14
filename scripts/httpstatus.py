import sys
import requests


def httpstatus(weburl, value_type="url"):
    data = []

    # Check Query Protocol
    if "http://" in weburl:
        query_protocol = "unsecure"
        weburl = weburl.replace("http://", "", 1)
    elif "https://" in weburl:
        query_protocol = "secure"
        weburl = weburl.replace("https://", "", 1)
    else:
        query_protocol = "no_protocol"

    url = f"https://api.redirect-checker.net/?url=https%3A%2F%2F{weburl}&timeout=10&maxhops=5&meta-refresh=1&format=json"
    try:
        response = requests.get(url)
        response_data = response.json()
        if response_data["result"] == "success":
            for item in response_data["data"]:
                if not item["request"]["error"]:
                    host = item["response"]["info"]["url"]
                    status_code = str(item["response"]["info"]["http_code"])
                    data.append([host, status_code])
            if data != []:
                return {"httpstatus": data}
    except Exception as e:
        print(e)

    url = f"https://api.redirect-checker.net/?url=http%3A%2F%2F{weburl}&timeout=10&maxhops=5&meta-refresh=1&format=json"
    try:
        response = requests.get(url)
        response_data = response.json()
        if response_data["result"] == "success":
            for item in response_data["data"]:
                if not item["request"]["error"]:
                    host = item["response"]["info"]["url"]
                    status_code = str(item["response"]["info"]["http_code"])
                    data.append([host, status_code])
            if data != []:
                return {"httpstatus": data}
    except Exception as e:
        print(e)

    return {"httpstatus": []}


def httpstatus_webfx(weburl):
    data = []

    url = "https://www.webfx.com/tools/http-status-tool/http-status.php"
    url_data = {
        "urls[]": [weburl],
    }

    response = requests.post(url, data=url_data)
    full_data = response.json()["response"]
    for url_data in full_data:
        for url in url_data:
            host = url["HTTPRequest"]["url"]
            status_code = url["HTTPCode"]["code"]
            data.append([host, status_code])

    return {"httpstatus": data}


if __name__ == "__main__":
    print(httpstatus(sys.argv[1]))
