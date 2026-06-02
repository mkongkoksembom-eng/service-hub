from django.urls import path

from .views import (
    BookingCreateView,
    BookingDetailView,
    BookingStatusUpdateView,
    ClientBookingListView,
    ProviderBookingListView,
)

urlpatterns = [
    path("", BookingCreateView.as_view(), name="booking-create"),
    path("<int:pk>/", BookingDetailView.as_view(), name="booking-detail"),
    path("<int:pk>/status/", BookingStatusUpdateView.as_view(), name="booking-status"),
    path("my/", ClientBookingListView.as_view(), name="client-bookings"),
    path("provider/", ProviderBookingListView.as_view(), name="provider-bookings"),
]
