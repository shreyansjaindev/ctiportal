from django.db import migrations, models


def migrate_nrd_provider(apps, schema_editor):
    DomainMonitoringSettings = apps.get_model("domain_monitoring", "DomainMonitoringSettings")
    DomainMonitoringSettings.objects.filter(nrd_provider="whoisds").update(
        nrd_provider="whoisxmlapi_sample"
    )


class Migration(migrations.Migration):
    dependencies = [
        ("domain_monitoring", "0005_rename_domain_moni_monitor_9b9759_idx_domain_moni_monitor_9271e9_idx_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="domainmonitoringsettings",
            name="nrd_provider",
            field=models.CharField(
                choices=[
                    ("whoisxmlapi_sample", "WhoisXMLAPI Sample"),
                    ("whoisxmlapi", "WhoisXMLAPI"),
                ],
                default="whoisxmlapi_sample",
                max_length=24,
            ),
        ),
        migrations.RunPython(migrate_nrd_provider, migrations.RunPython.noop),
    ]
