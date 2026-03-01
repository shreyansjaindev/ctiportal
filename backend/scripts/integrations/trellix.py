import requests
import os
import re
from ..utils.api_helpers import check_api_key

API_KEY = os.getenv("TRELLIX", "")
RULE_NAME = os.getenv("TRELLIX_RULE_NAME", "")
POLICY_UUID = os.getenv("TRELLIX_POLICY_UUID", "")

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
    rule_name = "sample_domain_monitoring"
    meta_data = {
        "author": "CTI",
        "description": "Identify if a look-alike domain is present in the email body.",
    }
    condition = "1 of ($regex*)"

    try:
        strings_to_match = add_domains_to_yara_rule(domains)
        yara_content = generate_yara_rule(rule_name, meta_data, strings_to_match, condition)
        with open("URL_sample_domain_monitoring.yara", "w") as yara_file:
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


def update_yara_ruleset_by_name(domains, name, policy_uuid):
    error = check_api_key(API_KEY, "Trellix")
    if error:
        return error

    yara_ruleset = get_yara_ruleset_by_name(name, policy_uuid)
    if yara_ruleset:
        ruleset_uuid = yara_ruleset["uuid"]
        yara_ruleset_url = (
            f"{BASE_URL}/{policy_uuid}/configuration/rules/yara/rulesets/{ruleset_uuid}/file"
        )
        generate_yara_rule_file(domains)
        try:
            with open("URL_sample_domain_monitoring.yara", "rb") as file:
                files = {"file": file}
                response = requests.put(yara_ruleset_url, headers=HEADERS, files=files)
                response.raise_for_status()
                return response
        except requests.RequestException as e:
            return {"error": f"HTTP request failed: {e}"}
        except IOError as e:
            return {"error": f"File operation failed: {e}"}

    return {"error": "An error occured while updating YARA ruleset."}


def extract_domains_from_yara(yara_content):
    """Extract domain names from YARA rule strings."""
    # Pattern to match YARA string variables
    yara_string_pattern = re.compile(r'\$\w+\s*=\s*["\']([^"\']+)["\']')
    matches = yara_string_pattern.findall(yara_content)

    extracted_domains = []

    for match in matches:
        # Remove quotes and slashes from the beginning and end
        cleaned = match.strip("'\"/")

        # Extract domain using regex patterns
        # Pattern 1: URLs like http://domain.com or https://subdomain.domain.com
        url_pattern = re.compile(r"https?://(?:www\.)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})")
        url_match = url_pattern.search(cleaned)
        if url_match:
            extracted_domains.append(url_match.group(1))
            continue

        # Pattern 2: Domain-like strings (domain.com, subdomain.domain.com)
        domain_pattern = re.compile(r"^(?:www\.)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$")
        domain_match = domain_pattern.match(cleaned)
        if domain_match:
            extracted_domains.append(domain_match.group(1))

    # Remove duplicates while preserving order
    return list(dict.fromkeys(extracted_domains))


def get_yara_file_by_ruleset_name(name, policy_uuid):
    error = check_api_key(API_KEY, "Trellix")
    if error:
        return error

    yara_ruleset = get_yara_ruleset_by_name(name, policy_uuid)
    if yara_ruleset:
        ruleset_uuid = yara_ruleset["uuid"]
        yara_ruleset_url = (
            f"{BASE_URL}/{policy_uuid}/configuration/rules/yara/rulesets/{ruleset_uuid}/file"
        )

        response = requests.get(yara_ruleset_url, headers=HEADERS)
        if response.status_code == 200:
            return response.text
        else:
            return {
                "error": "Failed to fetch YARA file",
                "status_code": response.status_code,
            }

    return {"error": "YARA ruleset not found"}


def process_yara_rules(domains):
    yara_rule_text = get_yara_file_by_ruleset_name(RULE_NAME, POLICY_UUID)
    old_domains = extract_domains_from_yara(yara_rule_text)
    old_domains += domains
    unique_domains = []
    for domain in domains:
        if domain not in unique_domains:
            unique_domains.append(domain)
    response = update_yara_ruleset_by_name(domains, RULE_NAME, POLICY_UUID)
    return response


if __name__ == "__main__":
    domains = ["testabc4.com", "testabc5.com", "testabc6.com"]
    process_yara_rules(domains)
