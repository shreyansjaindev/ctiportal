from django.contrib import admin

from .models import (
    ThreatReport,
    ThreatReportAnalysis,
    ThreatReportDetectionRule,
    ThreatReportEntity,
    ThreatReportIOC,
    ThreatReportRelationship,
    ThreatReportTTP,
)


class ThreatReportAnalysisInline(admin.TabularInline):
    model = ThreatReportAnalysis
    extra = 0
    fields = ("created", "model_name", "model_enrichment_used", "confidence")
    readonly_fields = fields
    can_delete = False
    show_change_link = True


@admin.register(ThreatReport)
class ThreatReportAdmin(admin.ModelAdmin):
    list_display = (
        "created",
        "source_kind",
        "title",
        "source_url",
        "used_source_url",
        "publisher",
    )
    search_fields = ("title", "source_url", "used_source_url", "primary_source_url", "publisher")
    list_filter = ("source_kind", "created")
    inlines = [ThreatReportAnalysisInline]


@admin.register(ThreatReportAnalysis)
class ThreatReportAnalysisAdmin(admin.ModelAdmin):
    list_display = ("created", "report", "model_name", "model_enrichment_used", "confidence")
    search_fields = ("report__title", "report__source_url", "model_name")
    list_filter = ("model_enrichment_used", "created")


@admin.register(ThreatReportEntity)
class ThreatReportEntityAdmin(admin.ModelAdmin):
    list_display = ("created", "entity_type", "name", "role", "analysis")
    search_fields = ("name", "role", "analysis__report__title", "analysis__report__source_url")
    list_filter = ("entity_type", "created")


@admin.register(ThreatReportIOC)
class ThreatReportIOCAdmin(admin.ModelAdmin):
    list_display = ("created", "ioc_type", "disposition", "value", "source_section")
    search_fields = ("value", "source_section", "source_url", "analysis__report__source_url")
    list_filter = ("ioc_type", "disposition", "created")


@admin.register(ThreatReportTTP)
class ThreatReportTTPAdmin(admin.ModelAdmin):
    list_display = ("created", "is_emerging", "short_description", "analysis")
    search_fields = ("description", "analysis__report__title", "analysis__report__source_url")
    list_filter = ("is_emerging", "created")

    def short_description(self, obj):
        return obj.description[:120]

    short_description.short_description = "Description"


@admin.register(ThreatReportRelationship)
class ThreatReportRelationshipAdmin(admin.ModelAdmin):
    list_display = ("created", "source_name", "relationship", "target_name", "analysis")
    search_fields = ("source_name", "target_name", "relationship", "analysis__report__source_url")
    list_filter = ("relationship", "created")


@admin.register(ThreatReportDetectionRule)
class ThreatReportDetectionRuleAdmin(admin.ModelAdmin):
    list_display = ("created", "rule_type", "name", "analysis")
    search_fields = ("name", "rule_type", "analysis__report__source_url")
    list_filter = ("rule_type", "created")
