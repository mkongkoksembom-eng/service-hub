import logging

from django.core.cache import cache
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from shared.cache_utils import CacheListMixin, CacheRetrieveMixin, UserCacheListMixin, bust_user_list
from shared.permissions import IsClient, IsProvider

_MY_JOBS_PATH = "/api/jobs/my/"

from .models import JobApplication, JobPost
from .serializers import (
    JobApplicationSerializer,
    JobPostCreateSerializer,
    JobPostDetailSerializer,
    JobPostListSerializer,
    JobPostUpdateSerializer,
    MyJobPostSerializer,
)

logger = logging.getLogger("apps")


class JobPostListView(CacheListMixin, generics.ListAPIView):
    """Public listing of open jobs — providers browse here."""
    serializer_class = JobPostListSerializer
    permission_classes = (AllowAny,)
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["category_name", "city", "urgency", "budget_type"]
    search_fields = ["title", "description", "skills_required", "category_name", "city"]
    ordering_fields = ["created_at", "deadline", "budget_max"]
    ordering = ["-created_at"]
    cache_timeout = 90

    def get_queryset(self):
        from django.utils import timezone
        qs = JobPost.objects.filter(status=JobPost.Status.OPEN)
        qs = qs.exclude(expires_at__lt=timezone.now())
        return qs


class JobPostCreateView(generics.CreateAPIView):
    """Client posts a new job."""
    serializer_class = JobPostCreateSerializer
    permission_classes = (IsClient,)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        job = serializer.save()
        cache.clear()  # public job list may now include this job
        bust_user_list(request.user.id, _MY_JOBS_PATH)
        from apps.jobs.tasks import notify_matching_providers
        notify_matching_providers.delay(job.pk)
        return Response(JobPostDetailSerializer(job).data, status=status.HTTP_201_CREATED)


class JobPostDetailView(CacheRetrieveMixin, generics.RetrieveAPIView):
    """Public detail of a single open job — returns 404 for taken/expired/cancelled jobs."""
    serializer_class = JobPostDetailSerializer
    permission_classes = (AllowAny,)
    queryset = JobPost.objects.filter(status=JobPost.Status.OPEN)
    cache_timeout = 90


class MyJobListView(UserCacheListMixin, generics.ListAPIView):
    """Client sees all their own job posts (any status), including applications."""
    serializer_class = MyJobPostSerializer
    permission_classes = (IsClient,)
    cache_timeout = 60

    def get_queryset(self):
        return JobPost.objects.filter(client_id=self.request.user.id).prefetch_related("applications")


class MyJobUpdateView(generics.UpdateAPIView):
    """Client edits their own open job."""
    serializer_class = JobPostUpdateSerializer
    permission_classes = (IsClient,)

    def get_queryset(self):
        return JobPost.objects.filter(client_id=self.request.user.id, status=JobPost.Status.OPEN)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        job = serializer.save()
        cache.clear()
        bust_user_list(request.user.id, _MY_JOBS_PATH)
        return Response(JobPostDetailSerializer(job).data)


class MyJobCancelView(APIView):
    """Client cancels their own job."""
    permission_classes = (IsClient,)

    def post(self, request, pk):
        try:
            job = JobPost.objects.get(pk=pk, client_id=request.user.id)
        except JobPost.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if job.status != JobPost.Status.OPEN:
            return Response({"detail": f"Cannot cancel a job with status '{job.status}'."},
                            status=status.HTTP_400_BAD_REQUEST)

        job.status = JobPost.Status.CANCELLED
        job.save(update_fields=["status", "updated_at"])
        cache.clear()
        bust_user_list(request.user.id, _MY_JOBS_PATH)

        # Notify pending applicants
        import clients
        for app in job.applications.filter(status=JobApplication.Status.PENDING):
            clients.notify(
                recipient_id=app.provider_user_id,
                notification_type="job_cancelled",
                title="Job Cancelled",
                message=f"The job '{job.title}' posted by {job.client_username} has been cancelled.",
            )
            app.status = JobApplication.Status.REJECTED
        JobApplication.objects.filter(job=job, status=JobApplication.Status.PENDING).update(
            status=JobApplication.Status.REJECTED
        )

        return Response({"detail": "Job cancelled.", "status": "cancelled"})


class JobApplyView(APIView):
    """Provider applies for a job."""
    permission_classes = (IsProvider,)

    def post(self, request, pk):
        try:
            job = JobPost.objects.get(pk=pk)
        except JobPost.DoesNotExist:
            return Response({"detail": "Job not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = JobApplicationSerializer(
            data=request.data, context={"request": request, "job": job}
        )
        serializer.is_valid(raise_exception=True)
        application = serializer.save()

        # Notify the client
        import clients
        clients.notify(
            recipient_id=job.client_id,
            notification_type="job_new_application",
            title="New Application",
            message=f"{application.provider_username} has applied for your job '{job.title}'.",
        )

        return Response(serializer.data, status=status.HTTP_201_CREATED)


class JobApplicationsView(generics.ListAPIView):
    """Client views all applications for one of their jobs."""
    serializer_class = JobApplicationSerializer
    permission_classes = (IsClient,)

    def get_queryset(self):
        try:
            job = JobPost.objects.get(pk=self.kwargs["pk"], client_id=self.request.user.id)
        except JobPost.DoesNotExist:
            return JobApplication.objects.none()
        return job.applications.all()


class JobAcceptApplicationView(APIView):
    """Client accepts one provider's application → creates booking, closes job."""
    permission_classes = (IsClient,)

    def post(self, request, pk, app_pk):
        import clients

        try:
            job = JobPost.objects.get(pk=pk, client_id=request.user.id)
        except JobPost.DoesNotExist:
            return Response({"detail": "Job not found."}, status=status.HTTP_404_NOT_FOUND)

        if job.status != JobPost.Status.OPEN:
            return Response({"detail": f"Job is already '{job.status}'."},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            application = job.applications.get(pk=app_pk, status=JobApplication.Status.PENDING)
        except JobApplication.DoesNotExist:
            return Response({"detail": "Application not found."}, status=status.HTTP_404_NOT_FOUND)

        # Build booking payload
        booking_payload = {
            "client_id": job.client_id,
            "client_username": job.client_username,
            "client_email": job.client_email,
            "provider_user_id": application.provider_user_id,
            "provider_username": application.provider_username,
            "provider_email": application.provider_email,
            "service_title": job.title,
            "total_price": str(application.proposed_price or 0),
            "scheduled_date": str(job.deadline) if job.deadline else str(__import__("datetime").date.today()),
            "address": job.address,
            "notes": job.description,
        }

        try:
            booking = clients.create_booking_from_job(booking_payload)
        except Exception as exc:
            logger.error("Failed to create booking from job %s: %s", job.pk, exc)
            return Response({"detail": "Could not create booking. Please try again."},
                            status=status.HTTP_502_BAD_GATEWAY)

        # Mark application as accepted
        application.status = JobApplication.Status.ACCEPTED
        application.save(update_fields=["status"])

        # Reject all other pending applications
        rejected_ids = list(
            job.applications.filter(status=JobApplication.Status.PENDING)
            .exclude(pk=app_pk)
            .values_list("provider_user_id", flat=True)
        )
        job.applications.filter(status=JobApplication.Status.PENDING).exclude(pk=app_pk).update(
            status=JobApplication.Status.REJECTED
        )

        # Mark job as taken
        job.status = JobPost.Status.TAKEN
        job.booking_id = booking["id"]
        job.save(update_fields=["status", "booking_id", "updated_at"])
        cache.clear()
        bust_user_list(job.client_id, _MY_JOBS_PATH)

        # Notify accepted provider
        clients.notify(
            recipient_id=application.provider_user_id,
            notification_type="job_accepted",
            title="Your Application Was Accepted!",
            message=f"You were selected for the job '{job.title}'. A booking has been created.",
            booking_id=booking["id"],
        )

        # Notify rejected providers
        for rid in rejected_ids:
            clients.notify(
                recipient_id=rid,
                notification_type="job_rejected",
                title="Application Not Selected",
                message=f"Another provider was selected for '{job.title}'. Keep applying!",
            )

        return Response({
            "detail": "Application accepted. Booking created.",
            "booking_id": booking["id"],
            "application": JobApplicationSerializer(application).data,
        })


class ProviderAppliedJobsView(generics.ListAPIView):
    """Provider sees all jobs they have applied to."""
    serializer_class = JobPostDetailSerializer
    permission_classes = (IsProvider,)

    def get_queryset(self):
        applied_job_ids = JobApplication.objects.filter(
            provider_user_id=self.request.user.id
        ).values_list("job_id", flat=True)
        return JobPost.objects.filter(pk__in=applied_job_ids)


class WithdrawApplicationView(APIView):
    """Provider withdraws their pending application."""
    permission_classes = (IsProvider,)

    def post(self, request, pk, app_pk):
        try:
            application = JobApplication.objects.get(
                pk=app_pk,
                provider_user_id=request.user.id,
                job_id=pk,
                status=JobApplication.Status.PENDING,
            )
        except JobApplication.DoesNotExist:
            return Response({"detail": "Application not found."}, status=status.HTTP_404_NOT_FOUND)

        application.status = JobApplication.Status.WITHDRAWN
        application.save(update_fields=["status"])
        return Response({"detail": "Application withdrawn."})
