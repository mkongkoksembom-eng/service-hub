from rest_framework import serializers
from .models import JobApplication, JobPost


class JobPostCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobPost
        fields = (
            "title", "description", "category_name", "skills_required", "duration_estimate",
            "city", "address", "latitude", "longitude",
            "budget_min", "budget_max", "budget_type",
            "deadline", "urgency", "expires_at",
        )

    def validate(self, data):
        bmin = data.get("budget_min")
        bmax = data.get("budget_max")
        if bmin is not None and bmax is not None and bmin > bmax:
            raise serializers.ValidationError("budget_min cannot be greater than budget_max.")
        return data

    def create(self, validated_data):
        request = self.context["request"]
        return JobPost.objects.create(
            client_id=request.user.id,
            client_username=request.user.username,
            client_email=request.user.email,
            **validated_data,
        )


class JobPostUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobPost
        fields = (
            "title", "description", "category_name", "skills_required", "duration_estimate",
            "city", "address", "latitude", "longitude",
            "budget_min", "budget_max", "budget_type",
            "deadline", "urgency", "expires_at",
        )


class JobApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobApplication
        fields = (
            "id", "provider_user_id", "provider_username",
            "cover_message", "proposed_price", "availability_note",
            "status", "created_at",
        )
        read_only_fields = ("id", "provider_user_id", "provider_username", "status", "created_at")

    def validate(self, data):
        job = self.context["job"]
        if job.status != JobPost.Status.OPEN:
            raise serializers.ValidationError("This job is no longer accepting applications.")
        provider_id = self.context["request"].user.id
        if JobApplication.objects.filter(job=job, provider_user_id=provider_id).exists():
            raise serializers.ValidationError("You have already applied for this job.")
        return data

    def create(self, validated_data):
        request = self.context["request"]
        return JobApplication.objects.create(
            job=self.context["job"],
            provider_user_id=request.user.id,
            provider_username=request.user.username,
            provider_email=request.user.email,
            **validated_data,
        )


class JobPostListSerializer(serializers.ModelSerializer):
    """Compact representation for public job listings."""
    application_count = serializers.SerializerMethodField()

    class Meta:
        model = JobPost
        fields = (
            "id", "title", "category_name", "city",
            "budget_min", "budget_max", "budget_type",
            "urgency", "deadline", "duration_estimate",
            "application_count", "created_at",
        )

    def get_application_count(self, obj):
        return obj.applications.filter(status="pending").count()


class JobPostDetailSerializer(serializers.ModelSerializer):
    """Full detail — shown to providers browsing, and to the job's owner."""
    application_count = serializers.SerializerMethodField()

    class Meta:
        model = JobPost
        fields = (
            "id", "title", "description",
            "category_name", "skills_required", "duration_estimate",
            "city", "address", "latitude", "longitude",
            "budget_min", "budget_max", "budget_type",
            "deadline", "urgency",
            "client_id", "client_username",
            "status", "booking_id",
            "application_count", "created_at", "updated_at", "expires_at",
        )

    def get_application_count(self, obj):
        return obj.applications.filter(status="pending").count()


class AppliedJobSerializer(JobPostDetailSerializer):
    """Job detail enriched with the requesting provider's own application."""
    my_application = serializers.SerializerMethodField()

    class Meta(JobPostDetailSerializer.Meta):
        fields = JobPostDetailSerializer.Meta.fields + ("my_application",)

    def get_my_application(self, obj):
        request = self.context["request"]
        application = obj.applications.filter(provider_user_id=request.user.id).first()
        return JobApplicationSerializer(application).data if application else None


class MyJobPostSerializer(serializers.ModelSerializer):
    """Owner view — includes full application list."""
    applications = JobApplicationSerializer(many=True, read_only=True)

    class Meta:
        model = JobPost
        fields = (
            "id", "title", "description",
            "category_name", "skills_required", "duration_estimate",
            "city", "address",
            "budget_min", "budget_max", "budget_type",
            "deadline", "urgency",
            "status", "booking_id",
            "applications", "created_at", "updated_at",
        )
