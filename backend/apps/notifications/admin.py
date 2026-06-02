from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("id", "recipient", "notification_type", "title", "is_read", "created_at")
    list_filter = ("notification_type", "is_read")
    search_fields = ("recipient__email", "title", "message")
    readonly_fields = ("recipient", "notification_type", "title", "message", "booking", "created_at")
    ordering = ("-created_at",)
    list_per_page = 25
    actions = ["mark_as_read", "mark_as_unread"]

    @admin.action(description="Mark selected as read")
    def mark_as_read(self, request, queryset):
        updated = queryset.update(is_read=True)
        self.message_user(request, f"{updated} notification(s) marked as read.")

    @admin.action(description="Mark selected as unread")
    def mark_as_unread(self, request, queryset):
        updated = queryset.update(is_read=False)
        self.message_user(request, f"{updated} notification(s) marked as unread.")
