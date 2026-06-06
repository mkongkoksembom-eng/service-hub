from rest_framework.permissions import BasePermission


class IsClient(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user is not None
            and request.user.is_authenticated
            and request.user.role == "client"
        )


class IsProvider(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user is not None
            and request.user.is_authenticated
            and request.user.role == "provider"
        )


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user is not None
            and request.user.is_authenticated
            and (
                request.user.role == "admin"
                or getattr(request.user, "is_staff", False)
            )
        )


class IsClientOrProvider(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user is not None
            and request.user.is_authenticated
            and request.user.role in ("client", "provider")
        )
