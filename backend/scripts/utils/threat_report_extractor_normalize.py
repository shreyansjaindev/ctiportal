import ast
import json
import re
from datetime import datetime

from scripts.utils.threat_report_extractor_constants import (
    ISO_DATE_PATTERN,
    JSON_BLOCK_PATTERN,
    MITRE_TECHNIQUE_PATTERN,
    MONTH_DATE_PATTERN,
    SLASH_DATE_PATTERN,
)


def default_context_payload():
    return {
        "summary": "",
        "summary_details": {},
        "victim_organizations": [],
        "victim_industries": [],
        "victim_geographies": [],
        "threat_actors": [],
        "malware": [],
        "relationships": [],
        "campaigns": [],
        "attack_dates": {
            "single_dates": [],
            "range_start": "",
            "range_end": "",
            "precision": "",
            "relative_expression": "",
            "evidence": [],
        },
        "article_iocs": {
            "primary": [],
            "legitimate_tools": [],
            "linked_ioc_sources": [],
            "linked_source_iocs": [],
        },
        "ttps": [],
        "detection_rules": [],
        "mitre_techniques": [],
        "notes": [],
        "confidence": None,
    }


def merge_ioc_entries(entries):
    deduped = {}
    for entry in entries:
        key = (entry.get("type", ""), entry.get("value", ""))
        if not key[0] or not key[1]:
            continue
        existing = deduped.get(key)
        if existing is None or float(entry.get("confidence", 0) or 0) > float(existing.get("confidence", 0) or 0):
            deduped[key] = entry
    return list(deduped.values())


def ioc_entries_to_grouped(entries):
    grouped = {}
    for entry in entries:
        ioc_type = str(entry.get("type", "")).strip()
        value = str(entry.get("value", "")).strip()
        if not ioc_type or not value:
            continue
        grouped.setdefault(ioc_type, [])
        if value not in grouped[ioc_type]:
            grouped[ioc_type].append(value)
    return grouped


def normalize_date(value):
    parsers = (
        ("%Y-%m-%d", value),
        ("%m/%d/%Y", value),
        ("%b %d, %Y", value),
        ("%B %d, %Y", value),
    )
    for pattern, candidate in parsers:
        try:
            return datetime.strptime(candidate, pattern).date().isoformat()
        except ValueError:
            continue
    return value


def extract_dates(text):
    matches = []
    for pattern in (ISO_DATE_PATTERN, SLASH_DATE_PATTERN, MONTH_DATE_PATTERN):
        matches.extend(pattern.findall(text))
    normalized = []
    seen = set()
    for match in matches:
        value = normalize_date(match)
        if value not in seen:
            seen.add(value)
            normalized.append(value)
    return normalized


def coerce_text_list(values):
    if not isinstance(values, list):
        return []
    return [str(value).strip() for value in values if str(value).strip()]


def normalize_for_match(value):
    return re.sub(r"[^a-z0-9]+", " ", str(value).lower()).strip()


def normalize_confidence_label(value):
    lowered = str(value or "").strip().lower()
    if lowered in {"low", "medium", "high"}:
        return lowered
    return ""


def confidence_label_from_score(value):
    if not isinstance(value, (int, float)):
        return ""
    if value >= 0.8:
        return "high"
    if value >= 0.5:
        return "medium"
    if value > 0:
        return "low"
    return ""


def normalize_reason(value):
    return str(value or "").strip()


def parse_summary_object(value):
    if isinstance(value, dict):
        return value
    if not isinstance(value, str):
        return None
    trimmed = value.strip()
    if not trimmed.startswith("{") or not trimmed.endswith("}"):
        return None
    try:
        parsed = json.loads(trimmed)
    except json.JSONDecodeError:
        try:
            parsed = ast.literal_eval(trimmed)
        except (ValueError, SyntaxError):
            return None
    return parsed if isinstance(parsed, dict) else None


def coerce_summary_text(value):
    summary_object = parse_summary_object(value)
    if not summary_object:
        return str(value or "").strip()
    parts = []
    threat_actor = str(summary_object.get("threat_actor", "")).strip()
    if threat_actor:
        parts.append(f"Activity is linked to {threat_actor}.")
    targets = summary_object.get("targets", {})
    if isinstance(targets, dict):
        primary = str(targets.get("primary", "")).strip()
        secondary = str(targets.get("secondary", "")).strip()
        if primary:
            parts.append(f"Primary victims described in the report are {primary}.")
        if secondary:
            parts.append(f"Additional affected parties include {secondary}.")
    modus_operandi = summary_object.get("modus_operandi", {})
    if isinstance(modus_operandi, dict):
        primary_strategy = str(modus_operandi.get("primary_strategy", "")).strip()
        if primary_strategy:
            parts.append(primary_strategy)
    if not parts:
        for _, raw_value in summary_object.items():
            if isinstance(raw_value, str) and raw_value.strip():
                parts.append(raw_value.strip())
            if len(parts) >= 3:
                break
    return " ".join(parts).strip()


def dedupe_preserve_order(values):
    seen = set()
    result = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


def normalize_entity_list(values):
    if not isinstance(values, list):
        return []
    normalized = []
    for value in values:
        if isinstance(value, str):
            name = value.strip()
            if name:
                normalized.append({"name": name, "confidence": None, "confidence_label": "", "reason": "", "evidence": []})
            continue
        if not isinstance(value, dict):
            continue
        name = str(value.get("name", "")).strip()
        if not name:
            continue
        confidence = value.get("confidence") if isinstance(value.get("confidence"), (int, float)) else None
        normalized.append(
            {
                "name": name,
                "role": str(value.get("role", "")).strip() or None,
                "aliases": coerce_text_list(value.get("aliases", [])),
                "confidence": confidence,
                "confidence_label": normalize_confidence_label(value.get("confidence_label")) or confidence_label_from_score(confidence),
                "reason": normalize_reason(value.get("reason") or value.get("rationale")),
                "evidence": coerce_text_list(value.get("evidence", [])),
            }
        )
    return normalized


def normalize_ttps(values):
    if not isinstance(values, list):
        return []
    normalized = []
    for value in values:
        if not isinstance(value, dict):
            continue
        description = str(value.get("description", "")).strip()
        tactics = coerce_text_list(value.get("tactics", []))
        procedures = coerce_text_list(value.get("procedures", []))
        techniques = sorted(
            {
                match.upper()
                for technique in coerce_text_list(value.get("techniques", []))
                for match in MITRE_TECHNIQUE_PATTERN.findall(technique)
            }
        )
        if not description and not tactics and not procedures and not techniques:
            continue
        confidence = value.get("confidence") if isinstance(value.get("confidence"), (int, float)) else None
        normalized.append(
            {
                "description": description,
                "tactics": tactics,
                "techniques": techniques,
                "procedures": procedures,
                "is_emerging": bool(value.get("is_emerging")),
                "emergence_reason": str(value.get("emergence_reason", "")).strip() or str(value.get("why_new", "")).strip(),
                "confidence": confidence,
                "confidence_label": normalize_confidence_label(value.get("confidence_label")) or confidence_label_from_score(confidence),
                "reason": normalize_reason(value.get("reason") or value.get("rationale")),
                "evidence": coerce_text_list(value.get("evidence", [])),
            }
        )
    return normalized


def normalize_relationships(values):
    if not isinstance(values, list):
        return []
    normalized = []
    for value in values:
        if not isinstance(value, dict):
            continue
        source = str(value.get("source", "")).strip()
        source_type = str(value.get("source_type", "")).strip() or "unknown"
        relationship = str(value.get("relationship", "")).strip()
        target = str(value.get("target", "")).strip()
        target_type = str(value.get("target_type", "")).strip() or "unknown"
        if not source or not relationship or not target:
            continue
        confidence = value.get("confidence") if isinstance(value.get("confidence"), (int, float)) else None
        normalized.append(
            {
                "source": source,
                "source_type": source_type,
                "relationship": relationship,
                "target": target,
                "target_type": target_type,
                "confidence": confidence,
                "confidence_label": normalize_confidence_label(value.get("confidence_label")) or confidence_label_from_score(confidence),
                "reason": normalize_reason(value.get("reason") or value.get("rationale")),
                "evidence": coerce_text_list(value.get("evidence", [])),
                "children": normalize_relationships(value.get("children", [])),
            }
        )
    return normalized


def normalize_attack_dates(value):
    if not isinstance(value, dict):
        return {
            "single_dates": [],
            "range_start": "",
            "range_end": "",
            "precision": "",
            "relative_expression": "",
            "evidence": [],
        }
    evidence = coerce_text_list(value.get("evidence", []))
    if not evidence:
        return {
            "single_dates": [],
            "range_start": "",
            "range_end": "",
            "precision": "",
            "relative_expression": "",
            "evidence": [],
        }
    attack_context_hints = (
        "attack",
        "activity",
        "campaign",
        "intrusion",
        "targeted",
        "compromise",
        "observed",
        "victim",
        "malicious",
        "operation",
        "phishing",
        "deployed",
        "delivered",
        "began",
        "started",
        "occurred",
        "ongoing",
        "since",
        "during",
        "timeline",
    )
    non_attack_hints = (
        "compiled",
        "build",
        "built",
        "compile time",
        "timestamp",
        "compiled at",
        "compile timestamp",
        "compile date",
        "compile time",
        "file time",
        "pe timestamp",
        "sample identified",
        "sample compiled",
        "binary compiled",
        "malware compiled",
        "file time",
        "metadata",
        "copyright",
        "published",
        "updated",
        "posted",
        "article date",
    )

    def _matches_date_text(snippet, date_value):
        if not date_value:
            return False
        candidates = {
            date_value,
            date_value.replace("-", "/"),
        }
        if len(date_value) >= 10:
            year, month, day = date_value[:10].split("-")
            candidates.update(
                {
                    f"{month}/{day}/{year}",
                    f"{month}-{day}-{year}",
                }
            )
        lowered = snippet.lower()
        return any(candidate.lower() in lowered for candidate in candidates)

    def _supports_attack_timeline(snippet):
        lowered = snippet.lower()
        if any(hint in lowered for hint in non_attack_hints):
            return False
        return any(hint in lowered for hint in attack_context_hints)

    supported_evidence = [snippet for snippet in evidence if _supports_attack_timeline(snippet)]
    if not supported_evidence:
        return {
            "single_dates": [],
            "range_start": "",
            "range_end": "",
            "precision": "",
            "relative_expression": "",
            "evidence": [],
        }

    raw_single_dates = [normalize_date(item) for item in coerce_text_list(value.get("single_dates", [])) if item]
    single_dates = []
    for date_value in dedupe_preserve_order(raw_single_dates):
        matching_evidence = [snippet for snippet in supported_evidence if _matches_date_text(snippet, date_value)]
        if matching_evidence:
            single_dates.append(date_value)

    range_start = str(value.get("range_start", "")).strip()
    range_end = str(value.get("range_end", "")).strip()
    precision = str(value.get("precision", "")).strip().lower()
    if precision not in {"exact", "range", "relative", "mixed"}:
        if range_start or range_end:
            precision = "range"
        elif single_dates:
            precision = "exact"
        else:
            precision = ""
    relative_expression = str(value.get("relative_expression", "")).strip()
    range_supported = False
    if range_start or range_end:
        range_supported = bool(
            [
                snippet
                for snippet in supported_evidence
                if (range_start and _matches_date_text(snippet, normalize_date(range_start)))
                or (range_end and _matches_date_text(snippet, normalize_date(range_end)))
                or relative_expression and relative_expression.lower() in snippet.lower()
            ]
        )
    relative_supported = bool(relative_expression and any(relative_expression.lower() in snippet.lower() for snippet in supported_evidence))

    normalized_range_start = normalize_date(range_start) if range_start and range_supported else ""
    normalized_range_end = normalize_date(range_end) if range_end and range_supported else ""
    normalized_relative_expression = relative_expression if relative_supported else ""

    if precision == "range" and not (normalized_range_start or normalized_range_end):
        precision = ""
    elif precision == "relative" and not normalized_relative_expression:
        precision = ""
    elif precision == "mixed" and not (
        single_dates or normalized_range_start or normalized_range_end or normalized_relative_expression
    ):
        precision = ""
    elif precision == "exact" and not single_dates:
        precision = ""

    return {
        "single_dates": single_dates,
        "range_start": normalized_range_start,
        "range_end": normalized_range_end,
        "precision": precision,
        "relative_expression": normalized_relative_expression,
        "evidence": supported_evidence,
    }


def normalize_detection_rules(values):
    if not isinstance(values, list):
        return []
    normalized = []
    for value in values:
        if not isinstance(value, dict):
            continue
        rule_type = str(value.get("type", "")).strip()
        rule_name = str(value.get("name", "")).strip()
        content = str(value.get("content", "")).strip()
        if not content and not rule_name:
            continue
        normalized.append(
            {
                "type": rule_type,
                "name": rule_name,
                "content": content,
                "description": str(value.get("description", "")).strip(),
                "confidence": value.get("confidence") if isinstance(value.get("confidence"), (int, float)) else None,
                "confidence_label": normalize_confidence_label(value.get("confidence_label")) or confidence_label_from_score(value.get("confidence")),
                "reason": normalize_reason(value.get("reason") or value.get("rationale") or value.get("description")),
                "evidence": coerce_text_list(value.get("evidence", [])),
            }
        )
    return normalized


def extract_json_payload(content):
    if not content:
        return None
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        match = JSON_BLOCK_PATTERN.search(content)
        if not match:
            return None
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None
