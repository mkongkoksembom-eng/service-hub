from django.contrib import admin
from django.utils.html import format_html

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "id", "client", "booking", "amount",
        "method", "status_badge", "paid_at", "created_at",
    )
    list_filter = ("status", "method")
    search_fields = ("client__email", "transaction_id", "booking__service__title")
    readonly_fields = ("transaction_id", "amount", "paid_at", "refunded_at", "created_at", "updated_at")
    ordering = ("-created_at",)
    list_per_page = 25

    STATUS_COLORS = {
        "pending": "#f59e0b",
        "paid": "#10b981",
        "failed": "#ef4444",
        "refunded": "#6b7280",
    }

    @admin.display(description="Status")
    def status_badge(self, obj):
        color = self.STATUS_COLORS.get(obj.status, "#6b7280")
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:12px;font-size:11px">{}</span>',
            color, obj.get_status_display(),
        )
