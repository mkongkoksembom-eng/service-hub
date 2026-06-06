import logging
import os

import requests

logger = logging.getLogger("apps")

BOOKING_URL = os.environ.get("BOOKING_SERVICE_URL", "http://booking_service:8003")
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
