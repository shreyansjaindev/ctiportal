from __future__ import annotations

import logging
import math
import re
from concurrent.futures import ProcessPoolExecutor
from dataclasses import dataclass
from datetime import date, datetime

import idna
import Levenshtein
from unidecode import unidecode

from domain_monitoring.models import Company, LookalikeDomain, NewlyRegisteredDomain, WatchedResource
from scripts.domain_monitoring.substring_match import find_best_substring_match, find_substring_typo_match

logger = logging.getLogger(__name__)

QUERY_LENGTH_THRESHOLD = 20
DISTANCE_RATIO = 4
RISK_LEVELS = {1: "low", 2: "medium", 3: "high"}


@dataclass(frozen=True)
class ResourceMatch:
    domain_name: str
    resource_value: str
    resource_type: str
    risk: str


@dataclass(frozen=True)
class CandidateDomain:
    value: str
    created: datetime
    source_date: date


def normalize_source_date(source_date: date | str) -> date:
    if isinstance(source_date, date):
        return source_date
    return datetime.strptime(source_date, "%Y-%m-%d").date()


def chunk_list(values: list[str], chunk_count: int) -> list[list[str]]:
    if not values:
        return []
    chunk_size = max(1, math.ceil(len(values) / chunk_count))
    return [values[index : index + chunk_size] for index in range(0, len(values), chunk_size)]


def calculate_similarity_keyword(query_value: str, domain: str) -> float:
    unidecoded_domain = unidecode(domain)
    for variation in (
        unidecoded_domain.split(".")[0],
        unidecoded_domain.replace("-", ""),
        unidecoded_domain.replace(".", ""),
    ):
        if query_value in variation:
            return 0.86
    return 0.0


def calculate_similarity_domain(query_domain: str, domain: str, properties: list[str]) -> tuple[float, bool]:
    best_similarity_ratio = 0.0
    first_character_match = False
    typo_match = "typo_match" in properties or "substring_typo_match" in properties
    noise_reduction = typo_match and "noise_reduction" in properties

    query_domain_name = query_domain.split(".", 1)[0]
    query_domain_name_without_hyphen = query_domain_name.replace("-", "")
    query_domain_name_translated = query_domain_name.translate(str.maketrans("glw", "qiv"))

    unidecoded_domain = unidecode(domain)
    unidecoded_domain_name = unidecoded_domain.split(".")[0]
    if not unidecoded_domain_name:
        return best_similarity_ratio, first_character_match

    if not typo_match:
        return (1.0, first_character_match) if query_domain_name == unidecoded_domain_name else (
            best_similarity_ratio,
            first_character_match,
        )

    variations = [
        {"domain": unidecoded_domain_name, "query": query_domain_name},
        {"domain": unidecoded_domain_name.replace("-", ""), "query": query_domain_name_without_hyphen},
        {"domain_with_tld": unidecoded_domain.replace(".", ""), "query": query_domain_name},
        {
            "domain": unidecoded_domain_name.translate(str.maketrans("glw", "qiv")),
            "query": query_domain_name_translated,
        },
    ]

    for variation in variations:
        is_domain_with_tld = "domain_with_tld" in variation
        domain_name_variation = variation.get("domain_with_tld") or variation["domain"]
        query_domain_name_variation = variation["query"]
        if domain_name_variation and query_domain_name_variation:
            first_character_match = first_character_match or (
                domain_name_variation[0] == query_domain_name_variation[0]
            )

        query_length = len(query_domain_name_variation)
        length_difference = abs(query_length - len(domain_name_variation))
        if noise_reduction and length_difference > 0:
            continue

        distance = Levenshtein.distance(query_domain_name_variation, domain_name_variation)
        if distance > round(query_length / DISTANCE_RATIO, 2) and length_difference < QUERY_LENGTH_THRESHOLD:
            continue

        if is_domain_with_tld:
            if query_domain_name_variation in domain_name_variation:
                return 1.0, first_character_match
            continue

        substring_match_score = find_best_substring_match(query_domain_name_variation, domain_name_variation)
        if substring_match_score == 1.0:
            return 1.0, first_character_match

        similarity_ratio = find_substring_typo_match(query_domain_name_variation, domain_name_variation)
        if similarity_ratio > best_similarity_ratio:
            best_similarity_ratio = similarity_ratio

    return best_similarity_ratio, first_character_match


def identify_lookalike_matches(queries: list[dict], domains: list[CandidateDomain]) -> list[ResourceMatch]:
    matches: list[ResourceMatch] = []
    for candidate in domains:
        domain = candidate.value
        first_character_match = False
        resource_matches: list[dict] = []

        try:
            normalized_domain = idna.decode(domain.lower())
        except Exception:
            continue

        domain_name = normalized_domain.split(".")[0]
        for query in queries:
            query_value = query.get("value", "").lower()
            query_type = query.get("resource_type", "")

            match_from = query.get("lookalike_match_from")
            if match_from and candidate.source_date < match_from:
                continue

            if any(exclude_value in domain_name for exclude_value in query.get("exclude_keywords", [])):
                continue

            similarity = 0.0
            if query_type == "keyword":
                if "*" in query_value:
                    if re.search(rf"^{query_value.replace('*', '.*')}$", domain_name):
                        resource_matches.append(
                            {
                                "domain_name": idna.encode(normalized_domain).decode("utf-8"),
                                "resource_value": query_value,
                                "resource_type": query_type,
                                "similarity": 0.82,
                                "query_length": len(query_value.split(".", 1)[0]),
                                "first_character_match": True,
                            }
                        )
                        continue
                elif "." not in query_value:
                    similarity = calculate_similarity_keyword(query_value, normalized_domain)
            elif query_type == "domain":
                similarity, first_character_match = calculate_similarity_domain(
                    query_value,
                    normalized_domain,
                    query.get("properties", []),
                )
            else:
                continue

            if similarity:
                resource_matches.append(
                    {
                        "domain_name": idna.encode(normalized_domain).decode("utf-8"),
                        "resource_value": query_value,
                        "resource_type": query_type,
                        "similarity": similarity,
                        "query_length": len(query_value.split(".", 1)[0]),
                        "first_character_match": first_character_match,
                    }
                )

        if not resource_matches:
            continue

        keyword_matches = [match for match in resource_matches if match["resource_type"] == "keyword"]
        domain_matches = [match for match in resource_matches if match["resource_type"] == "domain"]
        perfect_domain_match = next((match for match in domain_matches if match["similarity"] == 1.0), None)

        if perfect_domain_match:
            best_match = perfect_domain_match
        elif domain_matches:
            best_match = max(domain_matches, key=lambda item: item["similarity"])
        else:
            best_match = max(keyword_matches, key=lambda item: item["similarity"])

        similarity_ratio = best_match["similarity"]
        thresholds = (0.80, 0.85, 0.88) if best_match.get("query_length", 0) >= QUERY_LENGTH_THRESHOLD else (
            0.82,
            0.86,
            0.88,
        )
        if similarity_ratio >= thresholds[2]:
            risk = 3
        elif similarity_ratio >= thresholds[1]:
            risk = 2
        elif similarity_ratio >= thresholds[0]:
            risk = 1
        else:
            risk = 0

        if best_match.get("resource_type") == "domain" and not best_match.get("first_character_match", False):
            risk -= 1

        if risk > 0:
            matches.append(
                ResourceMatch(
                    domain_name=best_match["domain_name"],
                    resource_value=best_match["resource_value"],
                    resource_type=best_match["resource_type"],
                    risk=RISK_LEVELS[risk],
                )
            )

    return matches


def get_active_company_resources() -> dict[str, list[dict]]:
    resources_by_company: dict[str, list[dict]] = {}
    for company in Company.objects.filter(status="active").order_by("name"):
        resources = list(
            WatchedResource.objects.filter(company=company, status="active").values(
                "value",
                "resource_type",
                "lookalike_match_from",
                "properties",
                "exclude_keywords",
            )
        )
        if resources:
            resources_by_company[company.name] = resources
    return resources_by_company


def persist_lookalike_matches(company_name: str, source_date: date, matches: list[ResourceMatch]) -> int:
    company = Company.objects.get(name=company_name)
    count = 0
    for match in matches:
        LookalikeDomain.objects.update_or_create(
            source_date=source_date,
            value=match.domain_name,
            company=company,
            defaults={
                "source": "whoisxmlapi",
                "watched_resource": match.resource_value,
                "potential_risk": match.risk,
                "status": "open",
            },
        )
        count += 1
    return count


def run_lookalike_scan(source_date: date | str, workers: int = 1) -> int:
    normalized_date = normalize_source_date(source_date)
    domains = [
        CandidateDomain(value=row["value"], created=row["created"], source_date=row["source_date"])
        for row in NewlyRegisteredDomain.objects.filter(source_date=normalized_date).values(
            "value",
            "created",
            "source_date",
        )
    ]
    if not domains:
        logger.info("No newly registered domains stored for %s", normalized_date.isoformat())
        return 0

    company_resources = get_active_company_resources()
    if not company_resources:
        logger.info("No active watched resources found for lookalike scan")
        return 0

    total_matches = 0
    worker_count = max(1, workers)
    for company_name, resources in company_resources.items():
        if worker_count == 1:
            matches = identify_lookalike_matches(resources, domains)
        else:
            matches = []
            with ProcessPoolExecutor(max_workers=worker_count) as executor:
                futures = [
                    executor.submit(identify_lookalike_matches, resources, chunk)
                    for chunk in chunk_list(domains, worker_count)
                ]
                for future in futures:
                    matches.extend(future.result())
        total_matches += persist_lookalike_matches(company_name, normalized_date, matches)

    logger.info("Processed lookalike scan for %s with %s upserts", normalized_date.isoformat(), total_matches)
    return total_matches
