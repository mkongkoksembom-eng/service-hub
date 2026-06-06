from django.urls import path
from .views import (
    JobAcceptApplicationView,
    JobApplicationsView,
    JobApplyView,
    JobPostCreateView,
    JobPostDetailView,
    JobPostListView,
    MyJobCancelView,
    MyJobListView,
    MyJobUpdateView,
    ProviderAppliedJobsView,
    WithdrawApplicationView,
)

urlpatterns = [
    # Public job listing + create
    path("", JobPostListView.as_view(), name="job-list"),
    path("post/", JobPostCreateView.as_view(), name="job-create"),
    path("<int:pk>/", JobPostDetailView.as_view(), name="job-detail"),

    # Client manages their jobs
    path("my/", MyJobListView.as_view(), name="my-jobs"),
    path("my/<int:pk>/edit/", MyJobUpdateView.as_view(), name="job-edit"),
    path("my/<int:pk>/cancel/", MyJobCancelView.as_view(), name="job-cancel"),
    path("my/<int:pk>/applications/", JobApplicationsView.as_view(), name="job-applications"),
    path("my/<int:pk>/applications/<int:app_pk>/accept/", JobAcceptApplicationView.as_view(), name="job-accept"),

    # Provider actions
    path("<int:pk>/apply/", JobApplyView.as_view(), name="job-apply"),
    path("applied/", ProviderAppliedJobsView.as_view(), name="applied-jobs"),
    path("<int:pk>/applications/<int:app_pk>/withdraw/", WithdrawApplicationView.as_view(), name="withdraw-application"),
]
