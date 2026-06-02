from django.urls import path

from .views import MarkAllReadView, MarkReadView, NotificationListView, UnreadCountView

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("unread/", UnreadCountView.as_view(), name="notification-unread-count"),
    path("mark-all-read/", MarkAllReadView.as_view(), name="notification-mark-all-read"),
    path("<int:pk>/read/", MarkReadView.as_view(), name="notification-mark-read"),
]
