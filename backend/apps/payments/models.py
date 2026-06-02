import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class Payment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    class Method(models.TextChoices):
        CARD = "card", "Card"
        MOBILE_MONEY = "mobile_money", "Mobile Money"
        CASH = "cash", "Cash"

    booking = models.OneToOneField(
        "bookings.Booking",
        on_delete=models.CASCADE,
        related_name="payment",
    )
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payments",
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    commission_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    provider_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    method = models.CharField(max_length=15, choices=Method.choices, default=Method.CASH)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    transaction_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    momo_reference = models.CharField(max_length=100, blank=True)  # MTN MoMo X-Reference-Id
    phone_number = models.CharField(max_length=20, blank=True)      # payer's MoMo number
    paid_at = models.DateTimeField(null=True, blank=True)
    refunded_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Payment #{self.transaction_id} — {self.status} — {self.amount}"

    def mark_paid(self):
        from django.conf import settings as django_settings
        rate = getattr(django_settings, "COMMISSION_RATE", 0.05)
        self.commission_amount = round(self.amount * rate, 2)
        self.provider_amount   = round(self.amount - self.commission_amount, 2)
        self.status   = self.Status.PAID
        self.paid_at  = timezone.now()
        self.save(update_fields=["status", "paid_at", "commission_amount", "provider_amount", "updated_at"])

    def mark_refunded(self):
        self.status = self.Status.REFUNDED
        self.refunded_at = timezone.now()
        self.save(update_fields=["status", "refunded_at", "updated_at"])


class FeaturedPayment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID    = "paid",    "Paid"
        FAILED  = "failed",  "Failed"

    service       = models.ForeignKey("services.Service", on_delete=models.CASCADE, related_name="featured_payments")
    provider      = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="featured_payments")
    amount        = models.DecimalField(max_digits=10, decimal_places=2)
    status        = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    momo_reference = models.CharField(max_length=100, blank=True)
    phone_number  = models.CharField(max_length=20, blank=True)
    featured_until = models.DateTimeField(null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"FeaturedPayment #{self.pk} — {self.service.title} — {self.status}"

    def activate(self):
        from datetime import timedelta
        from django.conf import settings as django_settings
        days = getattr(django_settings, "FEATURED_LISTING_DAYS", 7)
        self.featured_until = timezone.now() + timedelta(days=days)
        self.status = self.Status.PAID
        self.save(update_fields=["status", "featured_until"])
        self.service.__class__.objects.filter(pk=self.service_id).update(
            is_featured=True,
            featured_until=self.featured_until,
        )
