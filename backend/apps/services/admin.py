from django.contrib import admin
from django.utils.html import format_html

from .models import Category, ProviderProfile, Service


class ServiceInline(admin.TabularInline):
    model = Service
    extra = 0
    fields = ("title", "category", "price", "price_type", "is_active")
    readonly_fields = ("title", "category", "price", "price_type")
    can_delete = False
    show_change_link = True


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "service_count", "description")
    search_fields = ("name",)

    @admin.display(description="Services")
    def service_count(self, obj):
        return obj.services.count()


@admin.register(ProviderProfile)
class ProviderProfileAdmin(admin.ModelAdmin):
    list_display = (
        "user", "location", "is_verified", "rating_display",
        "total_reviews", "years_of_experience",
    )
    list_filter = ("is_verified", "location")
    search_fields = ("user__email", "user__username", "location")
    list_editable = ("is_verified",)
    readonly_fields = ("average_rating", "total_reviews")
    inlines = [ServiceInline]
    list_per_page = 25
    actions = ["verify_providers", "unverify_providers"]

    @admin.display(description="Rating")
    def rating_display(self, obj):
        stars = "★" * int(obj.average_rating) + "☆" * (5 - int(obj.average_rating))
        return format_html('<span title="{}/5">{}</span>', obj.average_rating, stars)

    @admin.action(description="Verify selected providers")
    def verify_providers(self, request, queryset):
        updated = queryset.update(is_verified=True)
        self.message_user(request, f"{updated} provider(s) verified.")

    @admin.action(description="Unverify selected providers")
    def unverify_providers(self, request, queryset):
        updated = queryset.update(is_verified=False)
        self.message_user(request, f"{updated} provider(s) unverified.")


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = (
        "title", "provider", "category", "price",
        "price_type", "is_active", "booking_count", "created_at",
    )
    list_filter = ("is_active", "price_type", "category")
    search_fields = ("title", "description", "provider__user__email", "location")
    list_editable = ("is_active",)
    readonly_fields = ("created_at", "updated_at")
    list_per_page = 25
    actions = ["activate_services", "deactivate_services"]

    @admin.display(description="Bookings")
    def booking_count(self, obj):
        return obj.bookings.count()

    @admin.action(description="Activate selected services")
    def activate_services(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} service(s) activated.")

    @admin.action(description="Deactivate selected services")
    def deactivate_services(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} service(s) deactivated.")
