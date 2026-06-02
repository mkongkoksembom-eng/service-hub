from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.db.models import Avg
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from apps.notifications.tasks import send_password_reset_task, send_welcome_task
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User
from .serializers import (
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserProfileSerializer,
)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        send_welcome_task.delay(user.id)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = (IsAuthenticated,)

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password updated successfully."}, status=status.HTTP_200_OK)


class PasswordResetRequestView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
            reset_link = f"{frontend_url}/reset-password/{uid}/{token}"
            send_password_reset_task.delay(user.username, user.email, reset_link)

        # Always return 200 to prevent email enumeration
        return Response(
            {"detail": "If this email is registered, a reset link has been sent."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password reset successfully. You can now log in."})


class PublicStatsView(APIView):
    """Public platform-wide statistics for the landing page."""
    permission_classes = (AllowAny,)

    def get(self, request):
        from django.db.models import Count, Q
        from apps.services.models import Category, Service
        from apps.reviews.models import Review
        from apps.bookings.models import Booking

        avg = Review.objects.aggregate(avg=Avg("rating"))["avg"] or 0

        # Subcategories ranked by number of active services they contain
        popular_jobs = list(
            Category.objects
            .filter(parent__isnull=False)
            .annotate(svc_count=Count("services", filter=Q(services__is_active=True)))
            .filter(svc_count__gt=0)
            .order_by("-svc_count")
            .values_list("name", flat=True)[:6]
        )

        return Response({
            "total_clients":            User.objects.filter(role=User.Role.CLIENT).count(),
            "total_providers":          User.objects.filter(role=User.Role.PROVIDER).count(),
            "total_active_services":    Service.objects.filter(is_active=True).count(),
            "total_categories":         Category.objects.filter(parent=None).count(),
            "total_reviews":            Review.objects.count(),
            "average_rating":           round(float(avg), 1),
            "total_completed_bookings": Booking.objects.filter(status=Booking.Status.COMPLETED).count(),
            "popular_jobs":             popular_jobs,
        })


class UserListView(generics.ListAPIView):
    """Admin-only: list all users."""
    serializer_class = UserProfileSerializer
    permission_classes = (IsAuthenticated,)
    queryset = User.objects.all()
    search_fields = ("email", "username", "role")
    ordering_fields = ("date_joined", "email")

    def get_queryset(self):
        if not (self.request.user.role == "admin" or self.request.user.is_staff):
            return User.objects.filter(id=self.request.user.id)
        return super().get_queryset()


class AdminDashboardView(APIView):
    """Admin-only: rich stats + recent activity for the admin dashboard."""
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        if not (request.user.role == "admin" or request.user.is_staff):
            return Response({"detail": "Permission denied."}, status=403)

        from django.db.models import Count, Sum, Q
        from apps.bookings.models import Booking
        from apps.services.models import Service
        from apps.reviews.models import Review
        from apps.payments.models import Payment

        # ── Aggregate stats ──────────────────────────────────────────
        total_clients   = User.objects.filter(role=User.Role.CLIENT).count()
        total_providers = User.objects.filter(role=User.Role.PROVIDER).count()
        total_services  = Service.objects.filter(is_active=True).count()
        total_bookings  = Booking.objects.count()
        total_revenue   = Payment.objects.filter(status="paid").aggregate(
            total=Sum("amount")
        )["total"] or 0
        avg_rating      = Review.objects.aggregate(avg=Avg("rating"))["avg"] or 0

        booking_by_status = list(
            Booking.objects.values("status")
            .annotate(count=Count("id"))
            .order_by("status")
        )

        # ── Recent 10 bookings ───────────────────────────────────────
        from apps.bookings.serializers import BookingSerializer
        recent_bookings = Booking.objects.select_related(
            "client", "service__provider__user", "service__category"
        ).order_by("-created_at")[:10]

        # ── Recent 10 users ──────────────────────────────────────────
        recent_users = User.objects.order_by("-date_joined")[:10]

        return Response({
            "stats": {
                "total_clients":    total_clients,
                "total_providers":  total_providers,
                "total_services":   total_services,
                "total_bookings":   total_bookings,
                "total_revenue":    float(total_revenue),
                "average_rating":   round(float(avg_rating), 1),
            },
            "booking_by_status": booking_by_status,
            "recent_bookings":   BookingSerializer(recent_bookings, many=True).data,
            "recent_users":      UserProfileSerializer(recent_users, many=True).data,
        })
