from rest_framework import serializers

from apps.bookings.models import Booking
from apps.users.serializers import UserProfileSerializer

from .models import Review


class ReviewCreateSerializer(serializers.ModelSerializer):
    booking_id = serializers.PrimaryKeyRelatedField(
        queryset=Booking.objects.all(), source="booking"
    )

    class Meta:
        model = Review
        fields = ("booking_id", "rating", "comment")

    def validate_booking_id(self, booking):
        request = self.context["request"]

        if booking.client != request.user:
            raise serializers.ValidationError("You can only review your own bookings.")

        if booking.status != Booking.Status.COMPLETED:
            raise serializers.ValidationError("You can only review a completed booking.")

        if hasattr(booking, "review"):
            raise serializers.ValidationError("You have already reviewed this booking.")

        return booking

    def create(self, validated_data):
        booking = validated_data["booking"]
        validated_data["client"] = self.context["request"].user
        validated_data["service"] = booking.service
        return super().create(validated_data)


class ReviewSerializer(serializers.ModelSerializer):
    client = UserProfileSerializer(read_only=True)

    class Meta:
        model = Review
        fields = ("id", "client", "service", "rating", "comment", "created_at", "updated_at")
        read_only_fields = ("id", "client", "service", "created_at", "updated_at")


class ReviewUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ("rating", "comment")
