from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.bookings.models import Booking
from apps.reviews.models import Review

from .tasks import (
    send_booking_request_task,
    send_booking_status_task,
    send_review_task,
)
from .models import Notification


def _create(recipient, notification_type, title, message, booking=None):
    Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        title=title,
        message=message,
        booking=booking,
    )


@receiver(post_save, sender=Booking)
def booking_notifications(sender, instance, created, update_fields, **kwargs):
    # For updates, only proceed if status was explicitly changed.
    # This prevents duplicate notifications when other fields are saved.
    if not created and update_fields and "status" not in update_fields:
        return
    booking = instance
    client = booking.client
    provider = booking.service.provider.user
    service_title = booking.service.title

    if created:
        _create(
            recipient=provider,
            notification_type=Notification.Type.BOOKING_CREATED,
            title="New Booking Request",
            message=f"{client.username} has requested '{service_title}' on {booking.scheduled_date}.",
            booking=booking,
        )
        send_booking_request_task.delay(booking.pk)
        return

    status = booking.status

    if status == Booking.Status.CONFIRMED:
        _create(
            recipient=client,
            notification_type=Notification.Type.BOOKING_CONFIRMED,
            title="Booking Confirmed",
            message=f"Your booking for '{service_title}' on {booking.scheduled_date} has been confirmed.",
            booking=booking,
        )
        send_booking_status_task.delay(booking.pk, "confirmed")

    elif status == Booking.Status.REJECTED:
        _create(
            recipient=client,
            notification_type=Notification.Type.BOOKING_REJECTED,
            title="Booking Rejected",
            message=f"Your booking for '{service_title}' was not accepted by the provider.",
            booking=booking,
        )
        send_booking_status_task.delay(booking.pk, "rejected")

    elif status == Booking.Status.CANCELLED:
        reason_text = f" Reason: {booking.cancellation_reason}" if booking.cancellation_reason else ""
        _create(
            recipient=provider,
            notification_type=Notification.Type.BOOKING_CANCELLED,
            title="Booking Cancelled",
            message=f"Booking for '{service_title}' on {booking.scheduled_date} was cancelled.{reason_text}",
            booking=booking,
        )
        _create(
            recipient=client,
            notification_type=Notification.Type.BOOKING_CANCELLED,
            title="Booking Cancelled",
            message=f"Your booking for '{service_title}' on {booking.scheduled_date} was cancelled.{reason_text}",
            booking=booking,
        )
        send_booking_status_task.delay(booking.pk, "cancelled")

    elif status == Booking.Status.IN_PROGRESS:
        _create(
            recipient=client,
            notification_type=Notification.Type.BOOKING_IN_PROGRESS,
            title="Service In Progress",
            message=f"The provider has started work on '{service_title}'.",
            booking=booking,
        )
        send_booking_status_task.delay(booking.pk, "in_progress")

    elif status == Booking.Status.COMPLETED:
        _create(
            recipient=client,
            notification_type=Notification.Type.BOOKING_COMPLETED,
            title="Booking Completed",
            message=f"'{service_title}' has been completed. Don't forget to leave a review!",
            booking=booking,
        )
        send_booking_status_task.delay(booking.pk, "completed")
        # Deactivate the service so it no longer appears in listings
        booking.service.__class__.objects.filter(pk=booking.service_id).update(is_active=False)


@receiver(post_save, sender=Review)
def review_notification(sender, instance, created, **kwargs):
    if not created:
        return
    provider = instance.service.provider.user
    _create(
        recipient=provider,
        notification_type=Notification.Type.REVIEW_RECEIVED,
        title="New Review Received",
        message=f"{instance.client.username} left a {instance.rating}-star review on '{instance.service.title}'.",
    )
    send_review_task.delay(instance.pk)
