from django.urls import path
from .views import MarkAllReadView, MarkReadView, NotificationListView, UnreadCountView
from .views_internal import (
    InternalBookingEmailView,
    InternalCreateNotificationView,
    InternalPasswordResetEmailView,
    InternalReviewEmailView,
    InternalStatsView,
    InternalWelcomeEmailView,
)

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("unread/", UnreadCountView.as_view(), name="notification-unread-count"),
    path("mark-all-read/", MarkAllReadView.as_view(), name="notification-mark-all-read"),
    path("<int:pk>/read/", MarkReadView.as_view(), name="notification-mark-read"),
    # Internal
    path("internal/notifications/", InternalCreateNotificationView.as_view()),
    path("internal/email/booking-status/", InternalBookingEmailView.as_view()),
    path("internal/email/welcome/", InternalWelcomeEmailView.as_view()),
    path("internal/email/password-reset/", InternalPasswordResetEmailView.as_view()),
    path("internal/email/review/", InternalReviewEmailView.as_view()),
    path("internal/stats/", InternalStatsView.as_view()),
]
