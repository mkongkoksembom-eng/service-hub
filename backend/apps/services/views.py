from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import IsProvider
from service_hub.cache_utils import CacheListMixin, CacheRetrieveMixin

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


class CategoryListView(CacheListMixin, generics.ListAPIView):
    """Flat list of all categories (used for service detail display)."""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = (permissions.AllowAny,)
    pagination_class = None
    cache_timeout = 300  # categories rarely change


class CategoryGroupedListView(CacheListMixin, generics.ListAPIView):
    """Parent categories with subcategories nested — used for dropdowns and filters."""
    serializer_class = CategoryGroupedSerializer
    permission_classes = (permissions.AllowAny,)
    pagination_class = None
    cache_timeout = 300

    def get_queryset(self):
        return Category.objects.filter(parent=None).prefetch_related("subcategories")


class ProviderProfileView(generics.RetrieveUpdateAPIView):
    """Authenticated provider views/updates their own profile."""
    serializer_class = ProviderProfileSerializer
    permission_classes = (IsProvider,)

    def get_object(self):
        profile, _ = ProviderProfile.objects.get_or_create(user=self.request.user)
        return profile


class ProviderProfileDetailView(generics.RetrieveAPIView):
    """Public view of any provider profile. Contact details are hidden unless the
    viewer has a confirmed/in-progress/completed booking with this provider."""
    queryset = ProviderProfile.objects.select_related("user")
    permission_classes = (permissions.AllowAny,)

    def retrieve(self, request, *args, **kwargs):
        from apps.bookings.models import Booking
        instance = self.get_object()
        user = request.user
        show_contact = (
            user.is_authenticated and (
                user == instance.user
                or user.is_staff
                or Booking.objects.filter(
                    client=user,
                    service__provider=instance,
                    status__in=[
                        Booking.Status.CONFIRMED,
                        Booking.Status.IN_PROGRESS,
                        Booking.Status.COMPLETED,
                    ],
                ).exists()
            )
        )
        serializer_class = ProviderProfileSerializer if show_contact else PublicProviderProfileSerializer
        return Response(serializer_class(instance, context=self.get_serializer_context()).data)


class ServiceListView(CacheListMixin, generics.ListAPIView):
    """Public service listing with search and filters."""
    serializer_class = ServiceListSerializer
    permission_classes = (permissions.AllowAny,)
    cache_timeout = 60
    filterset_class = ServiceFilter
    search_fields = ("title", "description", "location", "category__name", "provider__user__username")
    ordering_fields = ("price", "created_at", "provider__average_rating")
    ordering = ("-created_at",)

    def get_queryset(self):
        return (
            Service.objects
            .filter(is_active=True)
            .select_related("provider__user", "category")
            .order_by("-created_at")
        )


class ServiceCreateView(generics.CreateAPIView):
    serializer_class = ServiceSerializer
    permission_classes = (IsProvider,)

    def perform_create(self, serializer):
        if not hasattr(self.request.user, "provider_profile"):
            raise PermissionDenied("Complete your provider profile first.")
        serializer.save()


class ServiceDetailView(CacheRetrieveMixin, generics.RetrieveAPIView):
    queryset = Service.objects.select_related("provider__user", "category")
    serializer_class = ServiceSerializer
    permission_classes = (permissions.AllowAny,)
    cache_timeout = 60


class ServiceUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ServiceSerializer
    permission_classes = (IsProvider,)

    def get_queryset(self):
        return Service.objects.filter(provider__user=self.request.user)


class MyServicesView(generics.ListAPIView):
    """Provider sees their own services (including inactive)."""
    serializer_class = ServiceSerializer
    permission_classes = (IsProvider,)

    def get_queryset(self):
        return Service.objects.filter(
            provider__user=self.request.user
        ).select_related("category")
