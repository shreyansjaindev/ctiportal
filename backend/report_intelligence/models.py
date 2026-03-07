from django.db import models


class ThreatReport(models.Model):
    class SourceKind(models.TextChoices):
        TEXT = "text", "Text"
        URL = "url", "URL"
        FILE = "file", "File"

    created = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)
    source_kind = models.CharField(max_length=16, choices=SourceKind.choices)
    source_url = models.URLField(max_length=2000, blank=True)
    fetched_url = models.URLField(max_length=2000, blank=True)
    primary_source_url = models.URLField(max_length=2000, blank=True)
    used_source_url = models.URLField(max_length=2000, blank=True)
    content_hash = models.CharField(max_length=64, db_index=True)
    title = models.CharField(max_length=500, blank=True)
    publisher = models.CharField(max_length=255, blank=True)
    source_text = models.TextField(blank=True)
    summary = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["source_kind", "created"]),
            models.Index(fields=["used_source_url"]),
            models.Index(fields=["primary_source_url"]),
        ]

    def __str__(self):
        return self.used_source_url or self.source_url or f"Report {self.pk}"


class ThreatReportAnalysis(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    report = models.ForeignKey(
        ThreatReport,
        on_delete=models.CASCADE,
        related_name="analyses",
    )
    extractor_version = models.CharField(max_length=32, default="v1")
    model_name = models.CharField(max_length=255, blank=True)
    model_enrichment_used = models.BooleanField(default=False)
    confidence = models.FloatField(null=True, blank=True)
    snapshot = models.JSONField(default=dict, blank=True)
    structured_summary = models.JSONField(default=dict, blank=True)
    validation_warnings = models.JSONField(default=list, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["created"]),
            models.Index(fields=["model_enrichment_used"]),
        ]

    def __str__(self):
        return f"Analysis {self.pk} for report {self.report_id}"


class ThreatReportEntity(models.Model):
    class EntityType(models.TextChoices):
        VICTIM_ORGANIZATION = "victim_organization", "Victim Organization"
        VICTIM_INDUSTRY = "victim_industry", "Victim Industry"
        VICTIM_GEOGRAPHY = "victim_geography", "Victim Geography"
        THREAT_ACTOR = "threat_actor", "Threat Actor"
        MALWARE = "malware", "Malware"
        CAMPAIGN = "campaign", "Campaign"

    created = models.DateTimeField(auto_now_add=True)
    analysis = models.ForeignKey(
        ThreatReportAnalysis,
        on_delete=models.CASCADE,
        related_name="entities",
    )
    entity_type = models.CharField(max_length=64, choices=EntityType.choices)
    name = models.CharField(max_length=500)
    role = models.CharField(max_length=64, blank=True)
    aliases = models.JSONField(default=list, blank=True)
    confidence = models.FloatField(null=True, blank=True)
    confidence_label = models.CharField(max_length=16, blank=True)
    reason = models.TextField(blank=True)
    evidence = models.JSONField(default=list, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["entity_type", "name"]),
            models.Index(fields=["analysis", "entity_type"]),
        ]
        unique_together = ("analysis", "entity_type", "name", "role")

    def __str__(self):
        return f"{self.name} ({self.entity_type})"


class ThreatReportIOC(models.Model):
    class IOCType(models.TextChoices):
        URL = "url", "URL"
        DOMAIN = "domain", "Domain"
        IPV4 = "ipv4", "IPv4"
        IPV6 = "ipv6", "IPv6"
        HASH = "hash", "Hash"
        EMAIL = "email", "Email"
        CVE = "cve", "CVE"
        ASN = "asn", "ASN"

    class Disposition(models.TextChoices):
        PRIMARY = "primary", "Primary"
        SECONDARY = "secondary", "Secondary"
        LEGITIMATE_TOOL = "legitimate_tool", "Legitimate Tool"
        DETECTED = "detected", "Detected"

    created = models.DateTimeField(auto_now_add=True)
    analysis = models.ForeignKey(
        ThreatReportAnalysis,
        on_delete=models.CASCADE,
        related_name="iocs",
    )
    value = models.TextField()
    ioc_type = models.CharField(max_length=32, choices=IOCType.choices)
    disposition = models.CharField(max_length=32, choices=Disposition.choices)
    confidence = models.FloatField(null=True, blank=True)
    confidence_label = models.CharField(max_length=16, blank=True)
    reason = models.TextField(blank=True)
    evidence = models.JSONField(default=list, blank=True)
    source_section = models.CharField(max_length=500, blank=True)
    source_url = models.URLField(max_length=2000, blank=True)
    context_snippet = models.TextField(blank=True)
    tags = models.JSONField(default=list, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["ioc_type", "disposition"]),
            models.Index(fields=["analysis", "disposition"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["analysis", "value", "ioc_type", "disposition", "source_section", "source_url"],
                name="uniq_analysis_ioc_value_scope",
            )
        ]

    def __str__(self):
        return self.value


class ThreatReportTTP(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    analysis = models.ForeignKey(
        ThreatReportAnalysis,
        on_delete=models.CASCADE,
        related_name="ttps",
    )
    description = models.TextField()
    tactics = models.JSONField(default=list, blank=True)
    techniques = models.JSONField(default=list, blank=True)
    procedures = models.JSONField(default=list, blank=True)
    is_emerging = models.BooleanField(default=False)
    emergence_reason = models.TextField(blank=True)
    confidence = models.FloatField(null=True, blank=True)
    confidence_label = models.CharField(max_length=16, blank=True)
    reason = models.TextField(blank=True)
    evidence = models.JSONField(default=list, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["is_emerging"]),
            models.Index(fields=["analysis", "is_emerging"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["analysis", "description", "is_emerging"],
                name="uniq_analysis_ttp_description_scope",
            )
        ]

    def __str__(self):
        return self.description[:120]


class ThreatReportRelationship(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    analysis = models.ForeignKey(
        ThreatReportAnalysis,
        on_delete=models.CASCADE,
        related_name="relationships",
    )
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="children",
    )
    source_name = models.CharField(max_length=500)
    source_type = models.CharField(max_length=64, blank=True)
    relationship = models.CharField(max_length=64)
    target_name = models.CharField(max_length=500)
    target_type = models.CharField(max_length=64, blank=True)
    confidence = models.FloatField(null=True, blank=True)
    confidence_label = models.CharField(max_length=16, blank=True)
    reason = models.TextField(blank=True)
    evidence = models.JSONField(default=list, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["relationship"]),
            models.Index(fields=["source_name"]),
            models.Index(fields=["target_name"]),
            models.Index(fields=["parent"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["analysis", "parent", "source_name", "relationship", "target_name", "source_type", "target_type"],
                name="uniq_analysis_relationship",
            )
        ]

    def __str__(self):
        return f"{self.source_name} {self.relationship} {self.target_name}"


class ThreatReportDetectionRule(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    analysis = models.ForeignKey(
        ThreatReportAnalysis,
        on_delete=models.CASCADE,
        related_name="detection_rules",
    )
    rule_type = models.CharField(max_length=64)
    name = models.CharField(max_length=255, blank=True)
    content = models.TextField(blank=True)
    description = models.TextField(blank=True)
    confidence = models.FloatField(null=True, blank=True)
    confidence_label = models.CharField(max_length=16, blank=True)
    reason = models.TextField(blank=True)
    evidence = models.JSONField(default=list, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["rule_type"]),
            models.Index(fields=["analysis", "rule_type"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["analysis", "rule_type", "name", "content"],
                name="uniq_analysis_detection_rule",
            )
        ]

    def __str__(self):
        return self.name or self.rule_type
