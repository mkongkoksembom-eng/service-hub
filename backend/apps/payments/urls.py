from django.urls import path

from .views import (
    ClientPaymentListView,
    FeaturedMoMoRequestView,
    FeaturedMoMoStatusView,
    FeaturedPaymentCreateView,
    MoMoRequestPayView,
    MoMoStatusView,
    PaymentCreateView,
    PaymentDetailView,
    PaymentRefundView,
    ProviderPaymentListView,
)

urlpatterns = [
    path("", PaymentCreateView.as_view(), name="payment-create"),
    path("my/", ClientPaymentListView.as_view(), name="client-payments"),
    path("provider/", ProviderPaymentListView.as_view(), name="provider-payments"),
    path("<int:pk>/", PaymentDetailView.as_view(), name="payment-detail"),
    path("<int:pk>/momo/request/", MoMoRequestPayView.as_view(), name="momo-request"),
    path("<int:pk>/momo/status/", MoMoStatusView.as_view(), name="momo-status"),
    path("<int:pk>/refund/", PaymentRefundView.as_view(), name="payment-refund"),
    # Featured listings
    path("featured/", FeaturedPaymentCreateView.as_view(), name="featured-create"),
    path("featured/<int:pk>/momo/request/", FeaturedMoMoRequestView.as_view(), name="featured-momo-request"),
    path("featured/<int:pk>/momo/status/", FeaturedMoMoStatusView.as_view(), name="featured-momo-status"),
]
