import base64
from io import BytesIO

from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from PIL import Image as PILImage
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User


class Base64ImageField(serializers.Field):
    """
    Accepts a file upload, resizes it, compresses it, and stores
    the result as a base64 data-URL string inside the database.
    No filesystem or external storage required.
    """
    MIME = {
        "jpg": "image/jpeg", "jpeg": "image/jpeg",
        "png": "image/png",  "webp": "image/webp",
        "gif": "image/gif",
    }
    MAX_UPLOAD_BYTES = 5 * 1024 * 1024   # 5 MB hard limit
    MAX_DIMENSION    = 800                # longest edge after resize

    def __init__(self, *args, max_dimension=800, **kwargs):
        self.MAX_DIMENSION = max_dimension
        super().__init__(*args, **kwargs)

    # ── output ────────────────────────────────────
    def to_representation(self, value):
        return value or None

    # ── input ─────────────────────────────────────
    def to_internal_value(self, data):
        # Clearing the field (null / empty string from JSON PATCH)
        if data is None or data == "":
            return ""

        if not hasattr(data, "read"):
            raise serializers.ValidationError("Upload a valid image file.")

        if data.size > self.MAX_UPLOAD_BYTES:
            raise serializers.ValidationError("Image must be under 5 MB.")

        ext = data.name.rsplit(".", 1)[-1].lower() if "." in data.name else ""
        if ext not in self.MIME:
            raise serializers.ValidationError(
                f"Unsupported format. Allowed: {', '.join(self.MIME)}."
            )

        raw = data.read()

        try:
            img = PILImage.open(BytesIO(raw))
            img.verify()                          # basic corruption check
            img = PILImage.open(BytesIO(raw))     # re-open after verify
        except Exception:
            raise serializers.ValidationError("Invalid or corrupted image.")

        # Resize so the longest edge ≤ MAX_DIMENSION
        img.thumbnail((self.MAX_DIMENSION, self.MAX_DIMENSION), PILImage.Resampling.LANCZOS)

        # Encode
        buf = BytesIO()
        if ext == "gif":
            img.save(buf, format="GIF")
            mime = "image/gif"
        elif img.mode in ("RGBA", "P"):
            img.save(buf, format="PNG", optimize=True)
            mime = "image/png"
        else:
            img = img.convert("RGB")
            img.save(buf, format="JPEG", quality=85, optimize=True)
            mime = "image/jpeg"

        b64 = base64.b64encode(buf.getvalue()).decode()
        return f"data:{mime};base64,{b64}"


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("email", "username", "password", "password2", "role", "phone")

    def validate(self, data):
        if data["password"] != data["password2"]:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return data

    def create(self, validated_data):
        validated_data.pop("password2")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserProfileSerializer(self.user).data
        return data


class UserProfileSerializer(serializers.ModelSerializer):
    avatar = Base64ImageField(required=False, allow_null=True, max_dimension=400)

    class Meta:
        model = User
        fields = ("id", "email", "username", "first_name", "last_name", "role", "phone", "avatar")
        read_only_fields = ("id", "email", "role")


class PublicUserSerializer(serializers.ModelSerializer):
    """Strips contact details — used on public provider profiles without a confirmed booking."""
    avatar = Base64ImageField(required=False, allow_null=True, max_dimension=400)

    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name", "role", "avatar")

    def update(self, instance, validated_data):
        # DRF passes None through for allow_null fields without calling
        # to_internal_value; convert it to "" so the TextField stays consistent.
        if validated_data.get("avatar") is None and "avatar" in validated_data:
            validated_data["avatar"] = ""
        return super().update(instance, validated_data)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate_old_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value

    def save(self):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save()


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        try:
            self.user = User.objects.get(email=value)
        except User.DoesNotExist:
            # Don't reveal whether email exists
            self.user = None
        return value

    def save(self):
        return self.user


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(validators=[validate_password])

    def validate(self, data):
        try:
            uid = force_str(urlsafe_base64_decode(data["uid"]))
            self.user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError):
            raise serializers.ValidationError({"uid": "Invalid reset link."})

        if not default_token_generator.check_token(self.user, data["token"]):
            raise serializers.ValidationError({"token": "Reset link is invalid or has expired."})

        return data

    def save(self):
        self.user.set_password(self.validated_data["new_password"])
        self.user.save()
