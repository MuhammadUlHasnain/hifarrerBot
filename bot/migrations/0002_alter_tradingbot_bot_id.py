# Generated by Django 5.1.6 on 2025-03-08 17:49

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bot', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='tradingbot',
            name='bot_id',
            field=models.CharField(max_length=100, unique=True),
        ),
    ]
