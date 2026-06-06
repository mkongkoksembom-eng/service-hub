from django.conf import settings
from rest_framework.permissions import BasePermission


class InternalKeyPermission(BasePermission):
    """Validates the X-Internal-Key header for service-to-service calls."""

    def has_permission(self, request, view):
        key = request.META.get("HTTP_X_INTERNAL_KEY", "")
        internal_key = getattr(settings, "INTERNAL_API_KEY", "")
        return bool(internal_key) and key == internal_key
