import logging
import os

import requests
from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from shared.cache_utils import CacheListMixin, CacheRetrieveMixin
from shared.permissions import IsProvider

from .filters import ServiceFilter
from .models import Category, ProviderProfile, Service
from .serializers import (
    CategoryGroupedSerializer,
    CategorySerializer,
    ProviderProfileSerializer,
    PublicProviderProfileSerializer,
    ServiceListSerializer,
    ServiceSerializer,
)

logger = logging.getLogger("apps")

_INTERNAL_HEADERS = {"X-Internal-Key": os.environ.get("INTERNAL_API_KEY", "")}


def _booking_exists(client_id, provider_id):
    """Check via booking_service whether the client has a confirmed booking with the provider."""
    try:
        url = f"{settings.BOOKING_SERVICE_URL}/internal/bookings/count/"
        r = requests.get(
            url,
            params={"client_id": client_id, "provider_id": provider_id, "status": "confirmed,in_progress,completed"},
            headers=_INTERNAL_HEADERS,
            timeout=3,
        )
        return r.json().get("count", 0) > 0
    except Exception as exc:
        logger.warning("Booking count check failed: %s", exc)
        return False


class CategoryListView(CacheListMixin, generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = (permissions.AllowAny,)
    pagination_class = None
    cache_timeout = 300


class CategoryGroupedListView(CacheListMixin, generics.ListAPIView):
    serializer_class = CategoryGroupedSerializer
    permission_classes = (permissions.AllowAny,)
    pagination_class = None
    cache_timeout = 300

    def get_queryset(self):
        return Category.objects.filter(parent=None).prefetch_related("subcategories")


class ProviderProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = ProviderProfileSerializer
    permission_classes = (IsProvider,)

    def get_object(self):
        profile, _ = ProviderProfile.objects.get_or_create(
            user_id=self.request.user.id,
            defaults={
                "username": self.request.user.username,
                "email": self.request.user.email,
            },
        )
        # Refresh cached user fields from JWT on every access
        if profile.username != self.request.user.username or profile.email != self.request.user.email:
            profile.username = self.request.user.username
            profile.email = self.request.user.email
            profile.save(update_fields=["username", "email"])
        return profile


class ProviderProfileDetailView(generics.RetrieveAPIView):
    queryset = ProviderProfile.objects.all()
    permission_classes = (permissions.AllowAny,)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        show_contact = (
            user.is_authenticated and (
                user.id == instance.user_id
                or getattr(user, "is_staff", False)
                or getattr(user, "role", "") == "admin"
                or _booking_exists(user.id, instance.id)
            )
        )
        serializer_class = ProviderProfileSerializer if show_contact else PublicProviderProfileSerializer
        return Response(serializer_class(instance, context=self.get_serializer_context()).data)


class ServiceListView(CacheListMixin, generics.ListAPIView):
    serializer_class = ServiceListSerializer
    permission_classes = (permissions.AllowAny,)
    cache_timeout = 60
    filterset_class = ServiceFilter
    search_fields = ("title", "description", "location", "category__name", "provider__username")
    ordering_fields = ("price", "created_at", "provider__average_rating")
    ordering = ("-created_at",)

    def get_queryset(self):
        return (
            Service.objects
            .filter(is_active=True)
            .select_related("provider", "category")
            .order_by("-created_at")
        )


class ServiceCreateView(generics.CreateAPIView):
    serializer_class = ServiceSerializer
    permission_classes = (IsProvider,)

    def perform_create(self, serializer):
        if not ProviderProfile.objects.filter(user_id=self.request.user.id).exists():
            raise PermissionDenied("Complete your provider profile first.")
        serializer.save()


class ServiceDetailView(CacheRetrieveMixin, generics.RetrieveAPIView):
    queryset = Service.objects.select_related("provider", "category")
    serializer_class = ServiceSerializer
    permission_classes = (permissions.AllowAny,)
    cache_timeout = 60


class ServiceUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ServiceSerializer
    permission_classes = (IsProvider,)

    def get_queryset(self):
        return Service.objects.filter(provider__user_id=self.request.user.id)


class MyServicesView(generics.ListAPIView):
    serializer_class = ServiceSerializer
    permission_classes = (IsProvider,)

    def get_queryset(self):
        return Service.objects.filter(
            provider__user_id=self.request.user.id
        ).select_related("category")
