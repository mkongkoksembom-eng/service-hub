from django.urls import path
from .views import (
    MyReviewListView,
    ProviderReviewListView,
    ReviewCreateView,
    ReviewUpdateDeleteView,
    ServiceReviewListView,
)
from .views_internal import InternalStatsView

urlpatterns = [
    path("", ReviewCreateView.as_view(), name="review-create"),
    path("my/", MyReviewListView.as_view(), name="my-reviews"),
    path("<int:pk>/", ReviewUpdateDeleteView.as_view(), name="review-detail"),
    path("service/<int:service_pk>/", ServiceReviewListView.as_view(), name="service-reviews"),
    path("provider/<int:provider_pk>/", ProviderReviewListView.as_view(), name="provider-reviews"),
    path("internal/stats/", InternalStatsView.as_view()),
]
