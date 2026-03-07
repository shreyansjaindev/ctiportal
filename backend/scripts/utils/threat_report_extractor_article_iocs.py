import csv
from io import StringIO
from urllib.parse import urljoin, urlparse

from scripts.utils.threat_report_extractor_constants import (
    A_TAG_PATTERN,
    HEADING_TEXT_PATTERN,
    IOCS_HEADING_HINTS,
    LEGITIMATE_TOOL_HINTS,
    SECTION_PATTERN,
)
from scripts.utils.threat_report_extractor_normalize import dedupe_preserve_order, merge_ioc_entries
from scripts.utils.threat_report_extractor_source import fetch_url_payload
from scripts.utils.textformatter import extract_iocs


def extract_link_candidates_from_section(section_html, base_url):
    candidates = []
    seen = set()
    for href, label_html in A_TAG_PATTERN.findall(section_html or ""):
        absolute = urljoin(base_url, href.strip())
        if not absolute.startswith(("http://", "https://")) or absolute in seen:
            continue
        seen.add(absolute)
        label = " ".join(label_html.split())
        candidates.append({"url": absolute, "label": label, "section_html": section_html})
    return candidates


def artifact_fetch_url(url):
    parsed = urlparse(url)
    if parsed.netloc.lower() == "github.com" and "/blob/" in parsed.path:
        parts = parsed.path.strip("/").split("/")
        if len(parts) >= 5 and parts[2] == "blob":
            owner, repo, _, branch, *rest = parts
            raw_path = "/".join(rest)
            return f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{raw_path}"
    return url


def anchor_urls_for_section(section_html, base_url):
    return {candidate["url"] for candidate in extract_link_candidates_from_section(section_html, base_url)}


def section_tags(heading_text, body_text):
    combined = f"{heading_text} {body_text}".lower()
    tags = []
    for hint in ("infrastructure", "c2", "backdoor", "loader", "credential_access", "tooling", "hashes"):
        if hint in combined:
            tags.append(hint)
    return dedupe_preserve_order(tags)


def extract_legitimate_tools(text):
    lowered = text.lower()
    found = []
    for value in LEGITIMATE_TOOL_HINTS:
        if value in lowered:
            found.append(value)
    return dedupe_preserve_order(found)


def score_section(heading_text, body_text):
    combined_heading = heading_text.lower()
    combined_body = body_text.lower()
    score = 0
    if any(hint in combined_heading for hint in IOCS_HEADING_HINTS):
        score += 5
    if "<table" in body_text.lower():
        score += 2
    if "<ul" in body_text.lower() or "<ol" in body_text.lower():
        score += 1
    if "<pre" in body_text.lower() or "<code" in body_text.lower():
        score += 2
    if any(value in combined_body for value in ("md5", "sha1", "sha256", "sha512", "domain", "ip address", "ioc", "indicator")):
        score += 2
    return score


def is_explicit_ioc_heading(heading_text):
    lowered = heading_text.lower()
    return any(hint in lowered for hint in ("ioc", "indicator", "observables", "artifacts"))


def is_tail_ioc_section(section):
    return section["position"] >= 0.75 and section["score"] >= 4


def score_linked_ioc_source(candidate):
    score = 0
    if candidate.get("section_score", 0) >= 4:
        score += 3
    if candidate.get("explicit_ioc_claim"):
        score += 4
    if candidate.get("artifact_like"):
        score += 3
    return score


def candidate_has_explicit_ioc_claim(candidate):
    context_text = " ".join(
        [str(candidate.get("heading_text", "")), str(candidate.get("label", "")), str(candidate.get("body_text", ""))]
    ).lower()
    has_ioc_language = "indicator of compromise" in context_text or "iocs" in context_text
    has_report_binding = any(
        phrase in context_text
        for phrase in ("this research", "this report", "from this", "for this research", "for this report", "all future research")
    )
    return has_ioc_language and has_report_binding


def linked_source_overlaps_report_context(linked_source_iocs, primary_ioc_entries):
    primary_pairs = {(item.get("type"), item.get("value")) for item in primary_ioc_entries}
    if not primary_pairs:
        return False
    linked_pairs = {(item.get("type"), item.get("value")) for item in linked_source_iocs}
    return bool(primary_pairs & linked_pairs)


def is_structured_artifact_source(url):
    lowered = url.lower()
    return lowered.endswith((".txt", ".csv", ".json")) or "raw.githubusercontent.com" in lowered


def _clean_tag(value):
    return str(value or "").strip().lower().replace(" ", "_").replace("-", "_")


def _meaningful_row_tags(row):
    tags = []
    ignored_keys = {"indicator_type", "type", "data", "value", "source"}
    for key, value in row.items():
        key_text = _clean_tag(key)
        value_text = str(value or "").strip()
        if not value_text:
            continue
        if key_text in ignored_keys:
            continue
        lowered_value = value_text.lower()
        if lowered_value.startswith(("http://", "https://")):
            continue
        if len(value_text) > 80:
            continue
        if len(value_text) >= 24 and all(char in "0123456789abcdefABCDEF" for char in value_text):
            continue
        tags.append(value_text)
    return dedupe_preserve_order([tag for tag in tags if tag])


def _row_context_and_tags(row):
    context_parts = []
    for key, value in row.items():
        key_text = str(key or "").strip()
        value_text = str(value or "").strip()
        if not value_text:
            continue
        if key_text:
            context_parts.append(f"{key_text}: {value_text}")
        else:
            context_parts.append(value_text)
    return " | ".join(context_parts)[:500], _meaningful_row_tags(row)


def _row_indicator_type(row):
    return _clean_tag(row.get("indicator_type") or row.get("type") or "")


def _row_primary_value(row):
    return str(row.get("data") or row.get("value") or "").strip()


def _row_should_be_skipped(row):
    indicator_type = _row_indicator_type(row)
    return indicator_type in {"source", "reference"}


def _extract_ioc_values_from_row(row):
    primary_value = _row_primary_value(row)
    if not primary_value or _row_should_be_skipped(row):
        return {}
    return extract_iocs(primary_value)


def _parse_csv_linked_source(payload, candidate):
    rows = list(csv.DictReader(StringIO(payload.get("html", ""))))
    if not rows:
        return []

    flattened = []
    for row in rows:
        row_iocs = _extract_ioc_values_from_row(row)
        context_snippet, row_tags = _row_context_and_tags(row)
        for key, values in row_iocs.items():
            ioc_type = key.rstrip("s")
            for value in dedupe_preserve_order(values):
                value_str = str(value).strip()
                if not value_str or value_str in {candidate["url"], payload.get("url", "")}:
                    continue
                flattened.append(
                    {
                        "value": value_str,
                        "type": ioc_type,
                        "confidence": 0.95,
                        "source_section": "linked IOC source",
                        "source_url": candidate["url"],
                        "context_snippet": context_snippet or candidate["label"] or candidate["body_text"][:300],
                        "tags": row_tags,
                    }
                )
    return flattened


def _parse_generic_linked_source(payload, candidate):
    linked_iocs = extract_iocs(payload.get("text", ""))
    flattened = []
    for key, values in linked_iocs.items():
        ioc_type = key.rstrip("s")
        for value in dedupe_preserve_order(values):
            value_str = str(value).strip()
            if not value_str or value_str in {candidate["url"], payload.get("url", "")}:
                continue
            flattened.append(
                {
                    "value": value_str,
                    "type": ioc_type,
                    "confidence": 0.95,
                    "source_section": "linked IOC source",
                    "source_url": candidate["url"],
                    "context_snippet": candidate["label"] or candidate["body_text"][:300],
                    "tags": [],
                }
            )
    return flattened


def _parse_linked_source_iocs(payload, candidate):
    content_type = str(payload.get("content_type", "")).lower()
    source_url = str(payload.get("url", "")).lower()
    if "csv" in content_type or source_url.endswith(".csv"):
        return _parse_csv_linked_source(payload, candidate)
    return _parse_generic_linked_source(payload, candidate)


def extract_article_iocs_from_html(html, base_url):
    sections = []
    total_sections = max(1, len(SECTION_PATTERN.findall(html or "")))
    linked_source_iocs = []
    linked_ioc_sources = []

    for index, (heading_html, body_html) in enumerate(SECTION_PATTERN.findall(html or "")):
        heading_text = " ".join(HEADING_TEXT_PATTERN.sub(r"\1", heading_html).split())
        body_text = " ".join(body_html.split())
        section = {
            "heading_text": heading_text,
            "body_text": body_text,
            "section_html": body_html,
            "score": score_section(heading_text, body_html),
            "position": (index + 1) / total_sections,
            "explicit_ioc_heading": is_explicit_ioc_heading(heading_text),
        }
        sections.append(section)

    primary_iocs = []
    legitimate_tool_entries = []
    for section in sections:
        if not (section["explicit_ioc_heading"] or is_tail_ioc_section(section)):
            continue
        raw_iocs = extract_iocs(section["body_text"])
        anchor_urls = anchor_urls_for_section(section["section_html"], base_url)
        tags = section_tags(section["heading_text"], section["body_text"])
        for key, values in raw_iocs.items():
            ioc_type = key.rstrip("s")
            for value in dedupe_preserve_order(values):
                value_str = str(value).strip()
                if not value_str:
                    continue
                if ioc_type == "url" and value_str in anchor_urls:
                    continue
                primary_iocs.append(
                    {
                        "value": value_str,
                        "type": ioc_type,
                        "confidence": min(1.0, 0.5 + (section["score"] * 0.05)),
                        "source_section": section["heading_text"] or "IOC section",
                        "source_url": base_url,
                        "context_snippet": section["body_text"][:300],
                        "tags": tags,
                    }
                )
        for tool in extract_legitimate_tools(section["body_text"]):
            legitimate_tool_entries.append(
                {
                    "value": tool,
                    "type": "tool",
                    "confidence": min(1.0, 0.5 + (section["score"] * 0.05)),
                    "source_section": section["heading_text"] or "IOC section",
                    "source_url": base_url,
                    "context_snippet": section["body_text"][:300],
                    "tags": dedupe_preserve_order([*tags, "legitimate_tool"]),
                }
            )

    primary_sections = [section for section in sections if section["explicit_ioc_heading"] or is_tail_ioc_section(section)]
    linked_candidates = []
    for section in primary_sections:
        for candidate in extract_link_candidates_from_section(section["section_html"], base_url):
            linked_candidates.append(
                {
                    **candidate,
                    "heading_text": section["heading_text"],
                    "body_text": section["body_text"],
                    "section_score": section["score"],
                    "explicit_ioc_claim": candidate_has_explicit_ioc_claim(
                        {"heading_text": section["heading_text"], "label": candidate["label"], "body_text": section["body_text"]}
                    ),
                    "artifact_like": is_structured_artifact_source(candidate["url"]),
                }
            )

    for candidate in linked_candidates:
        if not candidate.get("artifact_like"):
            continue
        candidate["score"] = score_linked_ioc_source(candidate)
        if candidate["score"] < 5:
            continue
        fetch_url = artifact_fetch_url(candidate["url"])
        try:
            payload = fetch_url_payload(fetch_url)
        except Exception:
            continue
        flattened = _parse_linked_source_iocs(payload, candidate)
        if not flattened:
            continue
        if not candidate["explicit_ioc_claim"] and not linked_source_overlaps_report_context(flattened, primary_iocs):
            continue
        linked_source_iocs.extend(flattened)
        linked_ioc_sources.append(candidate["url"])

    return {
        "primary": merge_ioc_entries(primary_iocs + linked_source_iocs),
        "secondary": [],
        "legitimate_tools": merge_ioc_entries(legitimate_tool_entries),
        "linked_source_iocs": merge_ioc_entries(linked_source_iocs),
        "linked_ioc_sources": dedupe_preserve_order(linked_ioc_sources),
    }
