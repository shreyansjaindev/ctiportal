import hashlib
import json
import random
import time

import requests

from scripts.utils.threat_report_extractor_constants import (
    THREAT_REPORT_EXTRACTOR_APP_NAME,
    THREAT_REPORT_EXTRACTOR_BASE_URL,
    THREAT_REPORT_EXTRACTOR_CACHE_TTL_SECONDS,
    THREAT_REPORT_EXTRACTOR_FALLBACK_MODELS,
    THREAT_REPORT_EXTRACTOR_MAX_RETRIES,
    THREAT_REPORT_EXTRACTOR_MODEL,
    THREAT_REPORT_EXTRACTOR_RETRY_BACKOFF_SECONDS,
    THREAT_REPORT_EXTRACTOR_SITE_URL,
    OPENROUTER_API_KEY,
    MITRE_TECHNIQUE_PATTERN,
    MODEL_RESPONSE_CACHE,
    RATE_LIMIT_CACHE,
)
from scripts.utils.threat_report_extractor_filtering import filter_relationships, filter_victim_entities
from scripts.utils.threat_report_extractor_normalize import (
    coerce_summary_text,
    coerce_text_list,
    extract_json_payload,
    normalize_attack_dates,
    normalize_detection_rules,
    normalize_entity_list,
    normalize_relationships,
    normalize_ttps,
    parse_summary_object,
)


def llm_is_configured():
    return bool(THREAT_REPORT_EXTRACTOR_BASE_URL and THREAT_REPORT_EXTRACTOR_MODEL)


def get_cache_key(model_name, source_text, deterministic_iocs, attack_dates, mitre_techniques):
    payload = json.dumps(
        {
            "model": model_name,
            "source_text": source_text,
            "deterministic_iocs": deterministic_iocs,
            "attack_dates": attack_dates,
            "mitre_techniques": mitre_techniques,
        },
        sort_keys=True,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def get_cached_model_payload(cache_key):
    entry = MODEL_RESPONSE_CACHE.get(cache_key)
    if not entry:
        return None
    if entry["expires_at"] <= time.time():
        MODEL_RESPONSE_CACHE.pop(cache_key, None)
        return None
    return entry["payload"]


def set_cached_model_payload(cache_key, payload):
    MODEL_RESPONSE_CACHE[cache_key] = {"payload": payload, "expires_at": time.time() + THREAT_REPORT_EXTRACTOR_CACHE_TTL_SECONDS}


def get_rate_limited_until(cache_key):
    entry = RATE_LIMIT_CACHE.get(cache_key)
    if not entry:
        return None
    if entry <= time.time():
        RATE_LIMIT_CACHE.pop(cache_key, None)
        return None
    return entry


def set_rate_limited_until(cache_key, retry_after_seconds):
    RATE_LIMIT_CACHE[cache_key] = time.time() + max(1, retry_after_seconds)


def get_retry_delay_seconds(response, attempt):
    if response is not None:
        retry_after = response.headers.get("Retry-After")
        if retry_after:
            try:
                return max(1.0, float(retry_after))
            except ValueError:
                pass
    base_delay = THREAT_REPORT_EXTRACTOR_RETRY_BACKOFF_SECONDS * (2 ** attempt)
    jitter = random.uniform(0.0, 1.0)
    return max(1.0, base_delay + jitter)


def build_llm_messages(source_text, deterministic_iocs, attack_dates, mitre_techniques):
    schema = {
        "summary": "string",
        "victim_organizations": [{"name": "string", "confidence": 0.0, "confidence_label": "low|medium|high", "reason": "string", "evidence": ["string"]}],
        "victim_industries": [{"name": "string", "confidence": 0.0, "confidence_label": "low|medium|high", "reason": "string", "evidence": ["string"]}],
        "victim_geographies": [{"name": "string", "confidence": 0.0, "confidence_label": "low|medium|high", "reason": "string", "evidence": ["string"]}],
        "threat_actors": [{"name": "string", "aliases": ["string"], "confidence": 0.0, "confidence_label": "low|medium|high", "reason": "string", "evidence": ["string"]}],
        "malware": [{"name": "string", "aliases": ["string"], "confidence": 0.0, "confidence_label": "low|medium|high", "reason": "string", "evidence": ["string"]}],
        "relationships": [{"source": "string", "source_type": "threat_actor|malware|campaign|organization|industry|geography|tool|unknown", "relationship": "alias_of|variant_of|uses|drops|loads|communicates_with|associated_with|linked_to", "target": "string", "target_type": "threat_actor|malware|campaign|organization|industry|geography|tool|unknown", "confidence": 0.0, "confidence_label": "low|medium|high", "reason": "string", "evidence": ["string"], "children": ["same relationship object shape"]}],
        "campaigns": [{"name": "string", "confidence": 0.0, "confidence_label": "low|medium|high", "reason": "string", "evidence": ["string"]}],
        "attack_dates": {"single_dates": ["YYYY-MM-DD or full timestamp if exact time is stated"], "range_start": "YYYY-MM-DD", "range_end": "YYYY-MM-DD", "precision": "exact|range|relative|mixed", "relative_expression": "string", "evidence": ["string"]},
        "ttps": [{"description": "string", "tactics": ["string"], "techniques": ["T0000"], "procedures": ["string"], "is_emerging": "boolean", "emergence_reason": "string", "confidence": 0.0, "confidence_label": "low|medium|high", "reason": "string", "evidence": ["string"]}],
        "detection_rules": [{"type": "sigma|snort|yara|suricata|clamav|other", "name": "string", "content": "string", "description": "string", "confidence": 0.0, "confidence_label": "low|medium|high", "reason": "string", "evidence": ["string"]}],
        "mitre_techniques": ["T0000"],
        "notes": ["string"],
        "confidence": 0.0,
    }
    system_prompt = (
        "You are a cybersecurity threat intelligence extraction engine. "
        "Return only valid JSON. Do not include markdown fences. "
        "Do not invent entities. If evidence is absent, leave fields empty. "
        "Use the exact schema requested. "
        "Everything must be based on the provided report or article only. "
        "Do not generalize from historical behavior, trends, or outside knowledge. "
        "For every extracted entity, association, TTP, emerging item, and detection rule, include confidence_label and reason when the source provides an assessment basis. "
        "Preserve explicit wording such as low, medium, or high confidence whenever stated in the source. "
        "If the source does not support a reason, leave reason empty instead of inventing one. "
        "Do not extract reporting vendors, publishers, researchers, or security companies as standalone organization fields. "
        "Use them only as source metadata when relevant, not as intelligence entities. "
        "Do not place vendors, researchers, publishers, or security companies into victim fields unless the source explicitly says they were affected. "
        "Prefer victim_industries or victim_geographies when the article describes broad victim groups instead of naming a specific organization. "
        "Only include victim industries when the article body explicitly describes the victims as belonging to that industry. "
        "Do not use website navigation, boilerplate, product copy, marketing text, or generic vendor industry lists as victim evidence. "
        "Only include a victim organization, industry, or geography when the source explicitly supports it with victim or impact context. "
        "Attack dates must reflect the incident timeline described in the source. "
        "Do not include publication dates, footer dates, generic historical dates, unrelated timestamps, compile times, build times, or every parsed date candidate. "
        "If the source gives a relative time reference such as 'last week', 'earlier this month', or 'in late October', keep it in attack_dates.relative_expression and set precision accordingly instead of inventing an exact date. "
        "If the source gives an exact timestamp or date for the incident, keep it in single_dates and set precision to exact. "
        "If the source only supports a date range, use range_start and range_end with precision set to range. "
        "If the report does not clearly support a date as part of the attack or campaign timeline, leave attack_dates empty. "
        "For TTPs, include tactics, technique IDs when supported, and concrete procedures from the text whenever available. "
        "Use threat_actors and malware for the primary named actors and malware families or tools in the activity. "
        "Do not create separate associated actor or associated malware lists. "
        "If the source describes overlaps, aliases, reuse, lineage, or links between entities, capture them only in relationships with source_type and target_type. "
        "Relationships can be nested when one relationship directly supports or contains more specific sub-relationships. "
        "Do not treat generic comparisons, examples, publicly available tools, or background references as relationships. "
        "Do not lose important lineage information such as 'TernDoor is a variant of CrowDoor'. "
        "If the source explicitly describes a technique or procedure as new, novel, emerging, uncommon, or previously undocumented, keep it in ttps and set is_emerging to true with emergence_reason. "
        "If the source provides defensive content such as Sigma, Snort, Suricata, YARA, ClamAV, EDR detections, or other detection rules, capture them in detection_rules with the rule type and content when available. "
        "Do not omit important defensive artifacts just because they are at the end of the article."
    )
    user_prompt = (
        "Extract structured CTI context from the source text.\n\n"
        f"Existing deterministic IOCs from scored IOC sections or linked IOC sources: {json.dumps(deterministic_iocs)}\n"
        f"Existing deterministic date candidates for context only: {json.dumps(attack_dates)}\n"
        f"Existing ATT&CK IDs found by regex: {json.dumps(mitre_techniques)}\n\n"
        f"Required schema: {json.dumps(schema)}\n\n"
        f"Source text:\n{source_text[:50000]}"
    )
    return [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}]


def call_llm(source_text, deterministic_iocs, attack_dates, mitre_techniques):
    if not llm_is_configured():
        return None, "Model enrichment is not configured. Set THREAT_REPORT_EXTRACTOR_BASE_URL and THREAT_REPORT_EXTRACTOR_MODEL."
    headers = {"Content-Type": "application/json"}
    if OPENROUTER_API_KEY:
        headers["Authorization"] = f"Bearer {OPENROUTER_API_KEY}"
    if "openrouter.ai" in THREAT_REPORT_EXTRACTOR_BASE_URL:
        if THREAT_REPORT_EXTRACTOR_SITE_URL:
            headers["HTTP-Referer"] = THREAT_REPORT_EXTRACTOR_SITE_URL
        if THREAT_REPORT_EXTRACTOR_APP_NAME:
            headers["X-Title"] = THREAT_REPORT_EXTRACTOR_APP_NAME
    endpoint = f"{THREAT_REPORT_EXTRACTOR_BASE_URL.rstrip('/')}/chat/completions"
    messages = build_llm_messages(source_text, deterministic_iocs, attack_dates, mitre_techniques)
    candidate_models = [THREAT_REPORT_EXTRACTOR_MODEL, *THREAT_REPORT_EXTRACTOR_FALLBACK_MODELS]
    seen_models = set()
    ordered_models = []
    for model_name in candidate_models:
        if model_name in seen_models:
            continue
        seen_models.add(model_name)
        ordered_models.append(model_name)
    last_error = ""
    for model_name in ordered_models:
        cache_key = get_cache_key(model_name, source_text, deterministic_iocs, attack_dates, mitre_techniques)
        cached_payload = get_cached_model_payload(cache_key)
        if cached_payload is not None:
            payload = dict(cached_payload)
            payload["_model_name"] = model_name
            return payload, None
        rate_limited_until = get_rate_limited_until(cache_key)
        if rate_limited_until is not None:
            last_error = f"Model enrichment rate-limited for {model_name}. Retry after {max(1, int(rate_limited_until - time.time()))} seconds."
            continue
        payload = {"model": model_name, "messages": messages, "temperature": 0.1, "response_format": {"type": "json_object"}}
        for attempt in range(THREAT_REPORT_EXTRACTOR_MAX_RETRIES):
            try:
                response = requests.post(endpoint, headers=headers, json=payload, timeout=90)
                response.raise_for_status()
                data = response.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                parsed = extract_json_payload(content)
                if not isinstance(parsed, dict):
                    last_error = f"Model {model_name} did not return valid JSON."
                    break
                parsed["_model_name"] = model_name
                set_cached_model_payload(cache_key, parsed)
                return parsed, None
            except requests.HTTPError as exc:
                status_code = exc.response.status_code if exc.response is not None else None
                last_error = f"Model enrichment failed for {model_name}: {exc}"
                should_retry = status_code in {408, 409, 425, 429, 500, 502, 503, 504}
                if status_code == 429:
                    retry_delay = get_retry_delay_seconds(exc.response, attempt)
                    set_rate_limited_until(cache_key, retry_delay)
                if not should_retry or attempt == THREAT_REPORT_EXTRACTOR_MAX_RETRIES - 1:
                    break
                time.sleep(get_retry_delay_seconds(exc.response, attempt))
            except requests.RequestException as exc:
                last_error = f"Model enrichment failed for {model_name}: {exc}"
                if attempt == THREAT_REPORT_EXTRACTOR_MAX_RETRIES - 1:
                    break
                time.sleep(get_retry_delay_seconds(None, attempt))
    if "429" in last_error or "rate-limited" in last_error.lower():
        return None, "Model enrichment is temporarily rate-limited by the provider. Wait briefly and try again."
    return None, last_error or "Model enrichment failed."


def merge_model_context(base_payload, model_payload):
    merged = {**base_payload}
    merged["summary_details"] = parse_summary_object(model_payload.get("summary", "")) or {}
    merged["summary"] = coerce_summary_text(model_payload.get("summary", ""))
    merged["victim_organizations"] = filter_victim_entities(normalize_entity_list(model_payload.get("victim_organizations", [])), entity_kind="organization")
    merged["victim_industries"] = filter_victim_entities(normalize_entity_list(model_payload.get("victim_industries", [])), entity_kind="industry")
    merged["victim_geographies"] = filter_victim_entities(normalize_entity_list(model_payload.get("victim_geographies", [])), entity_kind="geography")
    merged["threat_actors"] = normalize_entity_list(model_payload.get("threat_actors", []))
    merged["malware"] = normalize_entity_list(model_payload.get("malware", []))
    merged["relationships"] = filter_relationships(normalize_relationships(model_payload.get("relationships", model_payload.get("malware_relationships", []))))
    merged["campaigns"] = normalize_entity_list(model_payload.get("campaigns", []))
    merged["notes"] = coerce_text_list(model_payload.get("notes", []))
    merged["detection_rules"] = normalize_detection_rules(model_payload.get("detection_rules", []))
    merged["confidence"] = model_payload.get("confidence") if isinstance(model_payload.get("confidence"), (int, float)) else None
    merged["ttps"] = normalize_ttps(model_payload.get("ttps", []))
    merged["attack_dates"] = normalize_attack_dates(model_payload.get("attack_dates", {}))
    merged["mitre_techniques"] = sorted(
        {
            *base_payload.get("mitre_techniques", []),
            *{
                match.upper()
                for value in coerce_text_list(model_payload.get("mitre_techniques", []))
                for match in MITRE_TECHNIQUE_PATTERN.findall(value)
            },
            *{technique for ttp in merged["ttps"] for technique in ttp.get("techniques", [])},
        }
    )
    return merged
