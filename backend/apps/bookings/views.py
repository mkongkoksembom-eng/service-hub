from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import IsClient, IsProvider

from .models import Booking
from .serializers import BookingCreateSerializer, BookingSerializer, BookingStatusUpdateSerializer


class BookingCreateView(generics.CreateAPIView):
    """Client creates a booking."""
    serializer_class = BookingCreateSerializer
    permission_classes = (IsClient,)


class BookingDetailView(generics.RetrieveAPIView):
    """Client or provider retrieves a booking they are part of."""
    serializer_class = BookingSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        return Booking.objects.filter(
            client=user
        ) | Booking.objects.filter(
            service__provider__user=user
        )


class ClientBookingListView(generics.ListAPIView):
    """Client sees all their own bookings."""
    serializer_class = BookingSerializer
    permission_classes = (IsClient,)
    filterset_fields = ("status",)
    ordering_fields = ("scheduled_date", "created_at")

    def get_queryset(self):
        return Booking.objects.filter(client=self.request.user).select_related(
            "service__provider__user", "service__category", "client"
        )


class ProviderBookingListView(generics.ListAPIView):
    """Provider sees all bookings on their services."""
    serializer_class = BookingSerializer
    permission_classes = (IsProvider,)
    filterset_fields = ("status",)
    ordering_fields = ("scheduled_date", "created_at")

    def get_queryset(self):
        return Booking.objects.filter(
            service__provider__user=self.request.user
        ).select_related("service__provider__user", "service__category", "client")


class BookingStatusUpdateView(APIView):
    """Client or provider transitions a booking to a new status."""
    permission_classes = (IsAuthenticated,)

    def get_booking(self, pk, user):
        try:
            return Booking.objects.get(
                pk=pk,
                **self._visibility_filter(user),
            )
        except Booking.DoesNotExist:
            return None

    def _visibility_filter(self, user):
        from django.db.models import Q
        return {}  # filtering done in serializer validation

    def patch(self, request, pk):
        try:
            booking = Booking.objects.get(pk=pk)
        except Booking.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        # Ensure the user is involved in this booking
        is_client = booking.client == request.user
        is_provider = booking.service.provider.user == request.user
        if not (is_client or is_provider):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = BookingStatusUpdateSerializer(
            data=request.data,
            context={"request": request, "booking": booking},
        )
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(BookingSerializer(updated).data)
