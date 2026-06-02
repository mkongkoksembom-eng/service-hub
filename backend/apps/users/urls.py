from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AdminDashboardView,
    ChangePasswordView,
    CustomTokenObtainPairView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    ProfileView,
    PublicStatsView,
    RegisterView,
    UserListView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", CustomTokenObtainPairView.as_view(), name="auth-login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("profile/", ProfileView.as_view(), name="user-profile"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("stats/", PublicStatsView.as_view(), name="public-stats"),
    path("admin/dashboard/", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("", UserListView.as_view(), name="user-list"),
]
