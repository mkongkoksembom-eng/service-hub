from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import BookingLocation

LOCATION_ACTIVE_STATUSES = ("confirmed", "in_progress")


def _verify_booking_access(booking_id, user_id):
    import clients
    try:
        booking = clients.get_booking(booking_id)
    except Exception:
        return None, Response({"detail": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)

    is_client = booking["client_id"] == user_id
    is_provider = booking["provider_user_id"] == user_id
    if not (is_client or is_provider):
        return None, Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

    if booking["status"] not in LOCATION_ACTIVE_STATUSES:
        return None, Response(
            {"detail": "Location sharing is only available for confirmed or in-progress bookings."},
            status=status.HTTP_403_FORBIDDEN,
        )
    return booking, None


class UpdateLocationView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, booking_id):
        booking, err = _verify_booking_access(booking_id, request.user.id)
        if err:
            return err

        from .serializers import LocationUpdateSerializer
        serializer = LocationUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        lat = serializer.validated_data["latitude"]
        lng = serializer.validated_data["longitude"]

        role = "client" if booking["client_id"] == request.user.id else "provider"
        BookingLocation.objects.update_or_create(
            booking_id=booking_id,
            user_id=request.user.id,
            defaults={
                "username": request.user.username,
                "role": role,
                "latitude": lat,
                "longitude": lng,
                "is_sharing": True,
            },
        )
        return Response({"detail": "Location updated."})


class StopSharingView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, booking_id):
        BookingLocation.objects.filter(
            booking_id=booking_id, user_id=request.user.id
        ).update(is_sharing=False)
        return Response({"detail": "Location sharing stopped."})


class BookingLocationsView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, booking_id):
        booking, err = _verify_booking_access(booking_id, request.user.id)
        if err:
            return err

        locations = BookingLocation.objects.filter(booking_id=booking_id, is_sharing=True)

        result = {}
        for loc in locations:
            result[loc.role] = {
                "username": loc.username,
                "latitude": float(loc.latitude),
                "longitude": float(loc.longitude),
                "updated_at": loc.updated_at.isoformat(),
                "is_me": loc.user_id == request.user.id,
            }

        my_role = "client" if booking["client_id"] == request.user.id else "provider"
        return Response({
            "booking_id": booking_id,
            "locations": result,
            "my_role": my_role,
        })
