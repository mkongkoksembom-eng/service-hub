from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("chat", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="message",
            name="content",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="message",
            name="msg_type",
            field=models.CharField(
                choices=[("text","Text"),("image","Image"),("video","Video"),("audio","Audio"),("file","File")],
                default="text",
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name="message",
            name="file",
            field=models.FileField(blank=True, null=True, upload_to="chat/%Y/%m/"),
        ),
        migrations.AddField(
            model_name="message",
            name="file_name",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="message",
            name="file_size",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
