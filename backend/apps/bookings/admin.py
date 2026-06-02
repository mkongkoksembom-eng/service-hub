from django.contrib import admin
from django.utils.html import format_html

from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        "id", "client", "service", "status_badge",
        "scheduled_date", "total_price", "has_review", "created_at",
    )
    list_filter = ("status", "scheduled_date")
    search_fields = ("client__email", "service__title", "address")
    readonly_fields = ("total_price", "created_at", "updated_at")
    ordering = ("-created_at",)
    list_per_page = 25
    actions = ["cancel_bookings"]

    STATUS_COLORS = {
        "pending": "#f59e0b",
        "confirmed": "#3b82f6",
        "in_progress": "#8b5cf6",
        "completed": "#10b981",
        "cancelled": "#ef4444",
        "rejected": "#6b7280",
    }

    @admin.display(description="Status")
    def status_badge(self, obj):
        color = self.STATUS_COLORS.get(obj.status, "#6b7280")
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:12px;font-size:11px">{}</span>',
            color, obj.get_status_display(),
        )

    @admin.display(description="Reviewed", boolean=True)
    def has_review(self, obj):
        return hasattr(obj, "review")

    @admin.action(description="Cancel selected bookings")
    def cancel_bookings(self, request, queryset):
        cancellable = queryset.filter(status__in=["pending", "confirmed"])
        updated = cancellable.update(
            status=Booking.Status.CANCELLED,
            cancellation_reason="Cancelled by admin.",
        )
        self.message_user(request, f"{updated} booking(s) cancelled.")
