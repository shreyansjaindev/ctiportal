from scripts.utils.threat_report_extractor_article_iocs import extract_article_iocs_from_html
from scripts.utils.threat_report_extractor_constants import MITRE_TECHNIQUE_PATTERN
from scripts.utils.threat_report_extractor_llm import call_llm, merge_model_context
from scripts.utils.threat_report_extractor_normalize import (
    default_context_payload,
    extract_dates,
    ioc_entries_to_grouped,
)
from scripts.utils.threat_report_extractor_source import resolve_source_input


def analyze_threat_report(query, source_kind="text"):
    resolved = resolve_source_input(query, source_kind)
    source_text = resolved.pop("source_text")
    source_info = {
        "input_url": "",
        "fetched_url": "",
        "resolved_primary_source_url": "",
        "used_source_url": "",
        "source_resolution_strategy": "none",
        "source_resolution_confidence": 0.0,
        "warnings": [],
        "source_html": "",
        "title": "",
        "article_date": "",
    }
    source_info.update(resolved)

    mitre_techniques = sorted({match.upper() for match in MITRE_TECHNIQUE_PATTERN.findall(source_text)})
    attack_date_candidates = extract_dates(source_text)
    payload = default_context_payload()
    payload["mitre_techniques"] = mitre_techniques

    deterministic_iocs = {}
    if source_info.get("source_html") and source_info.get("used_source_url"):
        payload["article_iocs"] = extract_article_iocs_from_html(
            source_info["source_html"],
            source_info["used_source_url"],
        )
        deterministic_iocs = ioc_entries_to_grouped(payload["article_iocs"].get("primary", []))

    validation_warnings = []
    validation_warnings.extend(source_info["warnings"])
    model_payload, model_warning = call_llm(
        source_text,
        deterministic_iocs,
        attack_date_candidates,
        mitre_techniques,
    )
    if model_warning:
        validation_warnings.append(model_warning)
    if model_payload:
        payload = merge_model_context(payload, model_payload)

    return {
        **payload,
        "validation_warnings": validation_warnings,
        "meta": {
            "source_length": len(source_text),
            "source_kind": source_kind,
            "model_enrichment_used": bool(model_payload),
            "model_name": str(model_payload.get("_model_name", "")) if model_payload else "",
            **{key: value for key, value in source_info.items() if key not in {"warnings", "source_html"}},
        },
    }
__all__ = ["analyze_threat_report"]
