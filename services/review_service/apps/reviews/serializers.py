from rest_framework import serializers
from .models import Review


class ReviewCreateSerializer(serializers.Serializer):
    booking_id = serializers.IntegerField()
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_booking_id(self, booking_id):
        import clients
        request = self.context["request"]

        try:
            booking = clients.get_booking(booking_id)
        except Exception:
            raise serializers.ValidationError("Booking not found or unavailable.")

        if booking["client_id"] != request.user.id:
            raise serializers.ValidationError("You can only review your own bookings.")

        if booking["status"] != "completed":
            raise serializers.ValidationError("You can only review a completed booking.")

        if Review.objects.filter(booking_id=booking_id).exists():
            raise serializers.ValidationError("You have already reviewed this booking.")

        self._booking = booking
        return booking_id

    def create(self, validated_data):
        import clients
        from django.db.models import Avg, Count
        request = self.context["request"]
        booking = self._booking

        review = Review.objects.create(
            booking_id=validated_data["booking_id"],
            client_id=request.user.id,
            client_username=request.user.username,
            service_id=booking["service_id"],
            service_title=booking["service_title"],
            provider_id=booking["provider_id"],
            provider_user_id=booking["provider_user_id"],
            rating=validated_data["rating"],
            comment=validated_data.get("comment", ""),
        )

        result = Review.objects.filter(provider_id=review.provider_id).aggregate(
            avg=Avg("rating"), count=Count("id")
        )
        clients.update_provider_rating(
            provider_id=review.provider_id,
            avg_rating=round(result["avg"] or 0, 2),
            total_reviews=result["count"],
        )

        return review


class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = (
            "id", "booking_id", "client_id", "client_username",
            "service_id", "service_title", "provider_id",
            "rating", "comment", "created_at", "updated_at",
        )
        read_only_fields = fields


class ReviewUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ("rating", "comment")

    def update(self, instance, validated_data):
        import clients
        from django.db.models import Avg, Count

        instance = super().update(instance, validated_data)

        result = Review.objects.filter(provider_id=instance.provider_id).aggregate(
            avg=Avg("rating"), count=Count("id")
        )
        clients.update_provider_rating(
            provider_id=instance.provider_id,
            avg_rating=round(result["avg"] or 0, 2),
            total_reviews=result["count"],
        )
        return instance
