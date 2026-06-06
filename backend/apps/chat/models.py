from django.conf import settings
from django.db import models


class Message(models.Model):
    class Type(models.TextChoices):
        TEXT  = "text",  "Text"
        IMAGE = "image", "Image"
        VIDEO = "video", "Video"
        AUDIO = "audio", "Audio"
        FILE  = "file",  "File"

    booking   = models.ForeignKey("bookings.Booking", on_delete=models.CASCADE, related_name="messages")
    sender    = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_messages")
    msg_type  = models.CharField(max_length=10, choices=Type.choices, default=Type.TEXT)
    content   = models.TextField(blank=True)
    file      = models.FileField(upload_to="chat/%Y/%m/", null=True, blank=True)
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.PositiveIntegerField(null=True, blank=True)  # bytes
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read   = models.BooleanField(default=False)

    class Meta:
        ordering = ["timestamp"]

    def __str__(self):
        return f"Message #{self.pk} in booking #{self.booking_id} from {self.sender.username}"
