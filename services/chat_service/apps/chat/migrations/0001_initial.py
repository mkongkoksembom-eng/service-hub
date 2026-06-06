from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Message",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("booking_id", models.IntegerField(db_index=True)),
                ("sender_id", models.IntegerField(db_index=True)),
                ("sender_username", models.CharField(blank=True, max_length=150)),
                ("msg_type", models.CharField(
                    choices=[("text","Text"),("image","Image"),("video","Video"),("audio","Audio"),("file","File")],
                    default="text",
                    max_length=10,
                )),
                ("content", models.TextField(blank=True)),
                ("file", models.FileField(blank=True, null=True, upload_to="chat/%Y/%m/")),
                ("file_name", models.CharField(blank=True, max_length=255)),
                ("file_size", models.PositiveIntegerField(blank=True, null=True)),
                ("timestamp", models.DateTimeField(auto_now_add=True)),
                ("is_read", models.BooleanField(default=False)),
            ],
            options={"ordering": ["timestamp"]},
        ),
    ]
