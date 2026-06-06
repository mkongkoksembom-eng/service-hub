import logging
import os
import requests
from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger("apps")

NOTIFICATION_URL = os.environ.get("NOTIFICATION_SERVICE_URL", "http://notification_service:8006")
INTERNAL_KEY = os.environ.get("INTERNAL_API_KEY", "")
_HEADERS = {"X-Internal-Key": INTERNAL_KEY}


def _call_notification(endpoint, data):
    try:
        requests.post(
            f"{NOTIFICATION_URL}{endpoint}",
            json=data,
            headers=_HEADERS,
            timeout=5,
        )
    except Exception as exc:
        logger.warning("Notification service call failed %s: %s", endpoint, exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_welcome_task(self, user_id):
    try:
        from .models import User
        user = User.objects.get(pk=user_id)
        _call_notification("/internal/email/welcome/", {
            "username": user.username,
            "email": user.email,
            "role": user.role,
        })
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_password_reset_task(self, username, email, reset_link):
    try:
        _call_notification("/internal/email/password-reset/", {
            "username": username,
            "email": email,
            "reset_link": reset_link,
        })
    except Exception as exc:
        raise self.retry(exc=exc)
