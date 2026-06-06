from celery import shared_task


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_booking_request_task(self, booking_id):
    try:
        from apps.bookings.models import Booking
        from apps.notifications.emails import send_booking_request_email
        booking = Booking.objects.select_related(
            "service__provider__user", "client"
        ).get(pk=booking_id)
        send_booking_request_email(booking)
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_booking_status_task(self, booking_id, status):
    try:
        from apps.bookings.models import Booking
        from apps.notifications.emails import (
            send_booking_cancelled_email,
            send_booking_completed_email,
            send_booking_confirmed_email,
            send_booking_in_progress_email,
            send_booking_rejected_email,
        )
        booking = Booking.objects.select_related(
            "service__provider__user", "client"
        ).get(pk=booking_id)
        dispatch = {
            "confirmed": send_booking_confirmed_email,
            "rejected": send_booking_rejected_email,
            "cancelled": send_booking_cancelled_email,
            "in_progress": send_booking_in_progress_email,
            "completed": send_booking_completed_email,
        }
        fn = dispatch.get(status)
        if fn:
            fn(booking)
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_review_task(self, review_id):
    try:
        from apps.reviews.models import Review
        from apps.notifications.emails import send_review_received_email
        review = Review.objects.select_related(
            "service__provider__user", "client"
        ).get(pk=review_id)
        send_review_received_email(review)
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_welcome_task(self, user_id):
    try:
        from apps.users.models import User
        from apps.notifications.emails import send_welcome_email
        user = User.objects.get(pk=user_id)
        send_welcome_email(user)
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_password_reset_task(self, username, email, reset_link):
    try:
        from apps.notifications.emails import send_password_reset_email
        send_password_reset_email(username, email, reset_link)
    except Exception as exc:
        raise self.retry(exc=exc)
