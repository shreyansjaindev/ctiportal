from django.contrib import admin
from .models import (
    Company,
    CompanyDomain,
    WatchedResource,
    MonitoredDomain,
    MonitoredDomainAlert,
    NewlyRegisteredDomain,
    LookalikeDomain,
    SSLCertificate,
    MonitoredDomainAlertComment,
)


class CompanyAdmin(admin.ModelAdmin):
    list_display = ("created", "name", "status")


class CompanyDomainAdmin(admin.ModelAdmin):
    list_display = ("created", "value", "company", "status")


class WatchedResourceAdmin(admin.ModelAdmin):
    list_display = (
        "created",
        "value",
        "resource_type",
        "properties",
        "exclude_keywords",
        "company",
        "status",
    )


class MonitoredDomainAdmin(admin.ModelAdmin):
    list_display = (
        "created",
        "value",
        "company",
        "status",
        "last_checked",
        "website_url",
        "website_status_code",
        "website_screenshot",
    )


class MonitoredDomainAlertAdmin(admin.ModelAdmin):
    list_display = (
        "created",
        "domain_name",
        "a_record",
        "mx_record",
        "spf_record",
        "subdomains",
        "website_url",
        "website_status_code",
        "website_screenshot",
        "website_certificate",
        "company",
        "status",
    )


class NewlyRegisteredDomainAdmin(admin.ModelAdmin):
    list_display = ("created", "value")


class LookalikeAdmin(admin.ModelAdmin):
    list_display = (
        "created",
        "source_date",
        "value",
        "watched_resource",
        "potential_risk",
        "status",
        "company",
    )


class SSLCertificateAdmin(admin.ModelAdmin):
    list_display = ("created", "cert_index", "cert_domain", "watched_domain", "company")


class MonitoredDomainAlertCommentAdmin(admin.ModelAdmin):
    list_display = ("created", "last_modified", "text", "alert_id", "user")

    def alert_id(self, obj):
        return obj.alert.id

    alert_id.short_description = "Alert ID"


admin.site.register(Company, CompanyAdmin)
admin.site.register(CompanyDomain, CompanyDomainAdmin)
admin.site.register(WatchedResource, WatchedResourceAdmin)
admin.site.register(MonitoredDomain, MonitoredDomainAdmin)
admin.site.register(MonitoredDomainAlert, MonitoredDomainAlertAdmin)
admin.site.register(NewlyRegisteredDomain, NewlyRegisteredDomainAdmin)
admin.site.register(LookalikeDomain, LookalikeAdmin)
admin.site.register(SSLCertificate, SSLCertificateAdmin)
admin.site.register(MonitoredDomainAlertComment, MonitoredDomainAlertCommentAdmin)
