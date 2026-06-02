from django.utils import timezone
from rest_framework import serializers

from apps.services.serializers import ServiceListSerializer
from apps.users.serializers import UserProfileSerializer

from .models import Booking


class BookingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ("id", "service", "scheduled_date", "scheduled_time", "address", "notes")

    def validate_service(self, service):
        request = self.context["request"]
        if not service.is_active:
            raise serializers.ValidationError("This service is not currently available.")
        if service.provider.user == request.user:
            raise serializers.ValidationError("You cannot book your own service.")
        return service

    def validate_scheduled_date(self, value):
        if value < timezone.now().date():
            raise serializers.ValidationError("Scheduled date must be in the future.")
        return value

    def create(self, validated_data):
        service = validated_data["service"]
        validated_data["client"] = self.context["request"].user
        validated_data["total_price"] = service.price
        return super().create(validated_data)


class BookingSerializer(serializers.ModelSerializer):
    client = UserProfileSerializer(read_only=True)
    service = ServiceListSerializer(read_only=True)

    class Meta:
        model = Booking
        fields = (
            "id", "client", "service", "status",
            "scheduled_date", "scheduled_time", "address",
            "notes", "total_price", "cancellation_reason",
            "created_at", "updated_at",
        )
        read_only_fields = fields


class BookingStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Booking.Status.choices)
    cancellation_reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        booking = self.context["booking"]
        user = self.context["request"].user
        new_status = data["status"]

        can, error = booking.can_transition_to(new_status, user)
        if not can:
            raise serializers.ValidationError({"status": error})

        if new_status == Booking.Status.CANCELLED and not data.get("cancellation_reason"):
            raise serializers.ValidationError(
                {"cancellation_reason": "A reason is required when cancelling."}
            )
        return data

    def save(self):
        booking = self.context["booking"]
        booking.status = self.validated_data["status"]
        update_fields = ["status", "updated_at"]
        if reason := self.validated_data.get("cancellation_reason"):
            booking.cancellation_reason = reason
            update_fields.append("cancellation_reason")
        # Pass update_fields so the post_save signal can tell exactly what changed
        # and avoid sending duplicate notifications.
        booking.save(update_fields=update_fields)
        return booking
