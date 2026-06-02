from django.urls import path
from .views import BookingLocationsView, StopSharingView, UpdateLocationView

urlpatterns = [
    path("<int:booking_id>/",       BookingLocationsView.as_view(), name="booking-locations"),
    path("<int:booking_id>/update/", UpdateLocationView.as_view(),   name="location-update"),
    path("<int:booking_id>/stop/",   StopSharingView.as_view(),      name="location-stop"),
]
