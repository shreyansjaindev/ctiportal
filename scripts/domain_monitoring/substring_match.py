from difflib import SequenceMatcher
import Levenshtein
from unidecode import unidecode


def find_best_substring_match(keyword, domain_name):
    highest_score = 0
    best_substring = ""

    for i in range(len(domain_name)):
        if highest_score == 1.0:
            break  # Early exit if a perfect match is found
        for j in range(i + len(keyword), min(i + 20, len(domain_name) + 1)):
            substring = domain_name[i:j]
            score = SequenceMatcher(None, substring, keyword).ratio()

            if score == 1.0:
                return score

            if score > highest_score:
                highest_score = score

    return highest_score


def find_best_match(domain_name, keywords):
    domain_name = domain_name.lower()  # Convert domain_name to lowercase once
    keywords = [kw.lower() for kw in keywords]  # Convert keywords to lowercase once

    highest_score = 0
    best_substring = ""

    for keyword in keywords:
        if highest_score == 1.0:
            break  # Early exit if a perfect match is found
        score = find_best_substring_match(keyword, domain_name)

        if score > highest_score:
            highest_score = score

    return highest_score


def calculate_similarity(query_domain, domain, noise_reduction):
    query_domain_name = query_domain.split(".", 1)[0]
    query_domain_name_without_hyphen = query_domain_name.replace("-", "")
    query_domain_name_translated = query_domain_name.translate(str.maketrans("gl", "qi"))
    unidecoded_domain = unidecode(domain)
    unidecoded_domain_name = unidecoded_domain.split(".")[0]
    unidecoded_domain_name_without_hyphen = unidecoded_domain_name.replace("-", "")
    unidecoded_domain_name_with_tld = unidecoded_domain.replace(".", "")
    unidecoded_domain_name_translated = unidecoded_domain_name.translate(str.maketrans("gl", "qi"))

    variations = [
        {"domain": unidecoded_domain_name, "query": query_domain_name},
        {
            "domain": unidecoded_domain_name_without_hyphen,
            "query": query_domain_name_without_hyphen,
        },
        {"domain": unidecoded_domain_name_with_tld, "query": query_domain_name},
        {
            "domain": unidecoded_domain_name_translated,
            "query": query_domain_name_translated,
        },
    ]

    best_similarity_ratio = 0.00

    for variation in variations:
        domain_name_variation = variation["domain"]
        query_domain_name_variation = variation["query"]

        query_length = len(query_domain_name_variation)
        domain_length = len(domain_name_variation)
        length_difference = abs(query_length - domain_length)

        if noise_reduction:
            if length_difference > 0:
                continue

        distance = Levenshtein.distance(query_domain_name_variation, domain_name_variation)

        if distance > round(query_length / 5):
            continue

        substring_match_score = find_best_substring_match(
            query_domain_name_variation, domain_name_variation
        )

        if substring_match_score == 1.0:
            return substring_match_score, query_domain, domain, None

        similarity_ratio = round(
            SequenceMatcher(None, query_domain_name_variation, domain_name_variation).ratio(),
            2,
        )

        if similarity_ratio > best_similarity_ratio:
            best_similarity_ratio = similarity_ratio

    return best_similarity_ratio, query_domain, domain, distance
