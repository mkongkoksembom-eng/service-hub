from django.contrib import admin
from .models import Message


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "booking_id", "sender_username", "timestamp", "is_read")
    list_filter = ("is_read",)
    search_fields = ("sender_username",)
