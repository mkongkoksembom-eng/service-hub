from rest_framework.response import Response
from rest_framework.views import APIView
from shared.internal_auth import InternalKeyPermission
from .models import User
from .serializers import UserProfileSerializer


class InternalUserDetailView(APIView):
    """Return user data for other services. Protected by internal API key."""
    permission_classes = (InternalKeyPermission,)
    authentication_classes = []

    def get(self, request, user_id):
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        return Response({
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
            "avatar": user.avatar,
            "phone": user.phone,
        })


class InternalStatsView(APIView):
    permission_classes = (InternalKeyPermission,)
    authentication_classes = []

    def get(self, request):
        from django.db.models import Avg
        return Response({
            "total_users": User.objects.count(),
            "total_clients": User.objects.filter(role=User.Role.CLIENT).count(),
            "total_providers": User.objects.filter(role=User.Role.PROVIDER).count(),
        })
