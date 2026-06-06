from django.utils import timezone

from rest_framework import status as http_status
from rest_framework.response import Response
from rest_framework.views import APIView

from shared.internal_auth import InternalKeyPermission

from .models import Booking
from .serializers import BookingSerializer


class InternalBookingDetailView(APIView):
    permission_classes = (InternalKeyPermission,)
    authentication_classes = []

    def get(self, request, booking_id):
        try:
            booking = Booking.objects.get(pk=booking_id)
        except Booking.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        return Response(BookingSerializer(booking).data)


class InternalBookingCountView(APIView):
    """Used by catalog_service to check if a viewer has a booking with a provider."""
    permission_classes = (InternalKeyPermission,)
    authentication_classes = []

    def get(self, request):
        client_id = request.query_params.get("client_id")
        provider_id = request.query_params.get("provider_id")
        status_param = request.query_params.get("status", "")

        qs = Booking.objects.all()
        if client_id:
            qs = qs.filter(client_id=client_id)
        if provider_id:
            qs = qs.filter(provider_id=provider_id)
        if status_param:
            statuses = [s.strip() for s in status_param.split(",")]
            qs = qs.filter(status__in=statuses)

        return Response({"count": qs.count()})


class InternalCreateFromJobView(APIView):
    """Called by job_service when a client accepts an application. Creates a confirmed booking."""
    permission_classes = (InternalKeyPermission,)
    authentication_classes = []

    def post(self, request):
        data = request.data
        required = ["client_id", "client_username", "provider_user_id", "provider_username",
                    "service_title", "total_price", "scheduled_date"]
        for field in required:
            if not data.get(field) and data.get(field) != 0:
                return Response({"detail": f"Missing required field: {field}"},
                                status=http_status.HTTP_400_BAD_REQUEST)
        booking = Booking.objects.create(
            client_id=data["client_id"],
            client_username=data["client_username"],
            client_email=data.get("client_email", ""),
            service_id=0,   # no catalog entry for job-based bookings
            service_title=data["service_title"],
            provider_id=0,  # no ProviderProfile entry required
            provider_user_id=data["provider_user_id"],
            provider_username=data["provider_username"],
            provider_email=data.get("provider_email", ""),
            status=Booking.Status.CONFIRMED,
            scheduled_date=data["scheduled_date"],
            scheduled_time=data.get("scheduled_time"),
            address=data.get("address", ""),
            notes=data.get("notes", ""),
            total_price=data["total_price"],
        )
        return Response(BookingSerializer(booking).data, status=http_status.HTTP_201_CREATED)


class InternalStatsView(APIView):
    permission_classes = (InternalKeyPermission,)
    authentication_classes = []

    def get(self, request):
        from django.db.models import Count
        by_status = list(
            Booking.objects.values("status").annotate(count=Count("id")).order_by("status")
        )
        recent = list(
            Booking.objects.order_by("-created_at")[:10].values(
                "id", "client_username", "service_title", "status",
                "scheduled_date", "total_price", "created_at",
            )
        )
        return Response({
            "total_bookings": Booking.objects.count(),
            "total_completed_bookings": Booking.objects.filter(status="completed").count(),
            "booking_by_status": by_status,
            "recent_bookings": recent,
        })
