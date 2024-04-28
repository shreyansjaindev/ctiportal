import requests
import sys
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("API_NINJAS")


def get_dns_records(query):
    headers = {"X-Api-Key": API_KEY}

    url = f"https://api.api-ninjas.com/v1/dnslookup?domain={query}"

    response = requests.get(url, headers=headers)
    records = response.json()

    dns_records = {"a": [], "mx": [], "spf": ""}

    for record in records:
        if record["record_type"] == "A":
            dns_records["a"].append(record["value"])
        elif record["record_type"] == "MX":
            dns_records["mx"].append(record["value"].rstrip("."))
        elif record["record_type"] == "TXT" and "v=spf" in record["value"]:
            dns_records["spf"] = record["value"]

    return dns_records


if __name__ == "__main__":
    query = sys.argv[1]
    print(get_dns_records(query))
