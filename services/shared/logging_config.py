import json
import logging


class JSONFormatter(logging.Formatter):
    """
    Emit one JSON object per log line.
    Compatible with Datadog, Loki, ELK, and Cloud Logging log collectors.
    """

    def format(self, record: logging.LogRecord) -> str:
        payload: dict = {
            "time":    self.formatTime(record, self.datefmt),
            "level":   record.levelname,
            "logger":  record.name,
            "message": record.getMessage(),
        }

        # Fields injected by RequestLoggerMiddleware
        for key in ("http_method", "http_path", "http_status", "duration_ms", "user_id"):
            if hasattr(record, key):
                payload[key] = getattr(record, key)

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(payload, default=str)


def get_logging_config(debug: bool = False) -> dict:
    """
    Return a LOGGING dict for use in Django settings.

    - debug=True  → human-readable format (local dev)
    - debug=False → JSON format (Docker / Kubernetes — parseable by log collectors)
    """
    formatter = "verbose" if debug else "json"
    app_level  = "DEBUG" if debug else "INFO"

    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "verbose": {
                "format": "[{levelname}] {asctime} {name} — {message}",
                "style":  "{",
            },
            "json": {
                "()": "shared.logging_config.JSONFormatter",
            },
        },
        "handlers": {
            "console": {
                "class":     "logging.StreamHandler",
                "formatter": formatter,
            },
        },
        "root": {
            "handlers": ["console"],
            "level":    "WARNING",
        },
        "loggers": {
            # Your application code  (logger.getLogger("apps"))
            "apps": {
                "handlers":  ["console"],
                "level":     app_level,
                "propagate": False,
            },
            # HTTP request/response log  (RequestLoggerMiddleware)
            "request": {
                "handlers":  ["console"],
                "level":     "INFO",
                "propagate": False,
            },
            # Django internals
            "django": {
                "handlers":  ["console"],
                "level":     "INFO",
                "propagate": False,
            },
            # Celery
            "celery": {
                "handlers":  ["console"],
                "level":     "INFO",
                "propagate": False,
            },
        },
    }
