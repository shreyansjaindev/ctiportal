import requests
import sys


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


if __name__ == "__main__":
    print(get_website_status(sys.argv[1]))

# def website_status_custom(query):
#     data = {}

#     # HTTP Response
#     try:
#         response = requests.head('http://' + query, allow_redirects=True)
#         data['http'] = {
#             '0': {'url': response.url, 'status_code': response.status_code}}
#         redirects = response.history
#         if redirects:
#             count = 1
#             for redirect in reversed(redirects):
#                 data['http'][str(count)] = {
#                     'url': redirect.url, 'status_code': redirect.status_code}
#                 count += 1
#     except:
#         pass

#     # HTTPS Response
#     try:
#         if 'https://' not in data['http']['0']['url'] and query in data['http']['0']['url']:
#             response = requests.head(
#                 'https://' + query, allow_redirects=True)
#             data['https'] = {
#                 '0': {'url': response.url, 'status_code': response.status_code}}
#             redirects = response.history
#             if redirects:
#                 count = 1
#                 for redirect in reversed(redirects):
#                     data['https'][str(count)] = {
#                         'url': redirect.url, 'status_code': redirect.status_code}
#                     count += 1

#     except:
#         pass

#     return data
