from django.urls import path
from .views import (
    BookingCreateView,
    BookingDetailView,
    BookingStatusUpdateView,
    ClientBookingListView,
    ProviderBookingListView,
)
from .views_internal import (
    InternalBookingCountView,
    InternalBookingDetailView,
    InternalCreateFromJobView,
    InternalStatsView,
)

urlpatterns = [
    path("", BookingCreateView.as_view(), name="booking-create"),
    path("<int:pk>/", BookingDetailView.as_view(), name="booking-detail"),
    path("<int:pk>/status/", BookingStatusUpdateView.as_view(), name="booking-status"),
    path("my/", ClientBookingListView.as_view(), name="client-bookings"),
    path("provider/", ProviderBookingListView.as_view(), name="provider-bookings"),
    # Internal
    path("internal/bookings/<int:booking_id>/", InternalBookingDetailView.as_view()),
    path("internal/bookings/count/", InternalBookingCountView.as_view()),
    path("internal/bookings/from-job/", InternalCreateFromJobView.as_view()),
    path("internal/stats/", InternalStatsView.as_view()),
]
