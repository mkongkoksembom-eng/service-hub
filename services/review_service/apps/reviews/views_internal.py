from rest_framework.response import Response
from rest_framework.views import APIView

from shared.internal_auth import InternalKeyPermission

from .models import Review


class InternalStatsView(APIView):
    permission_classes = (InternalKeyPermission,)
    authentication_classes = []

    def get(self, request):
        from django.db.models import Avg
        result = Review.objects.aggregate(avg=Avg("rating"))
        return Response({
            "total_reviews": Review.objects.count(),
            "average_rating": round(result["avg"] or 0, 2),
        })
