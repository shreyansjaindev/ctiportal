from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("report_intelligence", "0002_threatreportdetectionrule_confidence_label_and_more"),
    ]

    operations = [
        migrations.RenameField(
            model_name="threatreportanalysis",
            old_name="raw_result",
            new_name="snapshot",
        ),
        migrations.AddField(
            model_name="threatreportanalysis",
            name="structured_summary",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="threatreportioc",
            name="confidence_label",
            field=models.CharField(blank=True, max_length=16),
        ),
        migrations.AddField(
            model_name="threatreportioc",
            name="evidence",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="threatreportioc",
            name="reason",
            field=models.TextField(blank=True),
        ),
        migrations.AddConstraint(
            model_name="threatreportdetectionrule",
            constraint=models.UniqueConstraint(
                fields=("analysis", "rule_type", "name", "content"),
                name="uniq_analysis_detection_rule",
            ),
        ),
    ]
