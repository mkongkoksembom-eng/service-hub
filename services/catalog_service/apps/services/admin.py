from django.contrib import admin
from .models import Category, ProviderProfile, Service


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "parent")
    search_fields = ("name",)


@admin.register(ProviderProfile)
class ProviderProfileAdmin(admin.ModelAdmin):
    list_display = ("user_id", "username", "is_verified", "average_rating", "total_reviews")
    search_fields = ("username", "email")


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("title", "provider", "price", "is_active")
    list_filter = ("is_active", "price_type")
    search_fields = ("title",)
