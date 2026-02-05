from unidecode import unidecode
import numpy as np
import multiprocessing as mp
import sys
import re
import idna
from whoisxmlapi import get_newly_registered_domains_df
from api_calls import get_active_companies, get_watched_resources, add_lookalike_domain
import concurrent.futures
from substring_match import find_best_substring_match, find_substring_typo_match
import Levenshtein
import logging

QUERY_LENGTH_THRESHOLD = 20
DISTANCE_RATIO = 4


def levenshtein_distance(s1, s2):
    """
    Calculate the Levenshtein distance between two strings.
    """
    return Levenshtein.distance(s1, s2)


DOMAIN_REGEX = r"^(?!(https:\/\/|http:\/\/|www\.))([a-zA-Z0-9.-]+\.([a-zA-Z]{2,})+)$"
RISK_LEVELS = {
    1: "low",
    2: "medium",
    3: "high",
}


def calculate_similarity_keyword(query_value, domain):
    unidecoded_domain = unidecode(domain)
    unidecoded_domain_name = unidecoded_domain.split(".")[0]
    unidecoded_domain_without_hyphen = unidecoded_domain.replace("-", "")
    unidecoded_domain_without_dot = unidecoded_domain.replace(".", "")

    unidecoded_domain_variations = [
        unidecoded_domain_name,
        unidecoded_domain_without_hyphen,
        unidecoded_domain_without_dot,
    ]

    for domain_variation in unidecoded_domain_variations:
        if query_value in domain_variation:
            return 0.86

    return 0.00


def calculate_similarity_domain(query_domain, domain, properties):
    best_similarity_ratio = 0.00
    first_character_match = False

    typo_match = False
    noise_reduction = False

    if "typo_match" in properties or "substring_typo_match" in properties:
        typo_match = True
        if "noise_reduction" in properties:
            noise_reduction = True

    query_domain_name = query_domain.split(".", 1)[0]
    query_domain_name_without_hyphen = query_domain_name.replace("-", "")
    query_domain_name_translated = query_domain_name.translate(str.maketrans("glw", "qiv"))

    unidecoded_domain = unidecode(domain)
    unidecoded_domain_name = unidecoded_domain.split(".")[0]
    if not unidecoded_domain_name:
        return best_similarity_ratio, first_character_match

    unidecoded_domain_name_without_hyphen = unidecoded_domain_name.replace("-", "")
    unidecoded_domain_name_with_tld = unidecoded_domain.replace(".", "")
    unidecoded_domain_name_translated = unidecoded_domain_name.translate(
        str.maketrans("glw", "qiv")
    )

    if not typo_match:
        if query_domain_name == unidecoded_domain_name:
            return 1.00, first_character_match
        return best_similarity_ratio, first_character_match

    variations = [
        {"domain": unidecoded_domain_name, "query": query_domain_name},
        {
            "domain": unidecoded_domain_name_without_hyphen,
            "query": query_domain_name_without_hyphen,
        },
        {
            "domain_with_tld": unidecoded_domain_name_with_tld,
            "query": query_domain_name,
        },
        {
            "domain": unidecoded_domain_name_translated,
            "query": query_domain_name_translated,
        },
    ]

    for variation in variations:
        is_domain_with_tld = "domain_with_tld" in variation

        if is_domain_with_tld:
            domain_name_variation = variation["domain_with_tld"]
        else:
            domain_name_variation = variation["domain"]

        query_domain_name_variation = variation["query"]

        # Check if the first characters match
        try:
            if domain_name_variation[0] == query_domain_name_variation[0]:
                first_character_match = True
        except Exception as e:
            logging.error(
                f"Error: {e}, Domain: {domain_name_variation}, Query: {query_domain_name_variation}, Domain: {domain}"
            )

        query_length = len(query_domain_name_variation)
        domain_length = len(domain_name_variation)
        length_difference = abs(query_length - domain_length)

        if noise_reduction and length_difference > 0:
            continue

        distance = Levenshtein.distance(query_domain_name_variation, domain_name_variation)

        if (
            distance > round(query_length / DISTANCE_RATIO, 2)
            and length_difference < QUERY_LENGTH_THRESHOLD
        ):
            continue

        if is_domain_with_tld:
            if query_domain_name_variation in domain_name_variation:
                return 1.00, first_character_match
            else:
                continue

        substring_match_score = find_best_substring_match(
            query_domain_name_variation, domain_name_variation
        )

        if query_length >= QUERY_LENGTH_THRESHOLD and substring_match_score == 1.0:
            return 1.00, first_character_match

        if substring_match_score == 1.0:
            return substring_match_score, first_character_match

        similarity_ratio = find_substring_typo_match(
            query_domain_name_variation, domain_name_variation
        )

        if similarity_ratio > best_similarity_ratio:
            best_similarity_ratio = similarity_ratio

    return best_similarity_ratio, first_character_match


def identify_lookalike_domains(queries, company, date, df):
    for domain in df["domainName"]:
        first_character_match = False
        resource_matches = []

        try:
            domain = idna.decode(domain.lower())
        except Exception as e:
            print(f"{domain}: {e}")
            continue

        domain_name = domain.split(".")[0]

        for query in queries:
            query_value = query.get("value", "").lower()
            query_type = query.get("resource_type", "")
            excluded_value_found_in_domain = False

            for exclude_value in query.get("exclude_keywords", []):
                if exclude_value in domain_name:
                    excluded_value_found_in_domain = True
                    break

            if excluded_value_found_in_domain:
                continue

            if query_type == "keyword":
                if "*" in query_value:
                    if re.search(rf"^{query_value.replace('*', '.*')}$", domain_name):
                        resource_matches.append(
                            {
                                "domain_name": idna.encode(domain).decode("utf-8"),
                                "resource_value": query_value,
                                "resource_type": query_type,
                                "similarity": 0.82,
                                "query_length": len(query_value.split(".", 1)[0]),
                            }
                        )
                elif "." not in query_value:
                    similarity = calculate_similarity_keyword(query_value, domain)
                else:
                    print("Invalid query")
                    continue

            elif query_type == "domain":
                similarity, first_character_match = calculate_similarity_domain(
                    query_value,
                    domain,
                    query.get("properties", []),
                )

            else:
                print("Invalid query type")
                continue

            if similarity:
                resource_matches.append(
                    {
                        "domain_name": idna.encode(domain).decode("utf-8"),
                        "resource_value": query_value,
                        "resource_type": query_type,
                        "similarity": similarity,
                        "query_length": len(query_value.split(".", 1)[0]),
                        "first_character_match": first_character_match,
                    }
                )

        if resource_matches:
            keyword_matches = [
                match for match in resource_matches if match["resource_type"] == "keyword"
            ]
            domain_matches = [
                match for match in resource_matches if match["resource_type"] == "domain"
            ]

            perfect_domain_match = next(
                (match for match in domain_matches if match["similarity"] == 1.00), None
            )

            if perfect_domain_match:
                best_resource_match = perfect_domain_match

            elif domain_matches:
                best_resource_match = max(domain_matches, key=lambda x: x["similarity"])

            elif keyword_matches:
                best_resource_match = max(keyword_matches, key=lambda x: x["similarity"])

            similarity_ratio = best_resource_match["similarity"]

            if best_resource_match.get("query_length", 0) >= QUERY_LENGTH_THRESHOLD:
                low_risk_threshold = 0.80
                medium_risk_threshold = 0.85
                high_risk_threshold = 0.88
            else:
                low_risk_threshold = 0.82
                medium_risk_threshold = 0.86
                high_risk_threshold = 0.88

            if similarity_ratio >= high_risk_threshold:
                best_resource_match["risk"] = 3
            elif similarity_ratio >= medium_risk_threshold:
                best_resource_match["risk"] = 2
            elif similarity_ratio >= low_risk_threshold:
                best_resource_match["risk"] = 1
            else:
                best_resource_match["risk"] = 0

            if best_resource_match.get("resource_type") == "domain" and not best_resource_match.get(
                "first_character_match", False
            ):
                best_resource_match["risk"] -= 1

            if best_resource_match["risk"] > 0:
                print(best_resource_match)

                temp = {
                    "domain_name": best_resource_match["domain_name"],
                    "resource_value": best_resource_match["resource_value"],
                    "resource_type": best_resource_match["resource_type"],
                    "risk": RISK_LEVELS[best_resource_match["risk"]],
                }
                add_lookalike_domain(temp, date, company)


def parallelize(company_resources, company, date, data_frame, num_cores=2):
    data_frame_split = np.array_split(data_frame, num_cores)

    with concurrent.futures.ProcessPoolExecutor() as executor:
        futures = [
            executor.submit(
                identify_lookalike_domains,
                company_resources,
                company,
                date,
                data_frame_chunk,
            )
            for data_frame_chunk in data_frame_split
        ]

        for future in concurrent.futures.as_completed(futures):
            result = future.result()


def match_resources(date):
    newly_registered_domains_df = get_newly_registered_domains_df(date)
    print(f"Successfully loaded {len(newly_registered_domains_df)} domains for {date}.")

    core_count = mp.cpu_count() - 2
    print(f"Detected {core_count} CPU cores for parallel processing.")

    active_companies = get_active_companies()

    for company in active_companies:
        # Company Resources
        company_resources = get_watched_resources(company)

        if company_resources and not newly_registered_domains_df.empty:
            print(f"Starting parallel processing for {company} resources...")
            parallelize(
                company_resources,
                company,
                date,
                newly_registered_domains_df,
                core_count,
            )
            print(f"Finished parallel processing for {company} resources.")


# Main
if __name__ == "__main__":
    date = sys.argv[1]
    match_resources(date)
