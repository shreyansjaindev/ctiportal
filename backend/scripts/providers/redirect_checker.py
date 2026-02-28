import sys

import requests


def redirect_checker(query):
    protocols = ["http", "https"]
    domain = query.split("://", 1)[-1]

    for protocol in protocols:
        endpoint_url = f"https://api.redirect-checker.net/?url={protocol}://{domain}&timeout=10&maxhops=5&meta-refresh=1&format=json"
        redirects_data = []
        try:
            response = requests.get(endpoint_url, timeout=15).json()
            if response.get("result") == "success":
                response_data = response["data"]
                for redirects in response_data:
                    if redirects["request"]["error"] is False:
                        data = redirects.get("response", {}).get("info", {})
                        redirects_data.append(
                            {
                                "url": data.get("url", ""),
                                "code": str(data.get("http_code", "")),
                            }
                        )
            return {
                "url": query,
                "redirects": redirects_data,
            }
        except requests.RequestException as exc:
            print(f"{query}: {exc}")

    return {"error": "No data returned"}


if __name__ == "__main__":
    print(redirect_checker(sys.argv[1]))
