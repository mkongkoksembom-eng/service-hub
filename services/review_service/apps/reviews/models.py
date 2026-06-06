from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Review(models.Model):
    booking_id = models.IntegerField(unique=True, db_index=True)
    client_id = models.IntegerField(db_index=True)
    client_username = models.CharField(max_length=150, blank=True)
    service_id = models.IntegerField(db_index=True)
    service_title = models.CharField(max_length=255, blank=True)
    provider_id = models.IntegerField(db_index=True)       # ProviderProfile.id
    provider_user_id = models.IntegerField(db_index=True)  # User.id of provider
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Review {self.id} — {self.rating}/5"
