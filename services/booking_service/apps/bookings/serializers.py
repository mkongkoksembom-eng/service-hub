from django.utils import timezone
from rest_framework import serializers

from .models import Booking


class BookingCreateSerializer(serializers.Serializer):
    service_id = serializers.IntegerField()
    scheduled_date = serializers.DateField()
    scheduled_time = serializers.TimeField(required=False, allow_null=True)
    address = serializers.CharField(max_length=255, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate_scheduled_date(self, value):
        if value < timezone.now().date():
            raise serializers.ValidationError("Scheduled date must be in the future.")
        return value

    def create(self, validated_data):
        request = self.context["request"]
        from clients import get_service
        from rest_framework.exceptions import ValidationError

        try:
            svc = get_service(validated_data["service_id"])
        except Exception:
            raise ValidationError({"service_id": "Service not found or unavailable."})

        if not svc.get("is_active", True):
            raise ValidationError({"service_id": "This service is not currently available."})
        if svc.get("provider_user_id") == request.user.id:
            raise ValidationError({"service_id": "You cannot book your own service."})

        return Booking.objects.create(
            client_id=request.user.id,
            client_email=request.user.email,
            client_username=request.user.username,
            service_id=svc["id"],
            service_title=svc["title"],
            provider_id=svc["provider_id"],
            provider_user_id=svc["provider_user_id"],
            provider_email=svc["provider_email"],
            provider_username=svc["provider_username"],
            scheduled_date=validated_data["scheduled_date"],
            scheduled_time=validated_data.get("scheduled_time"),
            address=validated_data.get("address", ""),
            notes=validated_data.get("notes", ""),
            total_price=svc["price"],
        )


class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = (
            "id", "client_id", "client_email", "client_username",
            "service_id", "service_title", "provider_id", "provider_user_id",
            "provider_username", "status", "scheduled_date", "scheduled_time",
            "address", "notes", "total_price", "cancellation_reason",
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

        can, error = booking.can_transition_to(new_status, user.id, user.role)
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
        booking.save(update_fields=update_fields)
        return booking
