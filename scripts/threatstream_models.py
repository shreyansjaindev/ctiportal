import requests
import csv
import json
import os

API_KEY = os.getenv("ANOMALI", "").split(",")[0]
MITRE_FEED_ID = 5414
HEADERS = {
    "Authorization": f"apikey {API_KEY}",
}


def format_data(data, keys):
    result = []

    for row in data:
        row_list = []
        for key in keys:
            row_list.append(row.get(key))
        result.append(row_list)
    return result


def write_headers_to_csv(fields):
    with open("output.csv", "w") as csvfile:
        csvwriter = csv.writer(csvfile)
        csvwriter.writerow(fields)


def write_data_to_csv(rows):
    with open("output.csv", "a") as csvfile:
        csvwriter = csv.writer(csvfile)
        csvwriter.writerows(rows)


def request(session):
    if not API_KEY:
        return {"error": "API key not found"}

    keys = ["id", "model_type", "resource_uri", "feed_id", "name"]

    write_headers_to_csv(keys)

    response = session.get(
        f"https://api.threatstream.com/api/v1/threat_model_search/?model_type=attackpattern&feed_id={MITRE_FEED_ID}&limit=1000",
        headers=HEADERS,
    )
    data = response.json()
    total_count = data.get("meta", {}).get("total_count")
    data = data.get("objects", {})
    if total_count:
        rows = format_data(data, keys)
        write_data_to_csv(rows)
    return True


def get_mitre_ids():
    with requests.Session() as session:
        request(session)


def get_technique_ids_from_json():
    technique_ids = []
    with open("layer.json", "r", encoding="utf8") as f:
        data = json.load(f)
        techniques = data.get("techniques", [])
        for technique in techniques:
            technique_id = technique.get("techniqueID", "")
            technique_ids.append(technique_id.lower())
    return technique_ids


def get_malware_ids_from_list():
    malware_ids = []
    malwares = "AGENDA.RUST, BEACON, DRIFTBIKE, DRIFTKART, DRIFTKART.V2, DRIFTWHEEL, EIGHTPOD, FLOORBOARD, INVOKEKERBEROAST, IRONBOOT, JACKHAMMER, MORSEOP, NEWLEASE, POWERPUNCH, PUNCHBUGGY, PUNCHTRACK, REMCOM, RUMPUNCH, SHARPSHARES, SHEETMETAL, SHELLTEA, SLIVER, SPARKRAT, TURBOSHOCK, VSOCIETY"
    malwares = malwares.split(",")

    response = requests.get(
        "https://api.threatstream.com/api/v1/threat_model_search/?model_type=malware&limit=1000",
        headers=HEADERS,
    )
    data = response.json()
    with open("test.json", "w") as f:
        json.dump(data, f)

    return malware_ids


def get_threatpattern_id_from_technique_ids():
    threatpattern_ids = []
    technique_ids = get_technique_ids_from_json()
    # response = requests.get('https://api.threatstream.com/api/v1/threat_model_search/?model_type=attackpattern&feed_id=5414&limit=1000', headers=HEADERS)
    # data = response.json()
    # with open("test.json", "w") as f:
    #     json.dump(data, f)

    with open("test.json", "r") as f:
        data = json.load(f)
    total_count = data.get("meta", {}).get("total_count")
    if total_count > 1000:
        print("Unable to fetch all techniques, code needs modification.")
        return

    objects = data.get("objects", {})

    for object in objects:
        name = object.get("name", "")
        anomali_technique_id = name.split(" ", 1)[0].strip().lower()
        if anomali_technique_id in technique_ids:
            threatpattern_id = object.get("id")
            threatpattern_ids.append(threatpattern_id)
    return threatpattern_ids


def associate_threatpatterns_with_actors():
    threatpattern_ids = get_threatpattern_id_from_technique_ids()
    json_data = {"ids": threatpattern_ids}
    response = requests.post(
        "https://api.threatstream.com/api/v1/actor/555588/attackpattern/bulk_add/",
        headers=HEADERS,
        json=json_data,
    )
    return response


def fetch_investigation_details():
    response = requests.get(
        "https://api.threatstream.com/api/v1/investigation/351969", headers=HEADERS
    )
    print(response.json())


if __name__ == "__main__":
    fetch_investigation_details()
