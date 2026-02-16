from django.db import models
from django.contrib.auth.models import User

from .choices import (
    ActiveStatus,
    AlertStatus,
    LookalikeStatus,
    ResourceType,
    RiskLevel,
)


class Company(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)
    name = models.CharField(max_length=255, unique=True)
    status = models.CharField(
        default=ActiveStatus.ACTIVE,
        max_length=8,
        choices=ActiveStatus.choices,
    )

    class Meta:
        verbose_name_plural = "Companies"
        indexes = [
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return self.name


class CompanyDomain(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)
    value = models.CharField(max_length=255)
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="company_domains",
    )
    status = models.CharField(
        default=ActiveStatus.ACTIVE,
        max_length=8,
        choices=ActiveStatus.choices,
    )

    class Meta:
        unique_together = ("value", "company")
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["value"]),
        ]

    def __str__(self):
        return f"{self.value} ({self.company.name})"


class WatchedResource(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)
    value = models.CharField(max_length=255)
    resource_type = models.CharField(max_length=10, choices=ResourceType.choices)
    properties = models.JSONField(default=list, blank=True)
    exclude_keywords = models.JSONField(default=list, blank=True)
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="watched_resources",
    )
    status = models.CharField(
        default=ActiveStatus.ACTIVE,
        max_length=8,
        choices=ActiveStatus.choices,
    )
    # updated_by = models.ForeignKey(User, on_delete=models.RESTRICT)

    class Meta:
        unique_together = ("value", "company")
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["resource_type"]),
        ]

    def __str__(self):
        return f"{self.value} ({self.resource_type})"


class MonitoredDomain(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)
    value = models.CharField(max_length=255)
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="monitored_domains",
    )
    status = models.CharField(
        default=ActiveStatus.ACTIVE,
        max_length=8,
        choices=ActiveStatus.choices,
    )
    a_record = models.JSONField(default=list, blank=True)
    mx_record = models.JSONField(default=list, blank=True)
    subdomains = models.JSONField(default=list, blank=True)
    spf_record = models.TextField(max_length=1000, blank=True)
    website_url = models.URLField(max_length=1000, blank=True)
    website_status_code = models.CharField(max_length=3, blank=True)
    website_screenshot = models.CharField(max_length=500, blank=True)
    website_certificate = models.JSONField(default=list, blank=True)
    last_checked = models.DateField(null=True, blank=True)

    class Meta:
        unique_together = ("value", "company")
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["last_checked"]),
            models.Index(fields=["value"]),
        ]

    def __str__(self):
        return f"{self.value} ({self.company.name})"


class MonitoredDomainAlert(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)
    domain_name = models.CharField(max_length=255)
    a_record = models.JSONField(default=list, blank=True)
    mx_record = models.JSONField(default=list, blank=True)
    spf_record = models.TextField(max_length=1000, blank=True)
    subdomains = models.JSONField(default=list, blank=True)
    website_url = models.URLField(max_length=1000, blank=True)
    website_status_code = models.CharField(max_length=3, blank=True)
    website_screenshot = models.CharField(max_length=500, blank=True)
    website_certificate = models.JSONField(default=list, blank=True)
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="monitored_domain_alerts",
    )
    status = models.CharField(
        default=AlertStatus.OPEN,
        max_length=12,
        choices=AlertStatus.choices,
    )

    class Meta:
        unique_together = ("domain_name", "company")
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["domain_name"]),
        ]

    def __str__(self):
        return f"{self.domain_name} ({self.company.name})"


class MonitoredDomainAlertComment(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)
    text = models.TextField()
    alert = models.ForeignKey(
        MonitoredDomainAlert,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    user = models.ForeignKey(User, on_delete=models.RESTRICT, blank=True, null=True)

    def __str__(self):
        return f"Alert {self.alert_id}: {self.text[:50]}"


class NewlyRegisteredDomain(models.Model):
    source_date = models.DateField()
    created = models.DateTimeField(auto_now_add=True)
    value = models.CharField(max_length=255)

    def __str__(self):
        return self.value


class LookalikeDomain(models.Model):
    source_date = models.DateField()
    created = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)
    value = models.CharField(max_length=255)
    source = models.CharField(max_length=255)
    watched_resource = models.CharField(max_length=255)
    potential_risk = models.CharField(
        default=RiskLevel.UNKNOWN,
        max_length=10,
        choices=RiskLevel.choices,
    )
    status = models.CharField(
        default=LookalikeStatus.OPEN,
        max_length=12,
        choices=LookalikeStatus.choices,
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="lookalike_domains",
    )
    # modified_by = models.ForeignKey(User, on_delete=models.RESTRICT, blank=True, null=True)

    def is_monitored(self):
        return (
            "active"
            if MonitoredDomain.objects.filter(
                value=self.value,
                company=self.company,
                status=ActiveStatus.ACTIVE,
            ).exists()
            else "inactive"
        )

    class Meta:
        verbose_name_plural = "Lookalike Domains"
        unique_together = ("source_date", "value", "company")
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["source_date"]),
            models.Index(fields=["potential_risk", "status"]),
        ]

    def __str__(self):
        return f"{self.value} ({self.potential_risk})"


class LookalikeDomainComment(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)
    text = models.TextField()
    lookalike_domain = models.ForeignKey(
        LookalikeDomain,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    user = models.ForeignKey(User, on_delete=models.RESTRICT, blank=True, null=True)

    def __str__(self):
        return f"Lookalike {self.lookalike_domain_id}: {self.text[:50]}"


class SSLCertificate(models.Model):
    created = models.DateField(auto_now_add=True)
    cert_index = models.IntegerField()
    cert_domain = models.CharField(max_length=255)
    watched_domain = models.CharField(max_length=255)
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="ssl_certificates",
    )

    class Meta:
        unique_together = ("cert_index", "cert_domain", "watched_domain", "company")
        indexes = [
            models.Index(fields=["company", "watched_domain"]),
            models.Index(fields=["cert_domain"]),
        ]

    def __str__(self):
        return f"{self.cert_domain} ({self.watched_domain})"
