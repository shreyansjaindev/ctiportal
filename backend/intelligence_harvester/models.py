from django.db import models


class Source(models.Model):
    VALUE_TYPE_CHOICES = [
        ("domain", "Domain"),
        ("url", "URL"),
        ("ipv4", "IPv4"),
        ("ipv6", "IPv6"),
        ("md5", "MD5"),
        ("sha1", "SHA1"),
        ("sha256", "SHA256"),
        ("email", "Email Address"),
        ("cve", "CVE"),
    ]

    created = models.DateTimeField(auto_now_add=True)
    value = models.TextField(max_length=1000)
    value_type = models.CharField(max_length=255, choices=VALUE_TYPE_CHOICES)
    hashed_value = models.CharField(max_length=255)
    source = models.CharField(max_length=255)
    # Use JSONField for better handling of structured data and no size limit
    data = models.JSONField()

    class Meta:
        unique_together = ("hashed_value", "source")
