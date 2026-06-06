import logging
from celery import shared_task

logger = logging.getLogger("apps")


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_booking_email_task(self, data):
    try:
        from .emails import send_booking_email
        send_booking_email(data)
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_welcome_email_task(self, data):
    try:
        from .emails import send_welcome_email
        send_welcome_email(data)
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_password_reset_email_task(self, data):
    try:
        from .emails import send_password_reset_email
        send_password_reset_email(data)
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_review_email_task(self, data):
    try:
        from .emails import send_review_email
        send_review_email(data)
    except Exception as exc:
        raise self.retry(exc=exc)
