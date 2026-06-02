from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied

from apps.users.permissions import IsClient

from .models import Review
from .serializers import ReviewCreateSerializer, ReviewSerializer, ReviewUpdateSerializer


class ReviewCreateView(generics.CreateAPIView):
    """Client submits a review for a completed booking."""
    serializer_class = ReviewCreateSerializer
    permission_classes = (IsClient,)


class ReviewUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    """Client edits or deletes their own review."""
    permission_classes = (IsClient,)

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return ReviewUpdateSerializer
        return ReviewSerializer

    def get_queryset(self):
        return Review.objects.filter(client=self.request.user)


class ServiceReviewListView(generics.ListAPIView):
    """Public list of all reviews for a specific service."""
    serializer_class = ReviewSerializer
    permission_classes = (permissions.AllowAny,)
    ordering_fields = ("rating", "created_at")
    ordering = ("-created_at",)

    def get_queryset(self):
        return Review.objects.filter(
            service_id=self.kwargs["service_pk"]
        ).select_related("client")


class ProviderReviewListView(generics.ListAPIView):
    """Public list of all reviews for a specific provider."""
    serializer_class = ReviewSerializer
    permission_classes = (permissions.AllowAny,)
    ordering = ("-created_at",)

    def get_queryset(self):
        return Review.objects.filter(
            service__provider_id=self.kwargs["provider_pk"]
        ).select_related("client", "service")


class MyReviewListView(generics.ListAPIView):
    """Client sees all reviews they have written."""
    serializer_class = ReviewSerializer
    permission_classes = (IsClient,)

    def get_queryset(self):
        return Review.objects.filter(client=self.request.user).select_related("service")
