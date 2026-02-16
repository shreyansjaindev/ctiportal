from django.db import models


class ActiveStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    INACTIVE = "inactive", "Inactive"


class AlertStatus(models.TextChoices):
    OPEN = "open", "Open"
    CLOSED = "closed", "Closed"


class LookalikeStatus(models.TextChoices):
    OPEN = "open", "Open"
    CLOSED = "closed", "Closed"
    TAKEDOWN = "takedown", "Takedown Requested"
    LEGAL = "legal", "Sent to Legal"
    NOT_RELEVANT = "not_relevant", "Not Relevant"


class RiskLevel(models.TextChoices):
    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"
    CRITICAL = "critical", "Critical"
    UNKNOWN = "unknown", "Unknown"


class ResourceType(models.TextChoices):
    KEYWORD = "keyword", "Keyword"
    DOMAIN = "domain", "Domain"
