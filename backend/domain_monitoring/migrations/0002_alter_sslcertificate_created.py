# Generated manually on 2026-02-05

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('domain_monitoring', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='sslcertificate',
            name='created',
            field=models.DateField(auto_now_add=True),
        ),
    ]
