from django.urls import path
from .views import BookingChatView, HeartbeatView, UserPresenceView

urlpatterns = [
    path("<int:booking_id>/", BookingChatView.as_view(), name="booking-chat"),
    path("heartbeat/", HeartbeatView.as_view(), name="chat-heartbeat"),
    path("presence/", UserPresenceView.as_view(), name="user-presence"),
]
