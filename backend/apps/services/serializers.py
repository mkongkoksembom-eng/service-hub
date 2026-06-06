from rest_framework import serializers

from apps.users.serializers import Base64ImageField, PublicUserSerializer, UserProfileSerializer

from .models import Category, ProviderProfile, Service


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "description", "icon", "parent")


class CategoryGroupedSerializer(serializers.ModelSerializer):
    """Parent category with its children nested."""
    subcategories = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ("id", "name", "subcategories")

    def get_subcategories(self, obj):
        return CategorySerializer(
            obj.subcategories.all().order_by("name"), many=True
        ).data


class ProviderProfileSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)

    class Meta:
        model = ProviderProfile
        fields = (
            "id", "user", "bio", "location", "years_of_experience",
            "is_verified", "average_rating", "total_reviews", "created_at",
        )
        read_only_fields = ("id", "is_verified", "average_rating", "total_reviews", "created_at")


class PublicProviderProfileSerializer(serializers.ModelSerializer):
    """Same as ProviderProfileSerializer but hides user email and phone."""
    user = PublicUserSerializer(read_only=True)

    class Meta:
        model = ProviderProfile
        fields = (
            "id", "user", "bio", "location", "years_of_experience",
            "is_verified", "average_rating", "total_reviews", "created_at",
        )
        read_only_fields = ("id", "is_verified", "average_rating", "total_reviews", "created_at")


class ServiceSerializer(serializers.ModelSerializer):
    provider = ProviderProfileSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source="category", write_only=True
    )
    image = Base64ImageField(required=False, max_dimension=1000)

    class Meta:
        model = Service
        fields = (
            "id", "provider", "category", "category_id",
            "title", "description", "price", "price_type",
            "location", "image", "is_active",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "provider", "created_at", "updated_at")

    def create(self, validated_data):
        request = self.context["request"]
        provider_profile = request.user.provider_profile
        return Service.objects.create(provider=provider_profile, **validated_data)


class ServiceListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    provider_name = serializers.CharField(source="provider.user.username", read_only=True)
    provider_user_id = serializers.IntegerField(source="provider.user.id", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    average_rating = serializers.DecimalField(
        source="provider.average_rating", max_digits=3, decimal_places=2, read_only=True
    )

    class Meta:
        model = Service
        fields = (
            "id", "title", "price", "price_type", "location",
            "image", "is_active",
            "provider_name", "provider_user_id", "category_name", "average_rating", "created_at",
        )
