from django.contrib import admin
from solo.admin import SingletonModelAdmin
from .models import (
    Company,
    CompanyDomain,
    DomainMonitoringSettings,
    WatchedResource,
    MonitoredDomain,
    MonitoredDomainAlert,
    NewlyRegisteredDomain,
    LookalikeDomain,
    SSLCertificate,
    MonitoredDomainAlertComment,
    LookalikeDomainComment,
)


class CompanyAdmin(admin.ModelAdmin):
    list_display = ("created", "name", "status")
    search_fields = ("name",)
    list_filter = ("status", "created")


class CompanyDomainAdmin(admin.ModelAdmin):
    list_display = ("created", "value", "company", "status")
    search_fields = ("value", "company__name")
    list_filter = ("status", "company", "created")


class WatchedResourceAdmin(admin.ModelAdmin):
    list_display = (
        "created",
        "value",
        "resource_type",
        "lookalike_match_from",
        "properties",
        "exclude_keywords",
        "company",
        "status",
    )
    search_fields = ("value", "company__name")
    list_filter = ("status", "resource_type", "lookalike_match_from", "company", "created")


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
    search_fields = ("value", "company__name", "website_url")
    list_filter = ("status", "company", "last_checked", "created")


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
    search_fields = ("domain_name", "company__name", "website_url")
    list_filter = ("status", "company", "created")


class NewlyRegisteredDomainAdmin(admin.ModelAdmin):
    list_display = ("source_date", "created", "source", "value")
    search_fields = ("value", "source")
    list_filter = ("source_date", "source", "created")


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
    search_fields = ("value", "watched_resource", "company__name", "source")
    list_filter = ("status", "potential_risk", "company", "source_date", "created")


class SSLCertificateAdmin(admin.ModelAdmin):
    list_display = ("created", "cert_index", "cert_domain", "watched_domain", "company")
    search_fields = ("cert_domain", "watched_domain", "company__name")
    list_filter = ("company", "created")


class DomainMonitoringSettingsAdmin(SingletonModelAdmin):
    list_display = (
        "created",
        "last_modified",
        "dns_provider",
        "subdomain_provider",
        "screenshot_provider",
        "nrd_provider",
    )


class MonitoredDomainAlertCommentAdmin(admin.ModelAdmin):
    list_display = ("created", "last_modified", "text", "alert_id", "user")

    def alert_id(self, obj):
        return obj.alert.id

    alert_id.short_description = "Alert ID"
    search_fields = ("text", "alert__domain_name", "user__username")
    list_filter = ("created", "last_modified", "user")


admin.site.register(Company, CompanyAdmin)
admin.site.register(CompanyDomain, CompanyDomainAdmin)
admin.site.register(WatchedResource, WatchedResourceAdmin)
admin.site.register(MonitoredDomain, MonitoredDomainAdmin)
admin.site.register(MonitoredDomainAlert, MonitoredDomainAlertAdmin)
admin.site.register(NewlyRegisteredDomain, NewlyRegisteredDomainAdmin)
admin.site.register(LookalikeDomain, LookalikeAdmin)
admin.site.register(SSLCertificate, SSLCertificateAdmin)
admin.site.register(DomainMonitoringSettings, DomainMonitoringSettingsAdmin)
admin.site.register(MonitoredDomainAlertComment, MonitoredDomainAlertCommentAdmin)


class LookalikeDomainCommentAdmin(admin.ModelAdmin):
    list_display = ("created", "last_modified", "text", "lookalike_domain_id", "user")
    search_fields = ("text", "lookalike_domain__value", "user__username")
    list_filter = ("created", "last_modified", "user")

    def lookalike_domain_id(self, obj):
        return obj.lookalike_domain.id

    lookalike_domain_id.short_description = "Lookalike ID"


admin.site.register(LookalikeDomainComment, LookalikeDomainCommentAdmin)
