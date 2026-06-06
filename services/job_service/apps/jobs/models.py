from django.db import models


class JobPost(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        TAKEN = "taken", "Taken"
        CANCELLED = "cancelled", "Cancelled"
        EXPIRED = "expired", "Expired"

    class Urgency(models.TextChoices):
        LOW = "low", "Low — flexible timing"
        NORMAL = "normal", "Normal"
        URGENT = "urgent", "Urgent — ASAP"

    class BudgetType(models.TextChoices):
        FIXED = "fixed", "Fixed price"
        NEGOTIABLE = "negotiable", "Negotiable"

    # Client (denormalized from JWT at post time)
    client_id = models.IntegerField(db_index=True)
    client_username = models.CharField(max_length=150)
    client_email = models.EmailField(blank=True)

    # Job details
    title = models.CharField(max_length=255)
    description = models.TextField(
        help_text="Describe the job in detail — what needs to be done, any special requirements."
    )
    category_name = models.CharField(max_length=100, blank=True,
                                     help_text="Type of service needed (e.g. Plumbing, Cleaning).")
    skills_required = models.TextField(
        blank=True,
        help_text="Specific skills or tools the provider should have."
    )
    duration_estimate = models.CharField(
        max_length=100, blank=True,
        help_text="Estimated time to complete (e.g. '2 hours', 'half a day', '3 days')."
    )

    # Location
    city = models.CharField(max_length=100)
    address = models.CharField(max_length=255, blank=True,
                               help_text="Full address or neighbourhood where the job takes place.")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    # Budget
    budget_min = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    budget_max = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    budget_type = models.CharField(
        max_length=12, choices=BudgetType.choices, default=BudgetType.NEGOTIABLE
    )

    # Timing
    deadline = models.DateField(null=True, blank=True,
                                help_text="Latest date by which the job should be completed.")
    urgency = models.CharField(max_length=8, choices=Urgency.choices, default=Urgency.NORMAL)

    # State
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.OPEN, db_index=True)
    booking_id = models.IntegerField(null=True, blank=True)  # set when job is taken

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Job auto-expires and disappears from listings after this datetime."
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.status.upper()}] {self.title} — {self.client_username}"


class JobApplication(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"
        WITHDRAWN = "withdrawn", "Withdrawn"

    job = models.ForeignKey(JobPost, on_delete=models.CASCADE, related_name="applications")

    # Provider (denormalized from JWT at application time)
    provider_user_id = models.IntegerField(db_index=True)
    provider_username = models.CharField(max_length=150)
    provider_email = models.EmailField(blank=True)

    # Application
    cover_message = models.TextField(
        help_text="Explain your experience and why you're the right person for this job."
    )
    proposed_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Your price quote for this job (leave blank if you want to discuss)."
    )
    availability_note = models.CharField(
        max_length=255, blank=True,
        help_text="When can you start or complete this job? (e.g. 'Available this weekend')"
    )

    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        unique_together = [["job", "provider_user_id"]]

    def __str__(self):
        return f"Application by {self.provider_username} on '{self.job.title}' [{self.status}]"
