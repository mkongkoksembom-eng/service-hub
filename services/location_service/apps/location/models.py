from django.db import models


class BookingLocation(models.Model):
    booking_id = models.IntegerField(db_index=True)
    user_id = models.IntegerField(db_index=True)
    username = models.CharField(max_length=150, blank=True)
    role = models.CharField(max_length=20, blank=True)  # "client" or "provider"
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    is_sharing = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [["booking_id", "user_id"]]

    def __str__(self):
        return f"Location of user {self.user_id} for booking #{self.booking_id}"
