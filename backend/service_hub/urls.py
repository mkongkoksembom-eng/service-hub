from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from django.http import JsonResponse
from django.db import connection


def health_check(request):
    try:
        connection.ensure_connection()
        db_ok = True
    except Exception:
        db_ok = False
    status = 200 if db_ok else 503
    return JsonResponse({"status": "ok" if db_ok else "degraded", "db": db_ok}, status=status)


admin.site.site_header = "Service Hub Admin"
admin.site.site_title = "Service Hub"
admin.site.index_title = "Platform Management"

urlpatterns = [
    path("api/health/", health_check),
    path("admin/", admin.site.urls),
    path("api/users/", include("apps.users.urls")),
    path("api/services/", include("apps.services.urls")),
    path("api/bookings/", include("apps.bookings.urls")),
    path("api/reviews/", include("apps.reviews.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/chat/", include("apps.chat.urls")),
    path("api/location/", include("apps.location.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
