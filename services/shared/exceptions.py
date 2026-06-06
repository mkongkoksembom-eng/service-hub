import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger("apps")


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None:
        view = context.get("view")
        logger.exception(
            "Unhandled exception in %s",
            view.__class__.__name__ if view else "unknown view",
            exc_info=exc,
        )
        return Response(
            {"detail": "An unexpected error occurred. Please try again later."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if response.status_code >= 500:
        view = context.get("view")
        logger.error(
            "Server error %s in %s: %s",
            response.status_code,
            view.__class__.__name__ if view else "unknown view",
            response.data,
        )

    return response
