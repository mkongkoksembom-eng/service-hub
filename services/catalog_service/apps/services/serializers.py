import base64
from io import BytesIO

from PIL import Image as PILImage
from rest_framework import serializers

from .models import Category, ProviderProfile, Service


class Base64ImageField(serializers.Field):
    MIME = {
        "jpg": "image/jpeg", "jpeg": "image/jpeg",
        "png": "image/png", "webp": "image/webp", "gif": "image/gif",
    }
    MAX_UPLOAD_BYTES = 5 * 1024 * 1024
    MAX_DIMENSION = 1000

    def to_representation(self, value):
        return value or None

    def to_internal_value(self, data):
        if data is None or data == "":
            return ""
        if not hasattr(data, "read"):
            raise serializers.ValidationError("Upload a valid image file.")
        if data.size > self.MAX_UPLOAD_BYTES:
            raise serializers.ValidationError("Image must be under 5 MB.")
        ext = data.name.rsplit(".", 1)[-1].lower() if "." in data.name else ""
        if ext not in self.MIME:
            raise serializers.ValidationError(f"Unsupported format. Allowed: {', '.join(self.MIME)}.")
        raw = data.read()
        try:
            img = PILImage.open(BytesIO(raw))
            img.verify()
            img = PILImage.open(BytesIO(raw))
        except Exception:
            raise serializers.ValidationError("Invalid or corrupted image.")
        img.thumbnail((self.MAX_DIMENSION, self.MAX_DIMENSION), PILImage.Resampling.LANCZOS)
        buf = BytesIO()
        if img.mode in ("RGBA", "P"):
            img.save(buf, format="PNG", optimize=True)
            mime = "image/png"
        else:
            img = img.convert("RGB")
            img.save(buf, format="JPEG", quality=85, optimize=True)
            mime = "image/jpeg"
        b64 = base64.b64encode(buf.getvalue()).decode()
        return f"data:{mime};base64,{b64}"


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "description", "icon", "parent")


class CategoryGroupedSerializer(serializers.ModelSerializer):
    subcategories = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ("id", "name", "subcategories")

    def get_subcategories(self, obj):
        return CategorySerializer(obj.subcategories.all().order_by("name"), many=True).data


class ProviderProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProviderProfile
        fields = (
            "id", "user_id", "username", "email", "bio", "location",
            "years_of_experience", "is_verified", "average_rating",
            "total_reviews", "created_at",
        )
        read_only_fields = ("id", "user_id", "username", "email", "is_verified", "average_rating", "total_reviews", "created_at")


class PublicProviderProfileSerializer(serializers.ModelSerializer):
    """Strips email — used on public provider profiles without a confirmed booking."""

    class Meta:
        model = ProviderProfile
        fields = (
            "id", "user_id", "username", "bio", "location",
            "years_of_experience", "is_verified", "average_rating",
            "total_reviews", "created_at",
        )
        read_only_fields = fields


class ServiceSerializer(serializers.ModelSerializer):
    provider = ProviderProfileSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source="category", write_only=True
    )
    image = Base64ImageField(required=False)

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
        provider_profile = ProviderProfile.objects.get(user_id=request.user.id)
        return Service.objects.create(provider=provider_profile, **validated_data)


class ServiceListSerializer(serializers.ModelSerializer):
    provider_name = serializers.CharField(source="provider.username", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    average_rating = serializers.DecimalField(
        source="provider.average_rating", max_digits=3, decimal_places=2, read_only=True
    )

    class Meta:
        model = Service
        fields = (
            "id", "title", "price", "price_type", "location",
            "image", "is_active",
            "provider_name", "category_name", "average_rating", "created_at",
        )
