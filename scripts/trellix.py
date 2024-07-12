import requests
import os
import re

API_KEY = os.getenv("TRELLIX", "").split(",")[0]
HEADERS = {
    "x-fireeye-api-key": API_KEY,
}
BASE_URL = "https://etp.eu.fireeye.com/api/v1/policies"


def format_meta_data(meta_data):
    return "\n".join([f'        {key} = "{value}"' for key, value in meta_data.items()])


def format_strings_to_match(strings_to_match):
    return "\n".join(
        [
            f'        {string["identifier"]} = {string["string"]}'
            for string in strings_to_match
            if string["type"] == "regex"
        ]
    )


def generate_yara_rule(rule_name, meta_data, strings_to_match, condition):
    return (
        f"rule {rule_name} {{\n"
        "    meta:\n" + format_meta_data(meta_data) + "\n"
        "    strings:\n" + format_strings_to_match(strings_to_match) + "\n"
        f"    condition:\n        {condition}\n"
        "}\n"
    )


def add_domains_to_yara_rule(domains):
    strings_to_match = []
    for i, domain in enumerate(domains):
        domain_name = domain.replace(".", r"\.")
        regex_pattern = rf"/https?:\/\/\w*\.?{domain_name}[^.a-zA-Z0-9]/ nocase"
        strings_to_match.append(
            {"identifier": f"$regex{i}", "string": regex_pattern, "type": "regex"}
        )
    return strings_to_match


def generate_yara_rule_file(domains):
    rule_name = "fis_domain_monitoring"
    meta_data = {
        "author": "CTI",
        "description": "Identify if a FIS look-alike domain is present in the email body.",
    }
    condition = "1 of ($regex*)"

    try:
        strings_to_match = add_domains_to_yara_rule(domains)
        yara_content = generate_yara_rule(rule_name, meta_data, strings_to_match, condition)
        with open("fis_domain_monitoring.yara", "w") as yara_file:
            yara_file.write(yara_content)
        print("YARA file generated successfully.")
    except Exception as e:
        print(f"Failed to write YARA file: {e}")


def get_yara_rulesets(policy_uuid):
    url = f"{BASE_URL}/{policy_uuid}/configuration/rules/yara/rulesets"
    response = requests.get(url, headers=HEADERS)
    yara_rulesets = response.json()["data"]["rulesets"]
    return yara_rulesets


def get_yara_ruleset_by_name(name, policy_uuid):
    yara_rulesets = get_yara_rulesets(policy_uuid)
    for yara_ruleset in yara_rulesets:
        if yara_ruleset["name"] == name:
            return yara_ruleset
    return None


def update_yara_ruleset_by_name(name, domains, policy_uuid):
    if not API_KEY:
        return {"error": "API key not found"}

    yara_ruleset = get_yara_ruleset_by_name(name, policy_uuid)
    if yara_ruleset:
        ruleset_uuid = yara_ruleset["uuid"]
        yara_ruleset_url = (
            f"{BASE_URL}/{policy_uuid}/configuration/rules/yara/rulesets/{ruleset_uuid}/file"
        )
        generate_yara_rule_file(domains)
        files = {"file": open("fis_domain_monitoring.yara", "rb")}
        response = requests.put(yara_ruleset_url, headers=HEADERS, files=files)
        return response.json()

    return {"error": "An error occured while updating YARA ruleset."}


def extract_domains_from_yara(yara_content):
    yara_string_pattern = re.compile(r"\$\w+ = ((?:\/|\")\S+(?:\/|\"))")
    matches = yara_string_pattern.findall(yara_content)
    extracted_strings = [
        match.replace("/https?:\/\/\w*\.?", "").replace("[^.a-z]/", "").replace("\.", ".")
        for match in matches
    ]
    return extracted_strings


def get_yara_file_by_ruleset_name(name, policy_uuid):
    if not API_KEY:
        return {"error": "API key not found"}

    yara_ruleset = get_yara_ruleset_by_name(name, policy_uuid)
    if yara_ruleset:
        ruleset_uuid = yara_ruleset["uuid"]
        yara_ruleset_url = (
            f"{BASE_URL}/{policy_uuid}/configuration/rules/yara/rulesets/{ruleset_uuid}/file"
        )

        response = requests.get(yara_ruleset_url, headers=HEADERS)
        if response.status_code == 200:
            print(response.text)
            return response.text
        else:
            return {
                "error": "Failed to fetch YARA file",
                "status_code": response.status_code,
            }

    return {"error": "YARA ruleset not found"}


if __name__ == "__main__":
    yara_rule_name = "YARA_Test_Rule"

    policy_uuid = "5398f15e-fced-11ea-97c3-0acb46400b08"
    # yara_rule_text = get_yara_file_by_ruleset_name(yara_rule_name, policy_uuid)
    yara_rule_text = """
    rule fis_domain_monitoring {
    meta:
        author = "CTI"
        description = "Identify if a FIS look-alike domain is present in the email body."
    strings:
        $domain0 = /https?:\/\/\w*\.?testabc1\.com[^.a-z]/ nocase
        $domain1 = /https?:\/\/\w*\.?testabc2\.com[^.a-z]/ nocase
        $domain2 = /https?:\/\/\w*\.?testabc3\.com[^.a-z]/ nocase
        $domain0 = /https?:\/\/\w*\.?testabc4\.com[^.a-z]/ nocase
        $domain1 = /https?:\/\/\w*\.?testabc5\.com[^.a-z]/ nocase
        $domain2 = /https?:\/\/\w*\.?testabc6\.com[^.a-z]/ nocase
    condition:
        1 of ($domain*)
    }
    """
    domains = extract_domains_from_yara(yara_rule_text)
    more_domains = ["testabc4.com", "testabc5.com", "testabc6.com"]
    domains += more_domains
    unique_domains = []
    for domain in domains:
        if domain not in unique_domains:
            unique_domains.append(domain)
    print(unique_domains)
    # update_yara_ruleset_by_name(yara_rule_name, domains, policy_uuid)
