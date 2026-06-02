from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("services", "0003_music_categories"),
    ]

    operations = [
        # Convert nullable ImageField → TextField stored in the database as a
        # base64 data-URL.  Existing null values become empty strings.
        migrations.AlterField(
            model_name="service",
            name="image",
            field=models.TextField(blank=True, default=""),
        ),
    ]
