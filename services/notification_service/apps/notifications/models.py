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

    # recipient_id references user_service — no FK
    recipient_id = models.IntegerField(db_index=True)
    notification_type = models.CharField(max_length=30, choices=Type.choices)
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    # booking_id references booking_service — no FK
    booking_id = models.IntegerField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.notification_type}] → user #{self.recipient_id}"
