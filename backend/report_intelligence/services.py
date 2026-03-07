import hashlib
from urllib.parse import urlparse

from django.db import transaction
from django.db.models import Q
from scripts.utils.threat_report_extractor_normalize import parse_summary_object

from report_intelligence.models import (
    ThreatReport,
    ThreatReportAnalysis,
    ThreatReportDetectionRule,
    ThreatReportEntity,
    ThreatReportIOC,
    ThreatReportRelationship,
    ThreatReportTTP,
)


ENTITY_MAPPINGS = {
    "victim_organizations": ThreatReportEntity.EntityType.VICTIM_ORGANIZATION,
    "victim_industries": ThreatReportEntity.EntityType.VICTIM_INDUSTRY,
    "victim_geographies": ThreatReportEntity.EntityType.VICTIM_GEOGRAPHY,
    "threat_actors": ThreatReportEntity.EntityType.THREAT_ACTOR,
    "malware": ThreatReportEntity.EntityType.MALWARE,
    "campaigns": ThreatReportEntity.EntityType.CAMPAIGN,
}


def _canonicalize_url(url: str) -> str:
    return str(url or "").strip()


def _build_content_hash(source_kind: str, original_input: str, context: dict) -> str:
    meta = context.get("meta", {})
    used_source_url = meta.get("used_source_url") or ""
    fetched_url = meta.get("fetched_url") or ""
    summary = context.get("summary", "") or ""
    base = "||".join(
        [
            source_kind or "",
            used_source_url,
            fetched_url,
            original_input or "",
            summary,
        ]
    )
    return hashlib.sha256(base.encode("utf-8")).hexdigest()


def _get_publisher(url: str) -> str:
    if not url:
        return ""
    return urlparse(url).netloc.lower()


def _coerce_title(context: dict, meta: dict) -> str:
    title = meta.get("title") or context.get("title") or ""
    if title:
        return str(title).strip()[:500]
    summary = str(context.get("summary", "")).strip()
    if summary:
        return summary.split(".")[0][:500]
    used_source_url = meta.get("used_source_url") or meta.get("input_url") or ""
    return used_source_url[:500]


def _build_analysis_snapshot(context: dict) -> dict:
    meta = context.get("meta", {}) or {}
    return {
        "summary": context.get("summary", ""),
        "summary_details": context.get("summary_details", {}),
        "attack_dates": context.get("attack_dates", {}),
        "mitre_techniques": context.get("mitre_techniques", []),
        "notes": context.get("notes", []),
        "validation_warnings": context.get("validation_warnings", []),
        "meta": {
            "source_length": meta.get("source_length"),
            "source_kind": meta.get("source_kind"),
            "model_enrichment_used": meta.get("model_enrichment_used"),
            "model_name": meta.get("model_name"),
            "input_url": meta.get("input_url"),
            "fetched_url": meta.get("fetched_url"),
            "resolved_primary_source_url": meta.get("resolved_primary_source_url"),
            "used_source_url": meta.get("used_source_url"),
            "source_resolution_strategy": meta.get("source_resolution_strategy"),
            "source_resolution_confidence": meta.get("source_resolution_confidence"),
        },
    }


def _build_report_metadata(context: dict) -> dict:
    meta = context.get("meta", {}) or {}
    return {
        "source_resolution_strategy": meta.get("source_resolution_strategy"),
        "source_resolution_confidence": meta.get("source_resolution_confidence"),
        "source_length": meta.get("source_length"),
        "article_date": meta.get("article_date"),
        "linked_ioc_sources": (context.get("article_iocs", {}) or {}).get("linked_ioc_sources", []),
    }


def _serialize_entity(entity: ThreatReportEntity) -> dict:
    payload = {
        "name": entity.name,
        "confidence": entity.confidence,
        "confidence_label": entity.confidence_label,
        "reason": entity.reason,
        "evidence": entity.evidence or [],
    }
    if entity.role:
        payload["role"] = entity.role
    if entity.aliases:
        payload["aliases"] = entity.aliases
    return payload


def _serialize_ioc(ioc: ThreatReportIOC) -> dict:
    return {
        "value": ioc.value,
        "type": ioc.ioc_type,
        "confidence": ioc.confidence if ioc.confidence is not None else 1.0,
        "confidence_label": ioc.confidence_label,
        "reason": ioc.reason,
        "source_section": ioc.source_section,
        "source_url": ioc.source_url,
        "context_snippet": ioc.context_snippet,
        "tags": ioc.tags or [],
    }


def _serialize_ttp(ttp: ThreatReportTTP) -> dict:
    return {
        "description": ttp.description,
        "tactics": ttp.tactics or [],
        "techniques": ttp.techniques or [],
        "procedures": ttp.procedures or [],
        "is_emerging": ttp.is_emerging,
        "emergence_reason": ttp.emergence_reason,
        "confidence": ttp.confidence,
        "confidence_label": ttp.confidence_label,
        "reason": ttp.reason,
        "evidence": ttp.evidence or [],
    }


def _serialize_relationship(relationship: ThreatReportRelationship) -> dict:
    return {
        "source": relationship.source_name,
        "source_type": relationship.source_type,
        "relationship": relationship.relationship,
        "target": relationship.target_name,
        "target_type": relationship.target_type,
        "confidence": relationship.confidence,
        "confidence_label": relationship.confidence_label,
        "reason": relationship.reason,
        "evidence": relationship.evidence or [],
        "children": [
            _serialize_relationship(child)
            for child in relationship.children.all().order_by("created", "id")
        ],
    }


def _serialize_detection_rule(rule: ThreatReportDetectionRule) -> dict:
    return {
        "type": rule.rule_type,
        "name": rule.name,
        "content": rule.content,
        "description": rule.description,
        "confidence": rule.confidence,
        "confidence_label": rule.confidence_label,
        "reason": rule.reason,
        "evidence": rule.evidence or [],
    }


def _group_entities(analysis: ThreatReportAnalysis) -> dict:
    groups = {
        "victim_organizations": [],
        "victim_industries": [],
        "victim_geographies": [],
        "threat_actors": [],
        "malware": [],
        "campaigns": [],
    }
    reverse_map = {value: key for key, value in ENTITY_MAPPINGS.items()}
    for entity in analysis.entities.all().order_by("created", "id"):
        key = reverse_map.get(entity.entity_type)
        if key:
            groups[key].append(_serialize_entity(entity))
    return groups


def _build_cached_context(analysis: ThreatReportAnalysis) -> dict:
    snapshot = analysis.snapshot or {}
    article_iocs = {
        "primary": [],
        "legitimate_tools": [],
        "linked_ioc_sources": [],
        "linked_source_iocs": [],
    }
    for ioc in analysis.iocs.all().order_by("created", "id"):
        serialized = _serialize_ioc(ioc)
        if (ioc.source_section or "").strip().lower() == "linked ioc source":
            article_iocs["linked_source_iocs"].append(serialized)
        elif ioc.disposition == ThreatReportIOC.Disposition.PRIMARY:
            article_iocs["primary"].append(serialized)
        elif ioc.disposition == ThreatReportIOC.Disposition.LEGITIMATE_TOOL:
            article_iocs["legitimate_tools"].append(serialized)

    linked_sources = (
        analysis.report.metadata.get("linked_ioc_sources", [])
        if isinstance(analysis.report.metadata, dict)
        else []
    )
    article_iocs["linked_ioc_sources"] = linked_sources or []

    ttps = [_serialize_ttp(ttp) for ttp in analysis.ttps.all().order_by("created", "id")]

    grouped_entities = _group_entities(analysis)
    meta = snapshot.get("meta", {}) if isinstance(snapshot, dict) else {}
    return {
        "summary": analysis.report.summary or snapshot.get("summary", ""),
        "summary_details": analysis.structured_summary or snapshot.get("summary_details", {}),
        "attack_dates": snapshot.get("attack_dates", {}) or {
            "single_dates": [],
            "range_start": "",
            "range_end": "",
            "evidence": [],
        },
        "mitre_techniques": snapshot.get("mitre_techniques", []) or [],
        "notes": snapshot.get("notes", []) or [],
        "validation_warnings": snapshot.get("validation_warnings", []) or [],
        "article_iocs": article_iocs,
        "relationships": [
            _serialize_relationship(relationship)
            for relationship in analysis.relationships.filter(parent__isnull=True).order_by("created", "id")
        ],
        "ttps": ttps,
        "detection_rules": [
            _serialize_detection_rule(rule)
            for rule in analysis.detection_rules.all().order_by("created", "id")
        ],
        "confidence": analysis.confidence,
        "meta": {
            **meta,
            "title": analysis.report.title,
            "article_date": (analysis.report.metadata or {}).get("article_date", ""),
            "source_kind": analysis.report.source_kind,
            "input_url": analysis.report.source_url,
            "fetched_url": analysis.report.fetched_url,
            "resolved_primary_source_url": analysis.report.primary_source_url,
            "used_source_url": analysis.report.used_source_url,
            "model_enrichment_used": analysis.model_enrichment_used,
            "model_name": analysis.model_name,
            "report_id": analysis.report_id,
            "analysis_id": analysis.id,
            "cached_from_db": True,
        },
        **grouped_entities,
    }


def get_cached_context_analysis(url: str) -> dict | None:
    canonical_url = _canonicalize_url(url)
    if not canonical_url:
        return None

    analysis = (
        ThreatReportAnalysis.objects.select_related("report")
        .prefetch_related("entities", "iocs", "ttps", "detection_rules", "relationships__children")
        .filter(
            Q(report__source_url=canonical_url)
            | Q(report__fetched_url=canonical_url)
            | Q(report__primary_source_url=canonical_url)
            | Q(report__used_source_url=canonical_url)
        )
        .order_by("-created")
        .first()
    )
    if analysis is None:
        return None
    return _build_cached_context(analysis)


def _persist_entities(analysis: ThreatReportAnalysis, context: dict) -> None:
    seen = set()
    for field_name, entity_type in ENTITY_MAPPINGS.items():
        for item in context.get(field_name, []) or []:
            name = str(item.get("name", "")).strip()
            if not name:
                continue
            role = str(item.get("role", "")).strip()
            key = (entity_type, name, role)
            if key in seen:
                continue
            seen.add(key)
            ThreatReportEntity.objects.create(
                analysis=analysis,
                entity_type=entity_type,
                name=name,
                role=role,
                aliases=item.get("aliases", []) or [],
                confidence=item.get("confidence"),
                confidence_label=str(item.get("confidence_label", "")).strip(),
                reason=str(item.get("reason", "")).strip(),
                evidence=item.get("evidence", []) or [],
            )


def _persist_article_iocs(analysis: ThreatReportAnalysis, context: dict) -> None:
    article_iocs = context.get("article_iocs", {}) or {}
    seen = set()
    for disposition_key, disposition in (
        ("primary", ThreatReportIOC.Disposition.PRIMARY),
        ("legitimate_tools", ThreatReportIOC.Disposition.LEGITIMATE_TOOL),
        ("linked_source_iocs", ThreatReportIOC.Disposition.PRIMARY),
    ):
        for item in article_iocs.get(disposition_key, []) or []:
            value = str(item.get("value", "")).strip()
            ioc_type = str(item.get("type", "")).strip().lower()
            if not value or not ioc_type:
                continue
            source_section = str(item.get("source_section", "")).strip()
            source_url = str(item.get("source_url", "")).strip()
            key = (value, ioc_type, disposition, source_section, source_url)
            if key in seen:
                continue
            seen.add(key)
            ThreatReportIOC.objects.create(
                analysis=analysis,
                value=value,
                ioc_type=ioc_type,
                disposition=disposition,
                confidence=item.get("confidence"),
                confidence_label=str(item.get("confidence_label", "")).strip(),
                reason=str(item.get("reason", "")).strip(),
                evidence=[str(item.get("context_snippet", "")).strip()] if str(item.get("context_snippet", "")).strip() else [],
                source_section=source_section,
                source_url=source_url,
                context_snippet=str(item.get("context_snippet", "")).strip(),
                tags=item.get("tags", []) or [],
            )


def _persist_ttps(analysis: ThreatReportAnalysis, context: dict) -> None:
    seen = set()
    for item in context.get("ttps", []) or []:
        description = str(item.get("description", "")).strip()
        if not description:
            continue
        key = (description, bool(item.get("is_emerging")))
        if key in seen:
            continue
        seen.add(key)
        ThreatReportTTP.objects.create(
            analysis=analysis,
            description=description,
            tactics=item.get("tactics", []) or [],
            techniques=item.get("techniques", []) or [],
            procedures=item.get("procedures", []) or [],
            is_emerging=bool(item.get("is_emerging")),
            emergence_reason=str(item.get("emergence_reason", "")).strip(),
            confidence=item.get("confidence"),
            confidence_label=str(item.get("confidence_label", "")).strip(),
            reason=str(item.get("reason", "")).strip(),
            evidence=item.get("evidence", []) or [],
        )


def _persist_relationships(analysis: ThreatReportAnalysis, context: dict) -> None:
    seen = set()

    def _create_relationship(item: dict, parent: ThreatReportRelationship | None = None) -> None:
        source_name = str(item.get("source", "")).strip()
        target_name = str(item.get("target", "")).strip()
        relationship = str(item.get("relationship", "")).strip()
        source_type = str(item.get("source_type", "")).strip() or "unknown"
        target_type = str(item.get("target_type", "")).strip() or "unknown"
        if not source_name or not target_name or not relationship:
            return

        parent_id = parent.pk if parent else None
        key = (parent_id, source_type, source_name, relationship, target_name, target_type)
        if key in seen:
            return
        seen.add(key)

        relationship_row = ThreatReportRelationship.objects.create(
            analysis=analysis,
            parent=parent,
            source_name=source_name,
            source_type=source_type,
            relationship=relationship,
            target_name=target_name,
            target_type=target_type,
            confidence=item.get("confidence"),
            confidence_label=str(item.get("confidence_label", "")).strip(),
            reason=str(item.get("reason", "")).strip(),
            evidence=item.get("evidence", []) or [],
        )
        for child in item.get("children", []) or []:
            if isinstance(child, dict):
                _create_relationship(child, relationship_row)

    for item in context.get("relationships", []) or []:
        if isinstance(item, dict):
            _create_relationship(item)


def _persist_detection_rules(analysis: ThreatReportAnalysis, context: dict) -> None:
    seen = set()
    for item in context.get("detection_rules", []) or []:
        rule_type = str(item.get("type", "")).strip()
        if not rule_type:
            continue
        name = str(item.get("name", "")).strip()
        content = str(item.get("content", "")).strip()
        key = (rule_type, name, content)
        if key in seen:
            continue
        seen.add(key)
        ThreatReportDetectionRule.objects.create(
            analysis=analysis,
            rule_type=rule_type,
            name=name,
            content=content,
            description=str(item.get("description", "")).strip(),
            confidence=item.get("confidence"),
            confidence_label=str(item.get("confidence_label", "")).strip(),
            reason=str(item.get("reason", "")).strip(),
            evidence=item.get("evidence", []) or [],
        )


@transaction.atomic
def persist_context_analysis(original_input: str, source_kind: str, context: dict) -> ThreatReportAnalysis:
    meta = context.get("meta", {}) or {}
    content_hash = _build_content_hash(source_kind, original_input, context)
    report_metadata = _build_report_metadata(context)
    report = ThreatReport.objects.filter(
        content_hash=content_hash,
        used_source_url=meta.get("used_source_url", "") or "",
    ).first()

    if report is None:
        report = ThreatReport.objects.create(
            source_kind=source_kind,
            source_url=str(meta.get("input_url", "") or "").strip(),
            fetched_url=str(meta.get("fetched_url", "") or "").strip(),
            primary_source_url=str(meta.get("resolved_primary_source_url", "") or "").strip(),
            used_source_url=str(meta.get("used_source_url", "") or "").strip(),
            content_hash=content_hash,
            title=_coerce_title(context, meta),
            publisher=_get_publisher(str(meta.get("used_source_url", "") or meta.get("input_url", "") or "")),
            source_text="" if source_kind == ThreatReport.SourceKind.URL else original_input,
            summary=str(context.get("summary", "")).strip(),
            metadata=report_metadata,
        )
    else:
        report.source_url = str(meta.get("input_url", "") or report.source_url).strip()
        report.fetched_url = str(meta.get("fetched_url", "") or report.fetched_url).strip()
        report.primary_source_url = str(meta.get("resolved_primary_source_url", "") or report.primary_source_url).strip()
        report.used_source_url = str(meta.get("used_source_url", "") or report.used_source_url).strip()
        report.title = _coerce_title(context, meta)
        report.publisher = _get_publisher(report.used_source_url or report.source_url)
        report.summary = str(context.get("summary", "")).strip()
        if source_kind != ThreatReport.SourceKind.URL:
            report.source_text = original_input
        report.metadata = report_metadata
        report.save()

    analysis = ThreatReportAnalysis.objects.create(
        report=report,
        model_name=str(meta.get("model_name", "")).strip(),
        model_enrichment_used=bool(meta.get("model_enrichment_used")),
        confidence=context.get("confidence"),
        snapshot=_build_analysis_snapshot(context),
        structured_summary=context.get("summary_details", {}) or parse_summary_object(context.get("summary", "")) or {},
        validation_warnings=context.get("validation_warnings", []) or [],
    )

    _persist_entities(analysis, context)
    _persist_article_iocs(analysis, context)
    _persist_ttps(analysis, context)
    _persist_relationships(analysis, context)
    _persist_detection_rules(analysis, context)
    return analysis
