import logging
import os

import requests

logger = logging.getLogger("apps")

CATALOG_URL = os.environ.get("CATALOG_SERVICE_URL", "http://catalog_service:8002")
NOTIFICATION_URL = os.environ.get("NOTIFICATION_SERVICE_URL", "http://notification_service:8006")
INTERNAL_KEY = os.environ.get("INTERNAL_API_KEY", "")
_HEADERS = {"X-Internal-Key": INTERNAL_KEY}


def get_service(service_id):
    """Fetch service details from catalog_service. Raises on failure."""
    r = requests.get(
        f"{CATALOG_URL}/api/services/internal/services/{service_id}/",
        headers=_HEADERS,
        timeout=5,
    )
    r.raise_for_status()
    return r.json()


def notify(recipient_id, notification_type, title, message, booking_id=None):
    """Fire-and-forget: POST to notification_service to create an in-app notification."""
    try:
        requests.post(
            f"{NOTIFICATION_URL}/api/notifications/internal/notifications/",
            json={
                "recipient_id": recipient_id,
                "notification_type": notification_type,
                "title": title,
                "message": message,
                "booking_id": booking_id,
            },
            headers=_HEADERS,
            timeout=3,
        )
    except Exception as exc:
        logger.warning("Notification call failed: %s", exc)


def send_booking_email(status, booking):
    """Fire-and-forget: ask notification_service to send a booking status email."""
    try:
        requests.post(
            f"{NOTIFICATION_URL}/api/notifications/internal/email/booking-status/",
            json={
                "status": status,
                "client_email": booking.client_email,
                "client_username": booking.client_username,
                "provider_email": booking.provider_email,
                "provider_username": booking.provider_username,
                "service_title": booking.service_title,
                "scheduled_date": str(booking.scheduled_date),
                "address": booking.address,
                "total_price": str(booking.total_price),
                "cancellation_reason": booking.cancellation_reason,
            },
            headers=_HEADERS,
            timeout=3,
        )
    except Exception as exc:
        logger.warning("Booking email call failed: %s", exc)
