from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ("email", "username", "role", "is_active", "date_joined")
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("email", "username")
    ordering = ("-date_joined",)
    fieldsets = UserAdmin.fieldsets + (
        ("Service Hub", {"fields": ("role", "phone", "avatar")}),
    )
