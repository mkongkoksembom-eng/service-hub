from django.conf import settings
from django.db import models
from django.utils import timezone


class Booking(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"
        REJECTED = "rejected", "Rejected"

    # Valid transitions: {current_status: [allowed_next_statuses]}
    TRANSITIONS = {
        Status.PENDING: [Status.CONFIRMED, Status.REJECTED, Status.CANCELLED],
        Status.CONFIRMED: [Status.IN_PROGRESS, Status.COMPLETED, Status.CANCELLED],
        Status.IN_PROGRESS: [Status.COMPLETED, Status.CANCELLED],
        Status.COMPLETED: [],
        Status.CANCELLED: [],
        Status.REJECTED: [],
    }

    # Who can trigger each transition
    PROVIDER_TRANSITIONS = [Status.CONFIRMED, Status.REJECTED, Status.IN_PROGRESS, Status.COMPLETED]
    CLIENT_TRANSITIONS = [Status.CANCELLED]
    SHARED_TRANSITIONS = [Status.CANCELLED]  # both can cancel

    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bookings_as_client",
    )
    service = models.ForeignKey(
        "services.Service",
        on_delete=models.CASCADE,
        related_name="bookings",
    )
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    scheduled_date = models.DateField()
    scheduled_time = models.TimeField(blank=True, null=True)
    address = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    cancellation_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Booking #{self.pk} — {self.client.email} → {self.service.title} [{self.status}]"

    def can_transition_to(self, new_status, user):
        if new_status not in self.TRANSITIONS.get(self.status, []):
            return False, f"Cannot move from '{self.status}' to '{new_status}'."

        is_provider = (user == self.service.provider.user)
        is_client = (user == self.client)

        if new_status in self.PROVIDER_TRANSITIONS and not is_provider:
            return False, "Only the provider can perform this action."
        if new_status == self.Status.CANCELLED:
            if not (is_provider or is_client):
                return False, "Only the client or provider can cancel."
        return True, None
