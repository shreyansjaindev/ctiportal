from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("report_intelligence", "0005_remove_threatreportrelationship_uniq_analysis_relationship_and_more"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="threatreportttp",
            name="uniq_analysis_ttp_kind_description",
        ),
        migrations.RemoveIndex(
            model_name="threatreportttp",
            name="report_inte_kind_94dd48_idx",
        ),
        migrations.RemoveIndex(
            model_name="threatreportttp",
            name="report_inte_analysi_86ac47_idx",
        ),
        migrations.RenameField(
            model_name="threatreportttp",
            old_name="why_new",
            new_name="emergence_reason",
        ),
        migrations.RemoveField(
            model_name="threatreportttp",
            name="kind",
        ),
        migrations.AddField(
            model_name="threatreportttp",
            name="is_emerging",
            field=models.BooleanField(default=False),
        ),
        migrations.AddIndex(
            model_name="threatreportttp",
            index=models.Index(fields=["is_emerging"], name="report_inte_is_eme_4f4515_idx"),
        ),
        migrations.AddIndex(
            model_name="threatreportttp",
            index=models.Index(fields=["analysis", "is_emerging"], name="report_inte_analysi_c25b32_idx"),
        ),
        migrations.AddConstraint(
            model_name="threatreportttp",
            constraint=models.UniqueConstraint(
                fields=("analysis", "description", "is_emerging"),
                name="uniq_analysis_ttp_description_scope",
            ),
        ),
    ]
