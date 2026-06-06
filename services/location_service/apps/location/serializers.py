from rest_framework import serializers

from .models import BookingLocation


class LocationUpdateSerializer(serializers.Serializer):
    latitude  = serializers.DecimalField(max_digits=9, decimal_places=6)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6)


class BookingLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = BookingLocation
        fields = ("booking_id", "user_id", "username", "role", "latitude", "longitude", "is_sharing", "updated_at")
        read_only_fields = fields
