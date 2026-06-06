from dataclasses import dataclass
from rest_framework.authentication import BaseAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import UntypedToken


@dataclass
class TokenUser:
    id: int
    email: str = ""
    role: str = "client"
    username: str = ""
    is_authenticated: bool = True
    is_staff: bool = False
    is_active: bool = True

    @property
    def pk(self):
        return self.id

    @property
    def is_anonymous(self):
        return False


class CookieJWTAuthentication(BaseAuthentication):
    """JWT-only auth for services without a User DB.

    Reads the access token from an HttpOnly cookie (or Authorization header
    fallback) and returns a lightweight TokenUser populated from JWT claims.
    No database access required.
    """

    def authenticate(self, request):
        token = request.COOKIES.get("access_token")
        if not token:
            header = request.META.get("HTTP_AUTHORIZATION", "")
            if header.startswith("Bearer "):
                token = header[7:]
        if not token:
            return None
        try:
            validated = UntypedToken(token)
            payload = validated.payload
            user = TokenUser(
                id=payload["user_id"],
                email=payload.get("email", ""),
                role=payload.get("role", "client"),
                username=payload.get("username", ""),
            )
            return user, validated
        except (InvalidToken, TokenError):
            return None
