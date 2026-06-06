from django.contrib import admin
from django.http import JsonResponse
from django.db import connection
from django.urls import include, path


def health_check(request):
    try:
        connection.ensure_connection()
        db_ok = True
    except Exception:
        db_ok = False
    return JsonResponse({"status": "ok" if db_ok else "degraded", "db": db_ok}, status=200 if db_ok else 503)


admin.site.site_header = "Service Hub — Users"

urlpatterns = [
    path("api/health/", health_check),
    path("admin/", admin.site.urls),
    path("api/users/", include("apps.users.urls")),
]
