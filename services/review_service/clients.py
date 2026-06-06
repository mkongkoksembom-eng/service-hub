import logging
import os

import requests

logger = logging.getLogger("apps")

CATALOG_URL = os.environ.get("CATALOG_SERVICE_URL", "http://catalog_service:8002")
BOOKING_URL = os.environ.get("BOOKING_SERVICE_URL", "http://booking_service:8003")
NOTIFICATION_URL = os.environ.get("NOTIFICATION_SERVICE_URL", "http://notification_service:8006")
INTERNAL_KEY = os.environ.get("INTERNAL_API_KEY", "")
_HEADERS = {"X-Internal-Key": INTERNAL_KEY, "Content-Type": "application/json"}


def get_booking(booking_id):
    r = requests.get(
        f"{BOOKING_URL}/api/bookings/internal/bookings/{booking_id}/",
        headers=_HEADERS,
        timeout=5,
    )
    r.raise_for_status()
    return r.json()


def get_service(service_id):
    r = requests.get(
        f"{CATALOG_URL}/api/services/internal/services/{service_id}/",
        headers=_HEADERS,
        timeout=5,
    )
    r.raise_for_status()
    return r.json()


def update_provider_rating(provider_id, avg_rating, total_reviews):
    try:
        requests.patch(
            f"{CATALOG_URL}/api/services/internal/provider-profile/{provider_id}/rating/",
            json={"average_rating": avg_rating, "total_reviews": total_reviews},
            headers=_HEADERS,
            timeout=5,
        )
    except Exception as exc:
        logger.warning("Failed to update provider rating for provider %s: %s", provider_id, exc)


def notify(recipient_id, notification_type, title, message, booking_id=None):
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
            timeout=5,
        )
    except Exception as exc:
        logger.warning("Notification call failed: %s", exc)


def send_review_email(reviewer_username, service_title, rating, provider_email):
    try:
        requests.post(
            f"{NOTIFICATION_URL}/api/notifications/internal/email/review/",
            json={
                "reviewer_username": reviewer_username,
                "service_title": service_title,
                "rating": rating,
                "provider_email": provider_email,
            },
            headers=_HEADERS,
            timeout=5,
        )
    except Exception as exc:
        logger.warning("Review email call failed: %s", exc)
