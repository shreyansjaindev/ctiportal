import requests
import json
import os

# Replace with your InsightVM console URL and API key
BASE_URL = "https://us.api.insight.rapid7.com/vm/v4/integration/assets"
API_KEY = os.getenv("RAPID7", "").split(",")[0] if os.getenv("RAPID7") else ""

# Headers for authentication
HEADERS = {
    "X-Api-Key": API_KEY,
}


# Function to get the number of affected assets for a given CVE
def get_affected_assets_count(cve_id):
    # url = f"{BASE_URL}/vulnerabilities/{cve_id}/assets"
    print(BASE_URL)

    payload = {
        "asset": "last_scan_end > 2019-09-04T23:16:57.903Z",
        "vulnerability": "severity IN ['Critical', 'Severe']",
    }

    try:
        response = requests.post(BASE_URL, headers=HEADERS, json=json.dumps(payload))
        response.raise_for_status()  # Raise an error for bad responses
        data = response.json()
        print(data)

        affected_assets = data.get("asset_count", 0)
        print(f"Number of affected assets for {cve_id}: {affected_assets}")
        return affected_assets

    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")
    except Exception as err:
        print(f"An error occurred: {err}")


# Example usage
if __name__ == "__main__":
    # cve_id = input("Enter CVE ID (e.g., CVE-2024-12345): ")
    get_affected_assets_count("CVE-2025-21346")
