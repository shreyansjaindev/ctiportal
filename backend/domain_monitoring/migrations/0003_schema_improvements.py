# Generated manually on 2026-02-06

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("domain_monitoring", "0002_alter_sslcertificate_created"),
    ]

    operations = [
        migrations.AlterField(
            model_name="watchedresource",
            name="resource_type",
            field=models.CharField(choices=[("keyword", "Keyword"), ("domain", "Domain")], max_length=10),
        ),
        migrations.AlterField(
            model_name="monitoreddomain",
            name="website_screenshot",
            field=models.CharField(blank=True, max_length=500),
        ),
        migrations.AlterField(
            model_name="monitoreddomain",
            name="last_checked",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="monitoreddomainalert",
            name="website_screenshot",
            field=models.CharField(blank=True, max_length=500),
        ),
        migrations.AlterField(
            model_name="lookalikedomain",
            name="potential_risk",
            field=models.CharField(
                choices=[
                    ("low", "Low"),
                    ("medium", "Medium"),
                    ("high", "High"),
                    ("critical", "Critical"),
                    ("unknown", "Unknown"),
                ],
                default="unknown",
                max_length=10,
            ),
        ),
        migrations.AddIndex(
            model_name="company",
            index=models.Index(fields=["status"], name="dm_company_status_idx"),
        ),
        migrations.AddIndex(
            model_name="companydomain",
            index=models.Index(
                fields=["company", "status"],
                name="dm_companydomain_company_status_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="companydomain",
            index=models.Index(fields=["value"], name="dm_companydomain_value_idx"),
        ),
        migrations.AddIndex(
            model_name="watchedresource",
            index=models.Index(
                fields=["company", "status"],
                name="dm_watchedresource_company_status_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="watchedresource",
            index=models.Index(fields=["resource_type"], name="dm_watchedresource_type_idx"),
        ),
        migrations.AddIndex(
            model_name="monitoreddomain",
            index=models.Index(
                fields=["company", "status"],
                name="dm_monitoreddomain_company_status_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="monitoreddomain",
            index=models.Index(
                fields=["last_checked"],
                name="dm_monitoreddomain_last_checked_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="monitoreddomain",
            index=models.Index(fields=["value"], name="dm_monitoreddomain_value_idx"),
        ),
        migrations.AddIndex(
            model_name="monitoreddomainalert",
            index=models.Index(
                fields=["company", "status"],
                name="dm_monitoreddomainalert_company_status_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="monitoreddomainalert",
            index=models.Index(
                fields=["domain_name"],
                name="dm_monitoreddomainalert_domain_name_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="lookalikedomain",
            index=models.Index(
                fields=["company", "status"],
                name="dm_lookalikedomain_company_status_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="lookalikedomain",
            index=models.Index(
                fields=["source_date"],
                name="dm_lookalikedomain_source_date_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="lookalikedomain",
            index=models.Index(
                fields=["potential_risk", "status"],
                name="dm_lookalikedomain_risk_status_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="sslcertificate",
            index=models.Index(
                fields=["company", "watched_domain"],
                name="dm_sslcertificate_company_watched_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="sslcertificate",
            index=models.Index(
                fields=["cert_domain"],
                name="dm_sslcertificate_cert_domain_idx",
            ),
        ),
    ]
