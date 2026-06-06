from django.contrib import admin
from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ("id", "client_username", "service_title", "status", "scheduled_date", "total_price")
    list_filter = ("status",)
    search_fields = ("client_username", "service_title")
    ordering = ("-created_at",)
