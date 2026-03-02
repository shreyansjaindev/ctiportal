from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("domain_monitoring", "0003_monitoreddomainscreenshotpattern"),
    ]

    operations = [
        migrations.CreateModel(
            name="DomainMonitoringSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created", models.DateTimeField(auto_now_add=True)),
                ("last_modified", models.DateTimeField(auto_now=True)),
                (
                    "dns_provider",
                    models.CharField(
                        choices=[("geekflare", "Geekflare"), ("securitytrails", "SecurityTrails")],
                        default="geekflare",
                        max_length=20,
                    ),
                ),
                (
                    "subdomain_provider",
                    models.CharField(
                        choices=[("virustotal", "VirusTotal"), ("securitytrails", "SecurityTrails")],
                        default="virustotal",
                        max_length=20,
                    ),
                ),
                (
                    "screenshot_provider",
                    models.CharField(
                        choices=[("geekflare", "Geekflare"), ("screenshotmachine", "ScreenshotMachine")],
                        default="geekflare",
                        max_length=24,
                    ),
                ),
                (
                    "nrd_provider",
                    models.CharField(
                        choices=[("whoisds", "WhoisDS"), ("whoisxmlapi", "WhoisXMLAPI")],
                        default="whoisds",
                        max_length=20,
                    ),
                ),
            ],
            options={
                "verbose_name": "Domain Monitoring Settings",
                "verbose_name_plural": "Domain Monitoring Settings",
            },
        ),
    ]
