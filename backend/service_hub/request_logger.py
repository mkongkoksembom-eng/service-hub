import logging
import time

logger = logging.getLogger("request")


class RequestLoggerMiddleware:
    """Log every HTTP request: method, path, status code, duration, and user ID."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.monotonic()
        response = self.get_response(request)
        duration_ms = round((time.monotonic() - start) * 1000)

        user_id = self._get_user_id(request)
        status = response.status_code
        level = logging.WARNING if status >= 500 else logging.INFO

        logger.log(
            level,
            "%s %s %s %dms",
            request.method,
            request.path,
            status,
            duration_ms,
            extra={
                "http_method":  request.method,
                "http_path":    request.path,
                "http_status":  status,
                "duration_ms":  duration_ms,
                "user_id":      user_id,
            },
        )
        return response

    @staticmethod
    def _get_user_id(request):
        user = getattr(request, "user", None)
        if user and user.is_authenticated:
            return user.id
        return None
