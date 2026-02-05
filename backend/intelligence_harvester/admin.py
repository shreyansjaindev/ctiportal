from django.contrib import admin
from .models import Source


class SourceAdmin(admin.ModelAdmin):
    list_display = (
        "created",
        "value",
        "value_type",
        "hashed_value",
        "source",
        "data",
    )


admin.site.register(Source, SourceAdmin)
