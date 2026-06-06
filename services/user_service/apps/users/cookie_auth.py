from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


class CookieJWTAuthentication(JWTAuthentication):
    """Read the access token from an HttpOnly cookie first, then fall back to
    the Authorization header so existing clients keep working during rollout."""

    def authenticate(self, request):
        access_token = request.COOKIES.get("access_token")
        if access_token:
            try:
                validated = self.get_validated_token(access_token)
                return self.get_user(validated), validated
            except (InvalidToken, TokenError):
                pass
        return super().authenticate(request)
