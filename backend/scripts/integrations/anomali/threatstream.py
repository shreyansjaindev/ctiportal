import requests
import pandas as pd
from io import StringIO
import concurrent.futures
import os
import json
from ...utils.api_helpers import check_api_key

API_URL = "https://api.threatstream.com/api/v2/intelligence/"

API_KEY = os.getenv("ANOMALI", "").split(",")[0]

HEADERS = {
    "Authorization": f"apikey {API_KEY}",
}


def format_data(data, keys):
    result = []

    for row in data:
        row_list = []
        for key in keys:
            row_list.append(row.get(key))

        tags = row.get("tags")
        if tags:
            tag_names = []

            for v in tags:
                tag_names.append(v.get("name"))

        row_list.append("|".join(tag_names))
        result.append(row_list)
    return result


def request(session, all_count, value):
    temp_data = []
    error = check_api_key(API_KEY, "Anomali")
    if error:
        return error

    keys = [
        "status",
        "itype",
        "created_ts",
        "modified_ts",
        "expiration_ts",
        "value",
        "threat_type",
        "confidence",
        "source",
    ]

    params = (("limit", "0"), ("value", value))
    response = session.get(API_URL, headers=HEADERS, params=params)
    data = response.json()
    total_count = data.get("meta", {}).get("total_count")
    data = data.get("objects", {})
    if total_count > all_count:
        temp_data = format_data(data, keys)
    return temp_data


def threatstream_export_iocs(filters, update_id):
    error = check_api_key(API_KEY, "Anomali")
    if error:
        return error

    data_list = []

    keys = [
        "status",
        "itype",
        "expiration_ts",
        "value",
        "threat_type",
        "confidence",
        "source",
    ]

    params = {
        "limit": "0",
        "update_id__gt": update_id,
        "order_by": "update_id",
    }
    params.update(filters)

    response = requests.get(API_URL, headers=HEADERS, params=params)
    data = response.json()
    total_count = data.get("meta").get("total_count")

    if total_count > 0:
        update_id = data.get("objects")[-1].get("update_id")
        data = data.get("objects")
        data_list = format_data(data, keys)
    else:
        return {"No Results": "No Results Found"}

    return {"total_count": total_count, "update_id": update_id, "data": data_list}


def threatstream_export(filters):
    error = check_api_key(API_KEY, "Anomali")
    if error:
        return error

    total_count = 1001
    update_id = 0
    data = [
        [
            "status",
            "itype",
            "expiration_ts",
            "value",
            "threat_type",
            "confidence",
            "source",
            "tags",
        ]
    ]

    while total_count > 1000:
        response = threatstream_export_iocs(filters, update_id)
        if response is None:
            break

        total_count = response.get("total_count")
        update_id = response.get("update_id")
        data += response.get("data")

    return {"total_count": total_count, "data": data}


def threatstream_export_feeds(csv_file, is_exclude=False, update_id=0):
    error = check_api_key(API_KEY, "Anomali")
    if error:
        return error

    all_count = 1 if is_exclude else 0

    # Check if source file has correct format
    col_list = ["value"]
    try:
        data = pd.read_csv(StringIO(csv_file), usecols=col_list)
        if "value" not in data.columns:
            return {"error": 'Source File must have a column named "value"'}
    except Exception as e:
        return {"error": "Error occurred while reading CSV"}

    # Header
    data_list = [
        [
            "status",
            "itype",
            "created_ts",
            "modified_ts",
            "expiration_ts",
            "value",
            "threat_type",
            "confidence",
            "source",
            "tags",
        ]
    ]

    with requests.Session() as session:
        with concurrent.futures.ThreadPoolExecutor(max_workers=100) as executor:
            futures = [
                executor.submit(request, session, all_count, value) for value in data["value"]
            ]
            for future in concurrent.futures.as_completed(futures):
                try:
                    result = future.result()
                    data_list.extend(result)

                except Exception as e:
                    print(f"Error occurred: {e}")
    return {"data": data_list}


def threatstream_import_indicators(
    datatext,
    tags,
    classification="private",
    threat_type="suspicious",
    confidence=50,
    default_state="inactive",
    source_confidence_weight=40,
):
    error = check_api_key(API_KEY, "Anomali")
    if error:
        return error

    tags = [{"name": tag} for tag in tags]

    payload = {
        "classification": classification,
        "threat_type": threat_type,
        "tags": json.dumps(tags),
        "confidence": confidence,
        "datatext": datatext,
        "default_state": default_state,
        "source_confidence_weight": source_confidence_weight,
    }

    response = requests.post(f"{API_URL}import/", headers=HEADERS, data=payload)
    return response.json()


# def threatstream_import_domains_without_approval(
#     domains,
#     tags,
#     classification="private",
#     confidence=50,
#     allow_unresolved=True,
#     expiration_ts="9999-12-31T00:00:00",
# ):
#     if not API_KEY:
#         return {"error": "API key not found"}

#     tags = [{"name": tag} for tag in tags]

#     payload = {
#         "meta": {
#             "classification": classification,
#             "confidence": confidence,
#             "allow_unresolved": allow_unresolved,
#             "expiration_ts": expiration_ts,
#         },
#         "objects": [],
#     }

#     for domain in domains:
#         payload["objects"].append(
#             {
#                 "domain": domain,
#                 "itype": "phish_domain",
#                 "tags": tags,
#             }
#         )

#     response = requests.patch(API_URL, headers=HEADERS, data=json.dumps(payload))
#     return response


def threatstream_import_domains_without_approval(
    domains,
    tags,
    classification="private",
    confidence=50,
    expiration_ts="9999-12-31T00:00:00",
):
    error = check_api_key(API_KEY, "Anomali")
    if error:
        response = requests.models.Response()
        response.status_code = 401
        response._content = json.dumps(error).encode('utf-8')
        response.headers["Content-Type"] = "application/json"
        return response

    tags = [{"name": tag} for tag in tags]

    payload = {
        "classification": classification,
        "confidence": confidence,
        "expiration_ts": expiration_ts,
        "default_state": "active",
        "tags": json.dumps(tags),
        "threat_type": "phish",
        "datatext": "\n".join(domains),
    }

    response = requests.post(f"{API_URL}import/", headers=HEADERS, data=payload)
    return response


def threatstream_import_indicators_stix(file_path, classification, confidence, tags):
    error = check_api_key(API_KEY, "Anomali")
    if error:
        return error

    with open(file_path, "rb") as file:
        files = {
            "file": file,
            "classification": (None, classification),
            "confidence": (None, confidence),
            "tags": (None, str(tags)),
        }

    response = requests.post(f"{API_URL}/stix/", headers=HEADERS, files=files)

    return response.status_code


if __name__ == "__main__":
    pass
