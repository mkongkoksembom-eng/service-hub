from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("services", "0005_alter_service_options_service_featured_until_and_more"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="service",
            name="is_featured",
        ),
        migrations.RemoveField(
            model_name="service",
            name="featured_until",
        ),
    ]
