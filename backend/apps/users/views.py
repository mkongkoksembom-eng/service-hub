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
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User
from .permissions import IsAdmin
from service_hub.cache_utils import CacheListMixin
from .serializers import (
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserProfileSerializer,
)
from .throttles import LoginThrottle, OTPThrottle, PasswordResetThrottle, RegisterThrottle


def _set_auth_cookies(response, *, access_token, refresh_token=None):
    """Attach JWT tokens as HttpOnly cookies (Secure in production)."""
    kwargs = dict(httponly=True, secure=not settings.DEBUG, samesite="Strict")
    response.set_cookie("access_token", access_token, max_age=3600, **kwargs)
    if refresh_token:
        response.set_cookie("refresh_token", refresh_token, max_age=604800, **kwargs)


class SendOTPView(APIView):
    """Generate a 6-digit OTP, cache it for 10 minutes, and email it to the user."""
    permission_classes = (AllowAny,)
    throttle_classes = [OTPThrottle]

    def post(self, request):
        import random
        from django.core.cache import cache
        from django.core.validators import validate_email as _validate_email
        from django.core.exceptions import ValidationError as DjangoValidationError

        email = request.data.get("email", "").strip().lower()
        if not email:
            return Response({"email": ["Email is required."]}, status=status.HTTP_400_BAD_REQUEST)

        try:
            _validate_email(email)
        except DjangoValidationError:
            return Response({"email": ["Enter a valid email address."]}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({"email": ["An account with this email already exists."]}, status=status.HTTP_400_BAD_REQUEST)

        otp = f"{random.randint(100000, 999999)}"
        cache.set(f"reg_otp:{email}", otp, timeout=600)

        try:
            from apps.notifications.emails import send_otp_email
            send_otp_email(email, otp)
        except Exception:
            cache.delete(f"reg_otp:{email}")
            return Response(
                {"detail": "Failed to send verification email. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({"detail": "Verification code sent to your email."})


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer
    throttle_classes = [RegisterThrottle]

    def perform_create(self, serializer):
        user = serializer.save()
        send_welcome_task.delay(user.id)


class CookieTokenObtainPairView(TokenObtainPairView):
    """Login: validates credentials, sets tokens as HttpOnly cookies, returns only user data."""
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [LoginThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            access = response.data.pop("access", None)
            refresh = response.data.pop("refresh", None)
            if access and refresh:
                _set_auth_cookies(response, access_token=access, refresh_token=refresh)
        return response


class CookieTokenRefreshView(APIView):
    """Read refresh token from cookie, issue new access (and rotated refresh) cookie."""
    permission_classes = (AllowAny,)

    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")
        if not refresh_token:
            return Response({"detail": "No refresh token."}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            token = RefreshToken(refresh_token)
            access = str(token.access_token)
        except TokenError as e:
            return Response({"detail": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

        response = Response({"detail": "Token refreshed."})
        rotate = settings.SIMPLE_JWT.get("ROTATE_REFRESH_TOKENS", False)
        _set_auth_cookies(
            response,
            access_token=access,
            refresh_token=str(token) if rotate else None,
        )
        return response


class LogoutView(APIView):
    """Clear auth cookies — works even if the tokens are already expired."""
    permission_classes = (AllowAny,)

    def post(self, request):
        response = Response({"detail": "Logged out."})
        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")
        return response


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
    throttle_classes = [PasswordResetThrottle]

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
    _cache_timeout = 300

    def get(self, request):
        from django.core.cache import cache
        cached = cache.get("view:public_stats")
        if cached is not None:
            from rest_framework.response import Response
            return Response(cached)
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

        data = {
            "total_clients":            User.objects.filter(role=User.Role.CLIENT).count(),
            "total_providers":          User.objects.filter(role=User.Role.PROVIDER).count(),
            "total_active_services":    Service.objects.filter(is_active=True).count(),
            "total_categories":         Category.objects.filter(parent=None).count(),
            "total_reviews":            Review.objects.count(),
            "average_rating":           round(float(avg), 1),
            "total_completed_bookings": Booking.objects.filter(status=Booking.Status.COMPLETED).count(),
            "popular_jobs":             popular_jobs,
        }
        cache.set("view:public_stats", data, self._cache_timeout)
        return Response(data)


class UserListView(generics.ListAPIView):
    """Admin-only: list all users."""
    serializer_class = UserProfileSerializer
    permission_classes = (IsAuthenticated,)
    queryset = User.objects.all()
    search_fields = ("email", "username", "role")
    ordering_fields = ("date_joined", "email")

    def get_queryset(self):
        from rest_framework.exceptions import PermissionDenied
        if not (self.request.user.role == "admin" or self.request.user.is_staff):
            raise PermissionDenied("Admin access required.")
        return super().get_queryset()


class AdminDashboardView(APIView):
    """Admin-only: rich stats + recent activity for the admin dashboard."""
    permission_classes = (IsAdmin,)

    def get(self, request):

        from django.db.models import Count, Q
        from apps.bookings.models import Booking
        from apps.services.models import Service
        from apps.reviews.models import Review

        # ── Aggregate stats ──────────────────────────────────────────
        total_clients   = User.objects.filter(role=User.Role.CLIENT).count()
        total_providers = User.objects.filter(role=User.Role.PROVIDER).count()
        total_services  = Service.objects.filter(is_active=True).count()
        total_bookings  = Booking.objects.count()
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
                "average_rating":   round(float(avg_rating), 1),
            },
            "booking_by_status": booking_by_status,
            "recent_bookings":   BookingSerializer(recent_bookings, many=True).data,
            "recent_users":      UserProfileSerializer(recent_users, many=True).data,
        })
