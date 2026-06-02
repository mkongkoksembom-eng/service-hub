from django.urls import path

from .views import (
    MyReviewListView,
    ProviderReviewListView,
    ReviewCreateView,
    ReviewUpdateDeleteView,
    ServiceReviewListView,
)

urlpatterns = [
    path("", ReviewCreateView.as_view(), name="review-create"),
    path("<int:pk>/", ReviewUpdateDeleteView.as_view(), name="review-detail"),
    path("my/", MyReviewListView.as_view(), name="my-reviews"),
    path("service/<int:service_pk>/", ServiceReviewListView.as_view(), name="service-reviews"),
    path("provider/<int:provider_pk>/", ProviderReviewListView.as_view(), name="provider-reviews"),
]
