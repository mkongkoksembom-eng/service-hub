from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Review(models.Model):
    booking = models.OneToOneField(
        "bookings.Booking",
        on_delete=models.CASCADE,
        related_name="review",
    )
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews_given",
    )
    service = models.ForeignKey(
        "services.Service",
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Review by {self.client.email} on {self.service.title} — {self.rating}/5"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self._update_provider_rating()

    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)
        self._update_provider_rating()

    def _update_provider_rating(self):
        from django.db.models import Avg, Count
        provider = self.service.provider
        result = Review.objects.filter(service__provider=provider).aggregate(
            avg=Avg("rating"), count=Count("id")
        )
        provider.average_rating = result["avg"] or 0
        provider.total_reviews = result["count"]
        provider.save(update_fields=["average_rating", "total_reviews"])
