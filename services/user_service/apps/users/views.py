import logging
import os

import requests
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.db.models import Avg
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User
from .permissions import IsAdmin
from .serializers import (
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserProfileSerializer,
)
from .throttles import LoginThrottle, OTPThrottle, PasswordResetThrottle, RegisterThrottle
from .tasks import send_welcome_task, send_password_reset_task

logger = logging.getLogger("apps")

_INTERNAL_HEADERS = {"X-Internal-Key": os.environ.get("INTERNAL_API_KEY", "")}


def _fetch_stats(url):
    try:
        r = requests.get(url, headers=_INTERNAL_HEADERS, timeout=3)
        r.raise_for_status()
        return r.json()
    except Exception as exc:
        logger.warning("Stats fetch failed from %s: %s", url, exc)
        return {}


def _set_auth_cookies(response, *, access_token, refresh_token=None):
    kwargs = dict(httponly=True, secure=settings.ENABLE_SSL, samesite="Strict" if settings.ENABLE_SSL else "Lax")
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
        from django.core.mail import EmailMultiAlternatives
        from django.core.validators import validate_email as _validate_email
        from django.core.exceptions import ValidationError as DjangoValidationError
        from shared import email_layout as L

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

        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
        html_body = L.layout(
            L.greeting("Welcome to Service Hub")
            + L.paragraph("To verify your email address, enter the code below during registration. It expires in <strong>10 minutes</strong>.")
            + L.otp_box(otp)
            + L.notice("&#128274;&nbsp; Do not share this code with anyone. Service Hub will never ask for your code.")
            + L.divider()
            + L.paragraph(L.muted("If you did not request this code you can safely ignore this email.")),
            frontend_url=frontend_url,
            from_email=settings.DEFAULT_FROM_EMAIL,
        )
        text_body = (
            f"Your Service Hub verification code is:\n\n"
            f"    {otp}\n\n"
            f"This code expires in 10 minutes. Do not share it with anyone."
        )

        try:
            msg = EmailMultiAlternatives(
                subject="Your Service Hub verification code",
                body=text_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[email],
            )
            msg.attach_alternative(html_body, "text/html")
            msg.send(fail_silently=False)
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
    """Aggregates stats from all services for the landing page."""
    permission_classes = (AllowAny,)

    def get(self, request):
        from django.core.cache import cache
        cached = cache.get("view:public_stats")
        if cached is not None:
            return Response(cached)

        catalog_stats = _fetch_stats(f"{settings.CATALOG_SERVICE_URL}/internal/stats/")
        booking_stats = _fetch_stats(f"{settings.BOOKING_SERVICE_URL}/internal/stats/")
        review_stats = _fetch_stats(f"{settings.REVIEW_SERVICE_URL}/internal/stats/")

        data = {
            "total_clients": User.objects.filter(role=User.Role.CLIENT).count(),
            "total_providers": User.objects.filter(role=User.Role.PROVIDER).count(),
            "total_active_services": catalog_stats.get("total_active_services", 0),
            "total_categories": catalog_stats.get("total_categories", 0),
            "total_reviews": review_stats.get("total_reviews", 0),
            "average_rating": review_stats.get("average_rating", 0),
            "total_completed_bookings": booking_stats.get("total_completed_bookings", 0),
            "popular_jobs": catalog_stats.get("popular_jobs", []),
        }
        cache.set("view:public_stats", data, 300)
        return Response(data)


class UserListView(generics.ListAPIView):
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
    """Aggregates stats from all services for the admin dashboard."""
    permission_classes = (IsAdmin,)

    def get(self, request):
        from django.db.models import Avg

        catalog_stats = _fetch_stats(f"{settings.CATALOG_SERVICE_URL}/internal/stats/")
        booking_stats = _fetch_stats(f"{settings.BOOKING_SERVICE_URL}/internal/stats/")
        review_stats = _fetch_stats(f"{settings.REVIEW_SERVICE_URL}/internal/stats/")

        recent_users = User.objects.order_by("-date_joined")[:10]

        return Response({
            "stats": {
                "total_clients": User.objects.filter(role=User.Role.CLIENT).count(),
                "total_providers": User.objects.filter(role=User.Role.PROVIDER).count(),
                "total_services": catalog_stats.get("total_active_services", 0),
                "total_bookings": booking_stats.get("total_bookings", 0),
                "average_rating": review_stats.get("average_rating", 0),
            },
            "booking_by_status": booking_stats.get("booking_by_status", []),
            "recent_bookings": booking_stats.get("recent_bookings", []),
            "recent_users": UserProfileSerializer(recent_users, many=True).data,
        })
