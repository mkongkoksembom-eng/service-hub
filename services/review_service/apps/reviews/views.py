from rest_framework import generics
from rest_framework.permissions import AllowAny

from shared.cache_utils import CacheListMixin, UserCacheListMixin, bust_public_list, bust_user_list
from shared.permissions import IsClient

from .models import Review
from .serializers import ReviewCreateSerializer, ReviewSerializer, ReviewUpdateSerializer

_MY_REVIEWS_PATH = "/api/reviews/my/"


def _service_reviews_path(service_id):
    return f"/api/reviews/service/{service_id}/"


def _provider_reviews_path(provider_id):
    return f"/api/reviews/provider/{provider_id}/"


def _bust_review_caches(review):
    bust_public_list(_service_reviews_path(review.service_id))
    bust_public_list(_provider_reviews_path(review.provider_id))
    bust_user_list(review.client_id, _MY_REVIEWS_PATH)


class ReviewCreateView(generics.CreateAPIView):
    serializer_class = ReviewCreateSerializer
    permission_classes = (IsClient,)

    def perform_create(self, serializer):
        review = serializer.save()
        _bust_review_caches(review)
        import clients
        clients.notify(
            recipient_id=review.provider_user_id,
            notification_type="new_review",
            title="New Review",
            message=f"{review.client_username} left a {review.rating}-star review for '{review.service_title}'.",
            booking_id=review.booking_id,
        )
        clients.send_review_email(
            reviewer_username=review.client_username,
            service_title=review.service_title,
            rating=review.rating,
            provider_email="",
        )


class ReviewUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (IsClient,)

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return ReviewUpdateSerializer
        return ReviewSerializer

    def get_queryset(self):
        return Review.objects.filter(client_id=self.request.user.id)

    def perform_update(self, serializer):
        review = serializer.save()
        _bust_review_caches(review)

    def perform_destroy(self, instance):
        _bust_review_caches(instance)
        import clients
        from django.db.models import Avg, Count

        provider_id = instance.provider_id
        instance.delete()

        result = Review.objects.filter(provider_id=provider_id).aggregate(
            avg=Avg("rating"), count=Count("id")
        )
        clients.update_provider_rating(
            provider_id=provider_id,
            avg_rating=round(result["avg"] or 0, 2),
            total_reviews=result["count"],
        )


class ServiceReviewListView(CacheListMixin, generics.ListAPIView):
    serializer_class = ReviewSerializer
    permission_classes = (AllowAny,)
    ordering_fields = ("rating", "created_at")
    ordering = ("-created_at",)
    cache_timeout = 120

    def get_queryset(self):
        return Review.objects.filter(service_id=self.kwargs["service_pk"])


class ProviderReviewListView(CacheListMixin, generics.ListAPIView):
    serializer_class = ReviewSerializer
    permission_classes = (AllowAny,)
    ordering = ("-created_at",)
    cache_timeout = 120

    def get_queryset(self):
        return Review.objects.filter(provider_id=self.kwargs["provider_pk"])


class MyReviewListView(UserCacheListMixin, generics.ListAPIView):
    serializer_class = ReviewSerializer
    permission_classes = (IsClient,)
    cache_timeout = 60

    def get_queryset(self):
        return Review.objects.filter(client_id=self.request.user.id)
