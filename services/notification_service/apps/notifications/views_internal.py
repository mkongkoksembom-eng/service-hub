from rest_framework.response import Response
from rest_framework.views import APIView

from shared.internal_auth import InternalKeyPermission

from .models import Notification
from .tasks import (
    send_booking_email_task,
    send_password_reset_email_task,
    send_review_email_task,
    send_welcome_email_task,
)


class InternalCreateNotificationView(APIView):
    """Creates an in-app notification. Called by booking/payment/review services."""
    permission_classes = (InternalKeyPermission,)
    authentication_classes = []

    def post(self, request):
        recipient_id = request.data.get("recipient_id")
        notification_type = request.data.get("notification_type")
        title = request.data.get("title", "")
        message = request.data.get("message", "")
        booking_id = request.data.get("booking_id")

        if not recipient_id or not notification_type:
            return Response({"detail": "recipient_id and notification_type required."}, status=400)

        Notification.objects.create(
            recipient_id=recipient_id,
            notification_type=notification_type,
            title=title,
            message=message,
            booking_id=booking_id,
        )
        return Response({"detail": "created"}, status=201)


class InternalBookingEmailView(APIView):
    """Sends booking status emails asynchronously. Called by booking_service."""
    permission_classes = (InternalKeyPermission,)
    authentication_classes = []

    def post(self, request):
        send_booking_email_task.delay(request.data)
        return Response({"detail": "queued"})


class InternalWelcomeEmailView(APIView):
    """Sends welcome email. Called by user_service on registration."""
    permission_classes = (InternalKeyPermission,)
    authentication_classes = []

    def post(self, request):
        send_welcome_email_task.delay(request.data)
        return Response({"detail": "queued"})


class InternalPasswordResetEmailView(APIView):
    """Sends password reset email. Called by user_service."""
    permission_classes = (InternalKeyPermission,)
    authentication_classes = []

    def post(self, request):
        send_password_reset_email_task.delay(request.data)
        return Response({"detail": "queued"})


class InternalReviewEmailView(APIView):
    """Sends review received email. Called by review_service."""
    permission_classes = (InternalKeyPermission,)
    authentication_classes = []

    def post(self, request):
        send_review_email_task.delay(request.data)
        return Response({"detail": "queued"})


class InternalStatsView(APIView):
    permission_classes = (InternalKeyPermission,)
    authentication_classes = []

    def get(self, request):
        return Response({
            "total_notifications": Notification.objects.count(),
            "total_unread": Notification.objects.filter(is_read=False).count(),
        })
