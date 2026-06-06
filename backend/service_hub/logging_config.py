import json
import logging


class JSONFormatter(logging.Formatter):
    """
    Emit one JSON object per log line.
    Compatible with Datadog, Loki, ELK, and Cloud Logging collectors.
    """

    def format(self, record: logging.LogRecord) -> str:
        payload: dict = {
            "time":    self.formatTime(record, self.datefmt),
            "level":   record.levelname,
            "logger":  record.name,
            "message": record.getMessage(),
        }

        for key in ("http_method", "http_path", "http_status", "duration_ms", "user_id"):
            if hasattr(record, key):
                payload[key] = getattr(record, key)

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(payload, default=str)


def get_logging_config(debug: bool = False) -> dict:
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
                "()": "service_hub.logging_config.JSONFormatter",
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
            "apps": {
                "handlers":  ["console"],
                "level":     app_level,
                "propagate": False,
            },
            "request": {
                "handlers":  ["console"],
                "level":     "INFO",
                "propagate": False,
            },
            "django": {
                "handlers":  ["console"],
                "level":     "INFO",
                "propagate": False,
            },
            "celery": {
                "handlers":  ["console"],
                "level":     "INFO",
                "propagate": False,
            },
        },
    }
