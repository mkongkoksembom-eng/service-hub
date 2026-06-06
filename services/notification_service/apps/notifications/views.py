from django.core.cache import cache
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer

_UNREAD_TTL = 20  # seconds


def _unread_key(user_id):
    return f"view:unread:{user_id}"


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = (IsAuthenticated,)
    filterset_fields = ("is_read", "notification_type")

    def get_queryset(self):
        return Notification.objects.filter(recipient_id=self.request.user.id)


class MarkReadView(APIView):
    permission_classes = (IsAuthenticated,)

    def patch(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, recipient_id=request.user.id)
        except Notification.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        cache.delete(_unread_key(request.user.id))
        return Response(NotificationSerializer(notification).data)


class MarkAllReadView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        count = Notification.objects.filter(
            recipient_id=request.user.id, is_read=False
        ).update(is_read=True)
        cache.delete(_unread_key(request.user.id))
        return Response({"marked_read": count})


class UnreadCountView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        key = _unread_key(request.user.id)
        count = cache.get(key)
        if count is None:
            count = Notification.objects.filter(recipient_id=request.user.id, is_read=False).count()
            cache.set(key, count, _UNREAD_TTL)
        return Response({"unread_count": count})
