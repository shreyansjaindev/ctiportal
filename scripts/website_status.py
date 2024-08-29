import sys
import requests


def get_website_status(query):
    protocols = ["http", "https"]
    domain = query.split("://", 1)[-1]

    for protocol in protocols:
        endpoint_url = f"https://api.redirect-checker.net/?url={protocol}://{domain}&timeout=10&maxhops=5&meta-refresh=1&format=json"
        try:
            response = requests.get(endpoint_url).json()
            if response.get("result") == "success":
                response_data = response["data"][-1]
                if response_data["request"]["error"] == False:
                    data = response_data.get("response", {}).get("info", {})
                    return {
                        "url": data.get("url", ""),
                        "code": str(data.get("http_code", "")),
                    }
        except requests.RequestException as e:
            print(f"{query}: {e}")

    return {"url": "", "code": ""}


# def website_status_webfx(weburl):
#     data = []

#     url = "https://www.webfx.com/tools/http-status-tool/http-status.php"
#     url_data = {
#         "urls[]": [weburl],
#     }

#     response = requests.post(url, data=url_data)
#     full_data = response.json()["response"]
#     for url_data in full_data:
#         for url in url_data:
#             host = url["HTTPRequest"]["url"]
#             status_code = url["HTTPCode"]["code"]
#             data.append([host, status_code])

#     return {"website_status": data}


if __name__ == "__main__":
    print(get_website_status(sys.argv[1]))
