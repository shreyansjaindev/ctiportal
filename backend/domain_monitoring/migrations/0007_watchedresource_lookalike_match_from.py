from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("domain_monitoring", "0006_replace_whoisds_with_whoisxmlapi_sample"),
    ]

    operations = [
        migrations.AddField(
            model_name="watchedresource",
            name="lookalike_match_from",
            field=models.DateField(blank=True, null=True),
        ),
    ]
