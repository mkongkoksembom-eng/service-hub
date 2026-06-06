import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger("apps")


@shared_task
def expire_overdue_jobs():
    """
    Runs daily. Marks all open jobs whose deadline has passed as expired,
    rejects their pending applications, and notifies applicants.
    """
    from .models import JobApplication, JobPost
    import clients

    today = timezone.now().date()

    overdue = JobPost.objects.filter(
        status=JobPost.Status.OPEN,
        deadline__lt=today,
    )

    count = overdue.count()
    if not count:
        return "No overdue jobs."

    for job in overdue:
        # Notify all pending applicants before rejecting
        pending_apps = list(job.applications.filter(status=JobApplication.Status.PENDING))
        for app in pending_apps:
            clients.notify(
                recipient_id=app.provider_user_id,
                notification_type="job_expired",
                title="Job Has Expired",
                message=f"The job '{job.title}' posted by {job.client_username} has expired without selecting a provider.",
            )

        # Reject pending applications
        job.applications.filter(status=JobApplication.Status.PENDING).update(
            status=JobApplication.Status.REJECTED
        )

        # Notify the client too
        clients.notify(
            recipient_id=job.client_id,
            notification_type="job_expired",
            title="Your Job Has Expired",
            message=f"Your job post '{job.title}' has expired. You can post it again if you still need help.",
        )

    # Mark all overdue jobs as expired in one query
    overdue.update(status=JobPost.Status.EXPIRED)

    logger.info("expire_overdue_jobs: expired %d job(s).", count)
    return f"Expired {count} job(s)."


@shared_task
def notify_matching_providers(job_id: int):
    """
    Fired after a new job is created. Finds providers whose services match
    the job's category/skills and sends each an in-app notification.
    """
    from .models import JobPost
    import clients

    try:
        job = JobPost.objects.get(pk=job_id, status=JobPost.Status.OPEN)
    except JobPost.DoesNotExist:
        return

    from django.conf import settings
    limit = getattr(settings, "JOB_NOTIFICATION_PROVIDER_LIMIT", 100)

    providers = clients.get_matching_providers(
        category=job.category_name,
        skills=job.skills_required,
        limit=limit if limit > 0 else None,
    )

    if not providers:
        logger.info("notify_matching_providers: no matching providers for job %d.", job_id)
        return

    location_hint = f" in {job.city}" if job.city else ""
    budget_hint = ""
    if job.budget_min or job.budget_max:
        lo = f"{job.budget_min:,.0f}" if job.budget_min else ""
        hi = f"{job.budget_max:,.0f}" if job.budget_max else ""
        if lo and hi:
            budget_hint = f" Budget: {lo}–{hi} FCFA."
        elif hi:
            budget_hint = f" Budget: up to {hi} FCFA."

    for provider in providers:
        clients.notify(
            recipient_id=provider["user_id"],
            notification_type="new_job_posted",
            title=f"New Job{location_hint}: {job.title}",
            message=(
                f"{job.client_username} is looking for help with '{job.title}'{location_hint}."
                f"{budget_hint} Urgency: {job.get_urgency_display()}. Apply now!"
            ),
        )

    logger.info("notify_matching_providers: notified %d provider(s) for job %d.", len(providers), job_id)
    return f"Notified {len(providers)} provider(s)."
