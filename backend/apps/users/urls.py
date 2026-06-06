from django.urls import path

from .views import (
    AdminDashboardView,
    ChangePasswordView,
    CookieTokenObtainPairView,
    CookieTokenRefreshView,
    LogoutView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    ProfileView,
    PublicStatsView,
    RegisterView,
    SendOTPView,
    UserListView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("send-otp/", SendOTPView.as_view(), name="send-otp"),
    path("login/", CookieTokenObtainPairView.as_view(), name="auth-login"),
    path("token/refresh/", CookieTokenRefreshView.as_view(), name="token-refresh"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("profile/", ProfileView.as_view(), name="user-profile"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("stats/", PublicStatsView.as_view(), name="public-stats"),
    path("admin/dashboard/", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("", UserListView.as_view(), name="user-list"),
]
