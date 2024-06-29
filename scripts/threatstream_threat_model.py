import requests

API_KEY = "shreyans.jain@fisglobal.com:6ad3328517afe4ae9a37928a5221dd629edb71e6"

HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"apikey {API_KEY}",
}

json_data = {
    'ids': [32063,32062]
}

response = requests.post(
    'https://api.threatstream.com/api/v1/actor/522791/attackpattern/bulk_add/',
    headers=HEADERS,
    json=json_data, verify=False
)
print(response.content)