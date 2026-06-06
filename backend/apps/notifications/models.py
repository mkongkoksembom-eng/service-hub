from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Type(models.TextChoices):
        BOOKING_CREATED = "booking_created", "New Booking Request"
        BOOKING_CONFIRMED = "booking_confirmed", "Booking Confirmed"
        BOOKING_REJECTED = "booking_rejected", "Booking Rejected"
        BOOKING_CANCELLED = "booking_cancelled", "Booking Cancelled"
        BOOKING_IN_PROGRESS = "booking_in_progress", "Service In Progress"
        BOOKING_COMPLETED = "booking_completed", "Booking Completed"
        REVIEW_RECEIVED = "review_received", "New Review Received"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(max_length=30, choices=Type.choices)
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    booking = models.ForeignKey(
        "bookings.Booking",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.notification_type}] → {self.recipient.email}"
