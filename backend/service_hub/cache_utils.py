from django.core.cache import cache
from rest_framework.response import Response


class CacheListMixin:
    """
    Cache the `list` action for read-only public endpoints.
    Cache key = full URL path + query string, so filtered/searched results
    are each cached independently.
    Override `cache_timeout` (seconds) in the subclass.
    """
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
    """Cache the `retrieve` action for read-only public detail endpoints."""
    cache_timeout = 60

    def retrieve(self, request, *args, **kwargs):
        key = f"view:retrieve:{request.get_full_path()}"
        data = cache.get(key)
        if data is None:
            response = super().retrieve(request, *args, **kwargs)
            cache.set(key, response.data, self.cache_timeout)
            return response
        return Response(data)
