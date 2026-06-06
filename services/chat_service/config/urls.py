from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/chat/", include("apps.chat.urls")),
    # Serve uploaded media files (images, audio, video, files sent in chat).
    # In Docker the nginx container serves /media/ directly from the volume;
    # in Kubernetes nginx routes /media/ to this service, so Django must serve them.
    re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
]
