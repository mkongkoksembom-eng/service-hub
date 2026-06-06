from django.urls import path
from .views import (
    CategoryGroupedListView,
    CategoryListView,
    MyServicesView,
    ProviderProfileDetailView,
    ProviderProfileView,
    ServiceCreateView,
    ServiceDetailView,
    ServiceListView,
    ServiceUpdateDeleteView,
)
from .views_internal import (
    InternalBookingCountView,
    InternalMatchingProvidersView,
    InternalProviderByUserView,
    InternalServiceDetailView,
    InternalStatsView,
    InternalUpdateRatingView,
)

urlpatterns = [
    path("", ServiceListView.as_view(), name="service-list"),
    path("create/", ServiceCreateView.as_view(), name="service-create"),
    path("<int:pk>/", ServiceDetailView.as_view(), name="service-detail"),
    path("<int:pk>/manage/", ServiceUpdateDeleteView.as_view(), name="service-manage"),
    path("my/", MyServicesView.as_view(), name="my-services"),
    path("categories/", CategoryListView.as_view(), name="category-list"),
    path("categories/grouped/", CategoryGroupedListView.as_view(), name="category-grouped"),
    path("provider/profile/", ProviderProfileView.as_view(), name="provider-profile"),
    path("provider/<int:pk>/", ProviderProfileDetailView.as_view(), name="provider-detail"),
    # Internal
    path("internal/services/<int:service_id>/", InternalServiceDetailView.as_view()),
    path("internal/provider-profile/by-user/<int:user_id>/", InternalProviderByUserView.as_view()),
    path("internal/provider-profile/<int:provider_id>/rating/", InternalUpdateRatingView.as_view()),
path("internal/stats/", InternalStatsView.as_view()),
    path("internal/providers/matching/", InternalMatchingProvidersView.as_view()),
]
