from django.contrib import admin
from django.utils.html import format_html

from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "client", "service", "star_rating", "comment_preview", "created_at")
    list_filter = ("rating",)
    search_fields = ("client__email", "service__title", "comment")
    readonly_fields = ("client", "service", "booking", "created_at", "updated_at")
    ordering = ("-created_at",)
    list_per_page = 25

    @admin.display(description="Rating")
    def star_rating(self, obj):
        stars = "★" * obj.rating + "☆" * (5 - obj.rating)
        colors = {5: "#10b981", 4: "#3b82f6", 3: "#f59e0b", 2: "#f97316", 1: "#ef4444"}
        return format_html(
            '<span style="color:{};font-size:14px">{}</span>',
            colors.get(obj.rating, "#6b7280"), stars,
        )

    @admin.display(description="Comment")
    def comment_preview(self, obj):
        return obj.comment[:60] + "…" if len(obj.comment) > 60 else obj.comment
