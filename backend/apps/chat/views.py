from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.bookings.models import Booking
from .models import Message
from .serializers import MessageSerializer


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

    if booking.status != Booking.Status.COMPLETED:
        return None, Response(
            {"detail": "Chat is only available for completed bookings."},
            status=status.HTTP_403_FORBIDDEN,
        )

    return booking, None


class BookingChatView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, booking_id):
        booking, err = _get_booking_or_error(booking_id, request.user)
        if err:
            return err

        # Mark all incoming messages as read
        booking.messages.exclude(sender=request.user).update(is_read=True)

        messages = booking.messages.select_related("sender").all()
        serializer = MessageSerializer(messages, many=True, context={"request": request})
        return Response(serializer.data)

    def post(self, request, booking_id):
        booking, err = _get_booking_or_error(booking_id, request.user)
        if err:
            return err

        content = request.data.get("content", "").strip()
        if not content:
            return Response({"detail": "Message cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        message = Message.objects.create(
            booking=booking,
            sender=request.user,
            content=content,
        )
        return Response(
            MessageSerializer(message, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )
