import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Message
from .serializers import MessageSerializer

logger = logging.getLogger("apps")

CHAT_ACTIVE_STATUSES = ("confirmed", "in_progress", "completed")

_MAX_FILE_BYTES = 25 * 1024 * 1024  # 25 MB

_ALLOWED_MIME = {
    Message.Type.IMAGE: {"image/jpeg", "image/png", "image/gif", "image/webp"},
    Message.Type.VIDEO: {"video/mp4", "video/webm", "video/ogg", "video/quicktime"},
    Message.Type.AUDIO: {"audio/webm", "audio/ogg", "audio/mpeg", "audio/wav", "audio/mp4"},
    Message.Type.FILE:  None,
}


def _verify_booking_access(booking_id, user_id):
    import clients
    try:
        booking = clients.get_booking(booking_id)
    except Exception:
        return None, Response({"detail": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)

    is_client   = booking["client_id"] == user_id
    is_provider = booking["provider_user_id"] == user_id
    if not (is_client or is_provider):
        return None, Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

    if booking["status"] not in CHAT_ACTIVE_STATUSES:
        return None, Response(
            {"detail": "Chat is only available for confirmed, in-progress, or completed bookings."},
            status=status.HTTP_403_FORBIDDEN,
        )

    return booking, None


class HeartbeatView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        from django.core.cache import cache
        cache.set(f"user_online:{request.user.id}", 1, timeout=35)
        return Response({"detail": "ok"})


class UserPresenceView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        from django.core.cache import cache
        raw = request.query_params.get("ids", "")
        try:
            ids = [int(i) for i in raw.split(",") if i.strip()]
        except ValueError:
            return Response({"detail": "ids must be comma-separated integers."}, status=status.HTTP_400_BAD_REQUEST)
        result = {uid: bool(cache.get(f"user_online:{uid}")) for uid in ids}
        return Response(result)


class BookingChatView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, booking_id):
        booking, err = _verify_booking_access(booking_id, request.user.id)
        if err:
            return err

        Message.objects.filter(
            booking_id=booking_id, is_read=False
        ).exclude(sender_id=request.user.id).update(is_read=True)

        messages = Message.objects.filter(booking_id=booking_id)
        return Response(MessageSerializer(messages, many=True, context={"request": request}).data)

    def post(self, request, booking_id):
        booking, err = _verify_booking_access(booking_id, request.user.id)
        if err:
            return err

        msg_type = request.data.get("msg_type", Message.Type.TEXT)
        if msg_type not in Message.Type.values:
            return Response({"detail": "Invalid message type."}, status=status.HTTP_400_BAD_REQUEST)

        if msg_type == Message.Type.TEXT:
            content = request.data.get("content", "").strip()
            if not content:
                return Response({"detail": "Message cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)
            if len(content) > 2000:
                return Response({"detail": "Message cannot exceed 2000 characters."}, status=status.HTTP_400_BAD_REQUEST)
            message = Message.objects.create(
                booking_id=booking_id,
                sender_id=request.user.id,
                sender_username=request.user.username,
                msg_type=Message.Type.TEXT,
                content=content,
            )
        else:
            uploaded = request.FILES.get("file")
            if not uploaded:
                return Response({"detail": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)
            if uploaded.size > _MAX_FILE_BYTES:
                return Response({"detail": "File exceeds the 25 MB limit."}, status=status.HTTP_400_BAD_REQUEST)
            allowed = _ALLOWED_MIME.get(msg_type)
            if allowed is not None and uploaded.content_type not in allowed:
                return Response({"detail": f"Invalid file type for {msg_type}."}, status=status.HTTP_400_BAD_REQUEST)
            message = Message.objects.create(
                booking_id=booking_id,
                sender_id=request.user.id,
                sender_username=request.user.username,
                msg_type=msg_type,
                file=uploaded,
                file_name=uploaded.name,
                file_size=uploaded.size,
            )

        return Response(
            MessageSerializer(message, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )
