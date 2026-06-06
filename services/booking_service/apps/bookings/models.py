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

    TRANSITIONS = {
        Status.PENDING: [Status.CONFIRMED, Status.REJECTED, Status.CANCELLED],
        Status.CONFIRMED: [Status.IN_PROGRESS, Status.COMPLETED, Status.CANCELLED],
        Status.IN_PROGRESS: [Status.COMPLETED, Status.CANCELLED],
        Status.COMPLETED: [],
        Status.CANCELLED: [],
        Status.REJECTED: [],
    }
    PROVIDER_TRANSITIONS = [Status.CONFIRMED, Status.REJECTED, Status.IN_PROGRESS, Status.COMPLETED]
    CLIENT_TRANSITIONS = [Status.CANCELLED]

    # References to user_service (no FK — plain integer IDs)
    client_id = models.IntegerField(db_index=True)
    client_email = models.EmailField(blank=True)
    client_username = models.CharField(max_length=150, blank=True)

    # References to catalog_service (no FK)
    service_id = models.IntegerField(db_index=True)
    service_title = models.CharField(max_length=255, blank=True)
    provider_id = models.IntegerField(db_index=True)          # ProviderProfile.id
    provider_user_id = models.IntegerField(db_index=True)     # User.id of provider
    provider_email = models.EmailField(blank=True)
    provider_username = models.CharField(max_length=150, blank=True)

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
        return f"Booking #{self.pk} — {self.client_email} → {self.service_title} [{self.status}]"

    def can_transition_to(self, new_status, user_id, user_role):
        if new_status not in self.TRANSITIONS.get(self.status, []):
            return False, f"Cannot move from '{self.status}' to '{new_status}'."

        is_provider = (user_id == self.provider_user_id)
        is_client = (user_id == self.client_id)

        if new_status in self.PROVIDER_TRANSITIONS and not is_provider:
            return False, "Only the provider can perform this action."
        if new_status == self.Status.CANCELLED:
            if not (is_provider or is_client):
                return False, "Only the client or provider can cancel."
        return True, None
