from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("email", "username", "role", "is_active", "is_staff", "date_joined")
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("email", "username", "phone")
    ordering = ("-date_joined",)
    list_per_page = 25
    actions = ["activate_users", "deactivate_users", "make_staff"]

    fieldsets = BaseUserAdmin.fieldsets + (
        ("Role & Contact", {"fields": ("role", "phone", "avatar")}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("Role & Contact", {"fields": ("email", "role", "phone")}),
    )

    @admin.action(description="Activate selected users")
    def activate_users(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} user(s) activated.")

    @admin.action(description="Deactivate selected users")
    def deactivate_users(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} user(s) deactivated.")

    @admin.action(description="Grant staff status")
    def make_staff(self, request, queryset):
        updated = queryset.update(is_staff=True)
        self.message_user(request, f"{updated} user(s) granted staff status.")
