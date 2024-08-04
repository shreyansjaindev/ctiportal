from django.db import models
from django.contrib.auth.models import User

# class LowercaseCharField(models.CharField):
#     def get_prep_value(self, value):
#         return str(value).lower()


class Company(models.Model):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
    ]

    created = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)
    name = models.CharField(max_length=255, unique=True)
    status = models.CharField(default="active", max_length=8, choices=STATUS_CHOICES)

    class Meta:
        verbose_name_plural = "Companies"

    def __str__(self):
        return self.name


class CompanyDomain(models.Model):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
    ]

    created = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)
    value = models.CharField(max_length=255, unique=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    status = models.CharField(default="active", max_length=8, choices=STATUS_CHOICES)

    class Meta:
        unique_together = ("value", "company")


class WatchedResource(models.Model):
    RESOURCE_TYPE_CHOICES = [
        ("keyword", "Keyword"),
        ("domain", "Domain"),
    ]

    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
    ]

    created = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)
    value = models.CharField(max_length=255)
    resource_type = models.CharField(max_length=255, choices=RESOURCE_TYPE_CHOICES)
    properties = models.JSONField(default=list, blank=True)
    exclude_keywords = models.JSONField(default=list, blank=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    status = models.CharField(default="active", max_length=8, choices=STATUS_CHOICES)
    # updated_by = models.ForeignKey(User, on_delete=models.RESTRICT)

    class Meta:
        unique_together = ("value", "company")


class MonitoredDomain(models.Model):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
    ]

    created = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)
    value = models.CharField(max_length=255, unique=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    status = models.CharField(default="active", max_length=8, choices=STATUS_CHOICES)
    a_record = models.JSONField(default=list, blank=True)
    mx_record = models.JSONField(default=list, blank=True)
    subdomains = models.JSONField(default=list, blank=True)
    spf_record = models.TextField(max_length=1000, blank=True)
    website_url = models.URLField(max_length=1000, blank=True)
    website_status_code = models.CharField(max_length=3, blank=True)
    website_screenshot = models.CharField(max_length=255, blank=True)
    website_certificate = models.JSONField(default=list, blank=True)
    last_checked = models.DateField(default="1900-01-01")

    class Meta:
        unique_together = ("value", "company")


class MonitoredDomainAlert(models.Model):
    STATUS_CHOICES = [
        ("open", "Open"),
        ("closed", "Closed"),
    ]

    created = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)
    domain_name = models.CharField(max_length=255)
    a_record = models.JSONField(default=list, blank=True)
    mx_record = models.JSONField(default=list, blank=True)
    spf_record = models.TextField(max_length=1000, blank=True)
    subdomains = models.JSONField(default=list, blank=True)
    website_url = models.URLField(max_length=1000, blank=True)
    website_status_code = models.CharField(max_length=3, blank=True)
    website_screenshot = models.TextField(max_length=1000, blank=True)
    website_certificate = models.JSONField(default=list, blank=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    status = models.CharField(default="open", max_length=12, choices=STATUS_CHOICES)

    class Meta:
        unique_together = ("created", "domain_name", "company")


class MonitoredDomainAlertComment(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)
    text = models.TextField()
    alert = models.ForeignKey(
        MonitoredDomainAlert, on_delete=models.CASCADE, related_name="comments"
    )
    user = models.ForeignKey(User, on_delete=models.RESTRICT, blank=True, null=True)


class NewlyRegisteredDomain(models.Model):
    source_date = models.DateField()
    created = models.DateTimeField(auto_now=True)
    value = models.CharField(max_length=255)


class LookalikeDomain(models.Model):
    RISK_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
        ("unknown", "Unknown"),
    ]

    STATUS_CHOICES = [
        ("open", "Open"),
        ("closed", "Closed"),
        ("takedown", "Takedown Requested"),
        ("legal", "Sent to Legal"),
        ("not_relevant", "Not Relevant"),
    ]

    source_date = models.DateField()
    created = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)
    value = models.CharField(max_length=255)
    source = models.CharField(max_length=255)
    watched_resource = models.CharField(max_length=255)
    potential_risk = models.CharField(default="unknown", max_length=255, choices=RISK_CHOICES)
    status = models.CharField(default="open", max_length=12, choices=STATUS_CHOICES)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    # modified_by = models.ForeignKey(User, on_delete=models.RESTRICT, blank=True, null=True)

    def is_monitored(self):
        return "active" if MonitoredDomain.objects.filter(value=self.value).exists() else "inactive"

    class Meta:
        verbose_name_plural = "Lookalike Domains"
        unique_together = ("source_date", "value")


class LookalikeDomainComment(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)
    text = models.TextField()
    lookalike_domain = models.ForeignKey(
        LookalikeDomain, on_delete=models.CASCADE, related_name="comments"
    )
    user = models.ForeignKey(User, on_delete=models.RESTRICT, blank=True, null=True)


class SSLCertificate(models.Model):
    created = models.DateField(auto_now=True)
    cert_index = models.IntegerField()
    cert_domain = models.CharField(max_length=255)
    watched_domain = models.CharField(max_length=255)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)

    class Meta:
        unique_together = ("cert_index", "cert_domain", "watched_domain", "company")
