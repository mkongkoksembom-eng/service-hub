from rest_framework import serializers

from apps.bookings.models import Booking

from .models import FeaturedPayment, Payment


class PaymentCreateSerializer(serializers.ModelSerializer):
    booking_id = serializers.PrimaryKeyRelatedField(
        queryset=Booking.objects.all(), source="booking"
    )

    class Meta:
        model = Payment
        fields = ("id", "booking_id", "method", "notes", "status", "amount", "transaction_id")
        read_only_fields = ("id", "status", "amount", "transaction_id")

    def validate_booking_id(self, booking):
        request = self.context["request"]

        if booking.client != request.user:
            raise serializers.ValidationError("You can only pay for your own bookings.")

        if booking.status not in (Booking.Status.CONFIRMED, Booking.Status.COMPLETED):
            raise serializers.ValidationError(
                "Payment can only be initiated for confirmed or completed bookings."
            )

        if hasattr(booking, "payment") and booking.payment.status == Payment.Status.PAID:
            raise serializers.ValidationError("This booking has already been paid.")

        return booking

    def create(self, validated_data):
        booking = validated_data["booking"]
        validated_data["client"] = self.context["request"].user
        validated_data["amount"] = booking.total_price
        # If a pending payment exists already, update it instead of duplicating
        if hasattr(booking, "payment"):
            payment = booking.payment
            payment.method = validated_data.get("method", payment.method)
            payment.notes = validated_data.get("notes", payment.notes)
            payment.save()
            return payment
        return super().create(validated_data)


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = (
            "id", "booking", "client", "amount", "commission_amount",
            "provider_amount", "method", "status", "transaction_id",
            "paid_at", "refunded_at", "notes", "created_at", "updated_at",
        )
        read_only_fields = fields


class FeaturedPaymentSerializer(serializers.ModelSerializer):
    service_title = serializers.CharField(source="service.title", read_only=True)

    class Meta:
        model = FeaturedPayment
        fields = (
            "id", "service", "service_title", "amount", "status",
            "momo_reference", "phone_number", "featured_until", "created_at",
        )
        read_only_fields = fields


class PaymentConfirmSerializer(serializers.Serializer):
    """Simulates confirming a payment (in production this comes from a gateway webhook)."""
    transaction_reference = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        payment = self.context["payment"]
        if payment.status == Payment.Status.PAID:
            raise serializers.ValidationError("This payment is already confirmed.")
        if payment.status == Payment.Status.REFUNDED:
            raise serializers.ValidationError("Cannot confirm a refunded payment.")
        return data

    def save(self):
        self.context["payment"].mark_paid()
        return self.context["payment"]


class RefundSerializer(serializers.Serializer):
    def validate(self, data):
        payment = self.context["payment"]
        if payment.status != Payment.Status.PAID:
            raise serializers.ValidationError("Only paid payments can be refunded.")
        return data

    def save(self):
        self.context["payment"].mark_refunded()
        return self.context["payment"]
