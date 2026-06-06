from django.contrib import admin
from .models import JobApplication, JobPost


@admin.register(JobPost)
class JobPostAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "client_username", "city", "urgency", "status", "created_at")
    list_filter = ("status", "urgency", "budget_type")
    search_fields = ("title", "description", "client_username", "city")


@admin.register(JobApplication)
class JobApplicationAdmin(admin.ModelAdmin):
    list_display = ("id", "job", "provider_username", "proposed_price", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("provider_username", "job__title")
