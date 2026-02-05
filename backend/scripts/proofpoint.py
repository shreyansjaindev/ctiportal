import requests
import os
import concurrent.futures

org_name = os.getenv("ORG_NAME", "")


def proofpoint_generate_access_token():
    url = "https://auth.proofpoint.com/v1/token"
    client_id = os.getenv("PROOFPOINT_CLIENT_ID", "")
    client_secret = os.getenv("PROOFPOINT_CLIENT_SECRET", "")

    if not client_id or not client_secret:
        raise ValueError(
            "PROOFPOINT_CLIENT_ID and PROOFPOINT_CLIENT_SECRET must be set in environment variables."
        )

    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
    }

    data = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
    }

    response = requests.post(url, headers=headers, data=data)
    if response.status_code == 200:
        return response.json().get("access_token")
    else:
        raise Exception(
            f"Failed to generate access token: {response.status_code} - {response.text}"
        )


def proofpoint_add_domains(domains, access_token=None):
    cluster_id = os.getenv("PROOFPOINT_CLUSTER_ID", "")
    if not cluster_id:
        raise ValueError("PROOFPOINT_CLUSTER_ID must be set in environment variables.")

    if not access_token:
        access_token = proofpoint_generate_access_token()
    if not access_token:
        raise ValueError("Unable to generate access token.")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}",
    }

    url = f"https://threatprotection-api.proofpoint.com/api/v1/emailProtection/modules/spam/orgBlockList?clusterId={cluster_id}"

    def add_domain(domain):
        data = {
            "action": "add",
            "attribute": "$hfrom",
            "operator": "contain",
            "value": f"@{domain}",
            "comment": f"{org_name} " + "CTI Domain Monitoring",
        }
        response = requests.post(url, headers=headers, json=data)
        if response.status_code == 200:
            return {"status": "success", "message": f"{domain} added successfully."}
        elif response.status_code == 400:
            return {"status": "warning", "message": f"{domain} already exists in the block list."}
        else:
            return {
                "status": "error",
                "message": f"{domain} failed: {response.status_code} {response.text}",
            }

    results = []
    with concurrent.futures.ThreadPoolExecutor() as executor:
        futures = [executor.submit(add_domain, domain) for domain in domains]
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result())

    return results


if __name__ == "__main__":
    domains_to_add = ["worldpayxtradeen.com", "worldpayxtradien.com", "worldpaychannels.com"]
    print(proofpoint_add_domains(domains_to_add))
