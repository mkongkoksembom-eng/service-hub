from django.core.cache import cache
from rest_framework.response import Response


# ── Public (path-scoped) mixins ──────────────────────────────────────────────

class CacheListMixin:
    """Cache list responses keyed by full request path (safe for public/anonymous endpoints)."""
    cache_timeout = 60

    def list(self, request, *args, **kwargs):
        key = f"view:list:{request.get_full_path()}"
        data = cache.get(key)
        if data is None:
            response = super().list(request, *args, **kwargs)
            cache.set(key, response.data, self.cache_timeout)
            return response
        return Response(data)


class CacheRetrieveMixin:
    """Cache retrieve responses keyed by full request path (safe for public endpoints)."""
    cache_timeout = 60

    def retrieve(self, request, *args, **kwargs):
        key = f"view:retrieve:{request.get_full_path()}"
        data = cache.get(key)
        if data is None:
            response = super().retrieve(request, *args, **kwargs)
            cache.set(key, response.data, self.cache_timeout)
            return response
        return Response(data)


# ── User-scoped mixin ────────────────────────────────────────────────────────

class UserCacheListMixin:
    """Cache list responses scoped to the authenticated user.
    Prevents user A's data from being served to user B on the same endpoint.
    Key format: view:list:<user_id>:<full_path>
    """
    cache_timeout = 60

    def list(self, request, *args, **kwargs):
        key = f"view:list:{request.user.id}:{request.get_full_path()}"
        data = cache.get(key)
        if data is None:
            response = super().list(request, *args, **kwargs)
            cache.set(key, response.data, self.cache_timeout)
            return response
        return Response(data)


# ── Targeted cache invalidation helpers ─────────────────────────────────────

def bust_user_list(user_id, path):
    """Delete a single user-scoped list cache entry.
    Call on write operations: path must match the list endpoint path exactly.
    e.g. bust_user_list(user.id, '/api/bookings/client/')
    """
    cache.delete(f"view:list:{user_id}:{path}")


def bust_public_list(path):
    """Delete a public path-scoped list cache entry."""
    cache.delete(f"view:list:{path}")


def bust_public_retrieve(path):
    """Delete a public path-scoped retrieve cache entry."""
    cache.delete(f"view:retrieve:{path}")
