from django.core.cache import cache
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from shared.cache_utils import UserCacheListMixin, bust_user_list
from shared.permissions import IsClient, IsProvider

from .models import Booking
from .serializers import BookingCreateSerializer, BookingSerializer, BookingStatusUpdateSerializer

_CLIENT_LIST_PATH   = "/api/bookings/client/"
_PROVIDER_LIST_PATH = "/api/bookings/provider/"


class BookingCreateView(generics.CreateAPIView):
    serializer_class = BookingCreateSerializer
    permission_classes = (IsClient,)

    def perform_create(self, serializer):
        booking = serializer.save()
        bust_user_list(booking.client_id,       _CLIENT_LIST_PATH)
        bust_user_list(booking.provider_user_id, _PROVIDER_LIST_PATH)
        import clients
        clients.notify(
            recipient_id=booking.provider_user_id,
            notification_type="booking_created",
            title="New Booking Request",
            message=f"{booking.client_username} has requested '{booking.service_title}' on {booking.scheduled_date}.",
            booking_id=booking.id,
        )
        clients.send_booking_email("created", booking)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        booking = serializer.instance
        return Response(BookingSerializer(booking).data, status=status.HTTP_201_CREATED)


class BookingDetailView(generics.RetrieveAPIView):
    serializer_class = BookingSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        return Booking.objects.filter(client_id=user.id) | Booking.objects.filter(provider_user_id=user.id)


class ClientBookingListView(UserCacheListMixin, generics.ListAPIView):
    serializer_class = BookingSerializer
    permission_classes = (IsClient,)
    filterset_fields = ("status",)
    ordering_fields = ("scheduled_date", "created_at")
    cache_timeout = 45

    def get_queryset(self):
        return Booking.objects.filter(client_id=self.request.user.id)


class ProviderBookingListView(UserCacheListMixin, generics.ListAPIView):
    serializer_class = BookingSerializer
    permission_classes = (IsProvider,)
    filterset_fields = ("status",)
    ordering_fields = ("scheduled_date", "created_at")
    cache_timeout = 45

    def get_queryset(self):
        return Booking.objects.filter(provider_user_id=self.request.user.id)


class BookingStatusUpdateView(APIView):
    permission_classes = (IsAuthenticated,)

    def patch(self, request, pk):
        try:
            booking = Booking.objects.get(pk=pk)
        except Booking.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        is_client = booking.client_id == user.id
        is_provider = booking.provider_user_id == user.id
        if not (is_client or is_provider):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = BookingStatusUpdateSerializer(
            data=request.data,
            context={"request": request, "booking": booking},
        )
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        bust_user_list(updated.client_id,       _CLIENT_LIST_PATH)
        bust_user_list(updated.provider_user_id, _PROVIDER_LIST_PATH)
        self._send_notifications(updated)
        return Response(BookingSerializer(updated).data)

    def _send_notifications(self, booking):
        import clients
        s = booking.status

        if s == Booking.Status.CONFIRMED:
            clients.notify(booking.client_id, "booking_confirmed", "Booking Confirmed",
                           f"Your booking for '{booking.service_title}' on {booking.scheduled_date} has been confirmed.", booking.id)
        elif s == Booking.Status.REJECTED:
            clients.notify(booking.client_id, "booking_rejected", "Booking Rejected",
                           f"Your booking for '{booking.service_title}' was not accepted by the provider.", booking.id)
        elif s == Booking.Status.CANCELLED:
            reason = f" Reason: {booking.cancellation_reason}" if booking.cancellation_reason else ""
            clients.notify(booking.provider_user_id, "booking_cancelled", "Booking Cancelled",
                           f"Booking for '{booking.service_title}' was cancelled.{reason}", booking.id)
            clients.notify(booking.client_id, "booking_cancelled", "Booking Cancelled",
                           f"Your booking for '{booking.service_title}' was cancelled.{reason}", booking.id)
        elif s == Booking.Status.IN_PROGRESS:
            clients.notify(booking.client_id, "booking_in_progress", "Service In Progress",
                           f"The provider has started work on '{booking.service_title}'.", booking.id)
        elif s == Booking.Status.COMPLETED:
            clients.notify(booking.client_id, "booking_completed", "Booking Completed",
                           f"'{booking.service_title}' has been completed. Don't forget to leave a review!", booking.id)

        clients.send_booking_email(s, booking)
