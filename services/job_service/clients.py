import logging
import os

import requests

logger = logging.getLogger("apps")

BOOKING_URL = os.environ.get("BOOKING_SERVICE_URL", "http://booking_service:8003")
CATALOG_URL = os.environ.get("CATALOG_SERVICE_URL", "http://catalog_service:8002")
NOTIFICATION_URL = os.environ.get("NOTIFICATION_SERVICE_URL", "http://notification_service:8006")
INTERNAL_KEY = os.environ.get("INTERNAL_API_KEY", "")
_HEADERS = {"X-Internal-Key": INTERNAL_KEY, "Content-Type": "application/json"}


def create_booking_from_job(payload: dict) -> dict:
    """Create a confirmed booking in booking_service from a job acceptance."""
    r = requests.post(
        f"{BOOKING_URL}/api/bookings/internal/bookings/from-job/",
        json=payload,
        headers=_HEADERS,
        timeout=10,
    )
    r.raise_for_status()
    return r.json()


def get_matching_providers(category: str, skills: str, limit=None) -> list:
    """Returns list of {user_id, username} dicts for providers matching the job."""
    params = {"category": category, "skills": skills}
    if limit is not None:
        params["limit"] = limit
    try:
        r = requests.get(
            f"{CATALOG_URL}/api/services/internal/providers/matching/",
            params=params,
            headers=_HEADERS,
            timeout=10,
        )
        r.raise_for_status()
        return r.json().get("providers", [])
    except Exception as exc:
        logger.warning("get_matching_providers failed: %s", exc)
        return []


def notify(recipient_id: int, notification_type: str, title: str, message: str, booking_id=None):
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
