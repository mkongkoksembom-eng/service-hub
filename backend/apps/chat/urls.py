from django.urls import path
from .views import BookingChatView

urlpatterns = [
    path("<int:booking_id>/", BookingChatView.as_view(), name="booking-chat"),
]
