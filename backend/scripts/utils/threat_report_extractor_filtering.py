from scripts.utils.threat_report_extractor_constants import (
    COMPARISON_EVIDENCE_HINTS,
    ENTITY_NOISE_HINTS,
    MARKETING_EVIDENCE_HINTS,
    VICTIM_EVIDENCE_HINTS,
)
from scripts.utils.threat_report_extractor_normalize import normalize_for_match


def looks_like_victim_evidence(evidence):
    lowered = evidence.lower()
    return any(hint in lowered for hint in VICTIM_EVIDENCE_HINTS)


def looks_like_marketing_evidence(evidence):
    lowered = evidence.lower()
    return any(hint in lowered for hint in MARKETING_EVIDENCE_HINTS) and not looks_like_victim_evidence(evidence)


def looks_like_noise_evidence(evidence):
    lowered = evidence.lower()
    return any(hint in lowered for hint in ENTITY_NOISE_HINTS)


def looks_like_comparison_evidence(evidence):
    lowered = evidence.lower()
    return any(hint in lowered for hint in COMPARISON_EVIDENCE_HINTS)


def evidence_mentions_entity(name, evidence):
    normalized_name = normalize_for_match(name)
    normalized_evidence = normalize_for_match(evidence)
    if not normalized_name or not normalized_evidence:
        return False
    return normalized_name in normalized_evidence


def filter_victim_entities(values, entity_kind="generic"):
    filtered = []
    for item in values:
        name = item.get("name", "").strip()
        if not name:
            continue
        evidence = item.get("evidence", [])
        if not evidence:
            continue
        evidence_matches = []
        for value in evidence:
            if looks_like_marketing_evidence(value) or looks_like_noise_evidence(value):
                continue
            mentions_entity = evidence_mentions_entity(name, value)
            role_supported = looks_like_victim_evidence(value)
            if entity_kind == "organization" and mentions_entity:
                evidence_matches.append(value)
                continue
            if entity_kind in {"industry", "geography"} and mentions_entity and role_supported:
                evidence_matches.append(value)
                continue
            if entity_kind == "generic" and mentions_entity and role_supported:
                evidence_matches.append(value)
        if evidence_matches:
            filtered.append({**item, "evidence": evidence_matches})
    return filtered


def filter_relationships(values):
    filtered = []
    for item in values:
        evidence = item.get("evidence", [])
        if not evidence:
            child_matches = filter_relationships(item.get("children", []))
            if child_matches:
                filtered.append({**item, "children": child_matches})
            continue
        evidence_matches = []
        for value in evidence:
            if looks_like_noise_evidence(value) or looks_like_marketing_evidence(value):
                continue
            if looks_like_comparison_evidence(value):
                continue
            evidence_matches.append(value)
        child_matches = filter_relationships(item.get("children", []))
        if evidence_matches:
            filtered.append({**item, "evidence": evidence_matches, "children": child_matches})
    return filtered
