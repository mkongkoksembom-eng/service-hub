from rest_framework.permissions import BasePermission
from .models import User


class IsClient(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.Role.CLIENT


class IsProvider(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.Role.PROVIDER


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.role == User.Role.ADMIN or request.user.is_staff
        )
