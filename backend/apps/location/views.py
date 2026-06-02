from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.bookings.models import Booking
from .models import BookingLocation

ACTIVE_STATUSES = [Booking.Status.CONFIRMED, Booking.Status.IN_PROGRESS]


def _get_booking_or_error(booking_id, user):
    try:
        booking = Booking.objects.select_related(
            "client", "service__provider__user"
        ).get(pk=booking_id)
    except Booking.DoesNotExist:
        return None, Response({"detail": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)

    is_client   = user == booking.client
    is_provider = user == booking.service.provider.user
    if not (is_client or is_provider):
        return None, Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

    if booking.status not in ACTIVE_STATUSES:
        return None, Response(
            {"detail": "Location sharing is only available for confirmed or in-progress bookings."},
            status=status.HTTP_403_FORBIDDEN,
        )
    return booking, None


class UpdateLocationView(APIView):
    """User shares / updates their location for a booking."""
    permission_classes = (IsAuthenticated,)

    def post(self, request, booking_id):
        booking, err = _get_booking_or_error(booking_id, request.user)
        if err:
            return err

        lat = request.data.get("latitude")
        lng = request.data.get("longitude")
        if lat is None or lng is None:
            return Response({"detail": "latitude and longitude are required."}, status=status.HTTP_400_BAD_REQUEST)

        BookingLocation.objects.update_or_create(
            booking=booking,
            user=request.user,
            defaults={"latitude": lat, "longitude": lng, "is_sharing": True},
        )
        return Response({"detail": "Location updated."})


class StopSharingView(APIView):
    """User withdraws consent and stops sharing their location."""
    permission_classes = (IsAuthenticated,)

    def post(self, request, booking_id):
        BookingLocation.objects.filter(
            booking_id=booking_id, user=request.user
        ).update(is_sharing=False)
        return Response({"detail": "Location sharing stopped."})


class BookingLocationsView(APIView):
    """Return the current locations of both parties for a booking."""
    permission_classes = (IsAuthenticated,)

    def get(self, request, booking_id):
        booking, err = _get_booking_or_error(booking_id, request.user)
        if err:
            return err

        locations = BookingLocation.objects.filter(
            booking=booking, is_sharing=True
        ).select_related("user")

        is_client = request.user == booking.client

        result = {}
        for loc in locations:
            is_me = loc.user == request.user
            role  = "client" if loc.user == booking.client else "provider"
            result[role] = {
                "username":  loc.user.username,
                "latitude":  float(loc.latitude),
                "longitude": float(loc.longitude),
                "updated_at": loc.updated_at.isoformat(),
                "is_me": is_me,
            }

        return Response({
            "booking_id": booking.id,
            "locations":  result,
            "my_role":    "client" if is_client else "provider",
        })
