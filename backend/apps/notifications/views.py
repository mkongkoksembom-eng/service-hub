from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """Authenticated user lists their own notifications."""
    serializer_class = NotificationSerializer
    permission_classes = (IsAuthenticated,)
    filterset_fields = ("is_read", "notification_type")

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)


class MarkReadView(APIView):
    """Mark a single notification as read."""
    permission_classes = (IsAuthenticated,)

    def patch(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response(NotificationSerializer(notification).data)


class MarkAllReadView(APIView):
    """Mark all of the authenticated user's notifications as read."""
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        count = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).update(is_read=True)
        return Response({"marked_read": count})


class UnreadCountView(APIView):
    """Return count of unread notifications — useful for UI badge."""
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({"unread_count": count})
