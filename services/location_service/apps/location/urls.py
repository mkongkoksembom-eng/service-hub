from django.urls import path
from .views import BookingLocationsView, StopSharingView, UpdateLocationView

urlpatterns = [
    path("<int:booking_id>/", BookingLocationsView.as_view(), name="booking-locations"),
    path("<int:booking_id>/update/", UpdateLocationView.as_view(), name="update-location"),
    path("<int:booking_id>/stop/", StopSharingView.as_view(), name="stop-sharing"),
]
