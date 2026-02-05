from pulsedive import Pulsedive
import sys
import os
import logging

logger = logging.getLogger(__name__)

_raw_pulsedive = os.getenv("PULSEDIVE")
if _raw_pulsedive:
    API_KEY = _raw_pulsedive.split(",")[0].strip()
else:
    API_KEY = None


def get_results(value):
    temp_list = []
    data = {}
    pud_data = {}

    try:
        pud = Pulsedive(api_key=API_KEY)
        # Supports: Domain, IP Address and URL
        pud_data = pud.indicator(value=value)
        # Select Data
        data["IID"] = pud_data.get("iid", None)
        data["Risk"] = pud_data.get("risk", None)
        data["Risk Recommended"] = pud_data.get("risk_recommended", None)
        data["Manual Risk"] = pud_data.get("manualrisk", None)
        data["Retired"] = pud_data.get("retired", None)
        data["Seen"] = pud_data.get("stamp_seen", None)
        data["Attributions"] = pud_data.get("threats", None)
        if isinstance(data["Attributions"], list):
            for threat in data["Attributions"]:
                temp_list.append(threat.get("name", None))

            data["Attributions"] = ", ".join(temp_list)

        elif data["Attributions"] == None:
            del data["Attributions"]

        temp = {}

        data["Risk Factors"] = pud_data.get("riskfactors", None)
        if isinstance(data["Risk Factors"], list):
            data["Risk Factors"] = data["Risk Factors"][0]
            if isinstance(data["Risk Factors"], dict):
                temp["Description"] = data["Risk Factors"].get("description", None)
                temp["Risk"] = data["Risk Factors"].get("risk", None)
                data["Risk Factors"] = temp

        elif data["Risk Factors"] == None:
            del data["Risk Factors"]

        temp = {}

        data["Feeds"] = pud_data.get("feeds", None)

        if not data["Feeds"]:
            del data["Feeds"]

        elif isinstance(data["Feeds"], list):
            data["Feeds"] = data["Feeds"][0]
            if isinstance(data["Feeds"], dict):
                temp["Date Seen"] = data["Feeds"].get("stamp_linked", None)
                temp["Name"] = data["Feeds"].get("name", None)
                temp["Category"] = data["Feeds"].get("category", None)
                temp["Organization"] = data["Feeds"].get("organization", None)
                data["Feeds"] = temp

        return data

    except Exception as e:
        print(e)
        return {}

    """ # Searching for indicators
    pud.search('pulsedive')

    # Pulling from feeds or threats
    pud.feed.links(1)
    pud.threat.links(1)

    # Searching for threats and feeds
    pud.search.threat('Zeus', risk=['high', 'critical'])
    pud.search.feed('Zeus')

    # Exporting a search
    pud.search.to_csv(filename="zues.csv", threat=[
                      'Zeus'], indicator_type=['ip'])

    # Analyzing
    # q = pud.analyze.encoded('Z29vZ2xlLmNvbQ==')
    q = pud.analyze('google.com')
    pud.analyze.results(q['qid']) """


def pulse_dive(value, value_type):
    if not API_KEY:
        logger.error("API key not found")
        return {"error": "API key not found"}

    print(f"Value: {value}")
    return get_results(value)


if __name__ == "__main__":
    try:
        query = sys.argv[1]
        print(get_results(query))
    except Exception as e:
        print("Missing Value Operand: (Supports Domain, IP Address and URL)")
        sys.exit()
