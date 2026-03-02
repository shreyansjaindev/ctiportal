from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("domain_monitoring", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="monitoreddomain",
            name="website_screenshot_hash",
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name="monitoreddomainalert",
            name="website_screenshot_hash",
            field=models.CharField(blank=True, max_length=64),
        ),
    ]
