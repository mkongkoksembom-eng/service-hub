from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        # Convert nullable ImageField → TextField stored in the database as a
        # base64 data-URL.  Existing null values become empty strings.
        migrations.AlterField(
            model_name="user",
            name="avatar",
            field=models.TextField(blank=True, default=""),
        ),
    ]
