from django.db.models import Avg, Count, Q
from rest_framework.response import Response
from rest_framework.views import APIView

from shared.internal_auth import InternalKeyPermission

from .models import Category, ProviderProfile, Service


class InternalServiceDetailView(APIView):
    permission_classes = (InternalKeyPermission,)
    authentication_classes = []

    def get(self, request, service_id):
        try:
            svc = Service.objects.select_related("provider", "category").get(pk=service_id)
        except Service.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        return Response({
            "id": svc.id,
            "title": svc.title,
            "price": str(svc.price),
            "price_type": svc.price_type,
            "is_active": svc.is_active,
            "provider_id": svc.provider.id,
            "provider_user_id": svc.provider.user_id,
            "provider_username": svc.provider.username,
            "provider_email": svc.provider.email,
            "category_name": svc.category.name if svc.category else "",
        })


class InternalProviderByUserView(APIView):
    permission_classes = (InternalKeyPermission,)
    authentication_classes = []

    def get(self, request, user_id):
        try:
            profile = ProviderProfile.objects.get(user_id=user_id)
        except ProviderProfile.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        return Response({
            "id": profile.id,
            "user_id": profile.user_id,
            "username": profile.username,
            "email": profile.email,
        })


class InternalUpdateRatingView(APIView):
    """Called by review_service after a review is created or deleted."""
    permission_classes = (InternalKeyPermission,)
    authentication_classes = []

    def patch(self, request, provider_id):
        try:
            profile = ProviderProfile.objects.get(pk=provider_id)
        except ProviderProfile.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        avg = request.data.get("average_rating", 0)
        count = request.data.get("total_reviews", 0)
        profile.average_rating = avg
        profile.total_reviews = count
        profile.save(update_fields=["average_rating", "total_reviews"])
        return Response({"detail": "Rating updated."})



class InternalBookingCountView(APIView):
    """Called by catalog_service ProviderProfileDetailView to check booking existence."""
    permission_classes = (InternalKeyPermission,)
    authentication_classes = []

    def get(self, request):
        # This view is in catalog_service but actually it queries booking_service
        # So we just respond 0 — booking_service has its own InternalBookingCountView
        return Response({"count": 0})


class InternalStatsView(APIView):
    permission_classes = (InternalKeyPermission,)
    authentication_classes = []

    def get(self, request):
        from django.db.models import Count, Q
        avg_result = ProviderProfile.objects.aggregate(avg=Avg("average_rating"))

        popular_jobs = list(
            Category.objects
            .filter(parent__isnull=False)
            .annotate(svc_count=Count("services", filter=Q(services__is_active=True)))
            .filter(svc_count__gt=0)
            .order_by("-svc_count")
            .values_list("name", flat=True)[:6]
        )

        return Response({
            "total_active_services": Service.objects.filter(is_active=True).count(),
            "total_categories": Category.objects.filter(parent=None).count(),
            "popular_jobs": popular_jobs,
        })


class InternalMatchingProvidersView(APIView):
    """
    Called by job_service when a new job is posted.
    Returns provider user_ids whose active services match the job's category or skills.
    Query params: category (str), skills (str), limit (int, default 100)
    """
    permission_classes = (InternalKeyPermission,)
    authentication_classes = []

    def get(self, request):
        category = request.query_params.get("category", "").strip()
        skills = request.query_params.get("skills", "").strip()
        limit = int(request.query_params.get("limit", 100))

        if not category and not skills:
            return Response({"providers": []})

        # Build a filter on services that are active and match category/skills
        service_filter = Q(services__is_active=True)
        if category:
            service_filter &= (
                Q(services__category__name__icontains=category) |
                Q(services__title__icontains=category)
            )
        if skills:
            # Match any word in skills_required against service title/description or provider bio
            keywords = [w.strip() for w in skills.replace(",", " ").split() if len(w.strip()) > 2]
            if keywords:
                skill_q = Q()
                for kw in keywords[:10]:  # cap at 10 keywords to keep query sane
                    skill_q |= Q(services__title__icontains=kw)
                    skill_q |= Q(services__description__icontains=kw)
                    skill_q |= Q(bio__icontains=kw)
                service_filter &= skill_q

        providers = (
            ProviderProfile.objects.filter(service_filter)
            .distinct()
            .values("user_id", "username", "email")[:limit]
        )

        return Response({"providers": list(providers)})
