from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

admin.site.site_header = "Service Hub Admin"
admin.site.site_title = "Service Hub"
admin.site.index_title = "Platform Management"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/users/", include("apps.users.urls")),
    path("api/services/", include("apps.services.urls")),
    path("api/bookings/", include("apps.bookings.urls")),
    path("api/reviews/", include("apps.reviews.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/payments/", include("apps.payments.urls")),
    path("api/chat/", include("apps.chat.urls")),
    path("api/location/", include("apps.location.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
