from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("domain_monitoring", "0002_add_screenshot_hash_fields"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="MonitoredDomainScreenshotPattern",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created", models.DateTimeField(auto_now_add=True)),
                ("last_modified", models.DateTimeField(auto_now=True)),
                (
                    "pattern_type",
                    models.CharField(
                        choices=[("sponsored_listing", "Sponsored Listing")],
                        default="sponsored_listing",
                        max_length=24,
                    ),
                ),
                ("screenshot", models.CharField(blank=True, max_length=500)),
                ("screenshot_hash", models.CharField(blank=True, max_length=64)),
                ("screenshot_phash", models.CharField(blank=True, max_length=16)),
                ("active", models.BooleanField(default=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "monitored_domain",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="screenshot_patterns",
                        to="domain_monitoring.monitoreddomain",
                    ),
                ),
            ],
            options={},
        ),
        migrations.AddIndex(
            model_name="monitoreddomainscreenshotpattern",
            index=models.Index(fields=["monitored_domain", "active"], name="domain_moni_monitor_9b9759_idx"),
        ),
        migrations.AddIndex(
            model_name="monitoreddomainscreenshotpattern",
            index=models.Index(fields=["pattern_type", "active"], name="domain_moni_pattern_bf55f2_idx"),
        ),
    ]
