from django.contrib import admin
from .models import BookingLocation

@admin.register(BookingLocation)
class BookingLocationAdmin(admin.ModelAdmin):
    list_display = ("booking", "user", "latitude", "longitude", "is_sharing", "updated_at")
    list_filter = ("is_sharing",)
