from django.conf import settings
from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=150, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subcategories",
    )

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["name"]

    def __str__(self):
        return f"{self.parent.name} › {self.name}" if self.parent else self.name

    @property
    def is_parent(self):
        return self.parent is None


class ProviderProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="provider_profile",
    )
    bio = models.TextField(blank=True)
    location = models.CharField(max_length=255, blank=True)
    years_of_experience = models.PositiveSmallIntegerField(default=0)
    is_verified = models.BooleanField(default=False)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    total_reviews = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} (provider)"


class Service(models.Model):
    class PriceType(models.TextChoices):
        FIXED = "fixed", "Fixed"
        HOURLY = "hourly", "Hourly"

    provider = models.ForeignKey(
        ProviderProfile,
        on_delete=models.CASCADE,
        related_name="services",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        related_name="services",
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    price_type = models.CharField(max_length=10, choices=PriceType.choices, default=PriceType.FIXED)
    location = models.CharField(max_length=255, blank=True)
    image = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    featured_until = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_featured", "-created_at"]

    def __str__(self):
        return self.title
