from rest_framework.throttling import AnonRateThrottle


class LoginThrottle(AnonRateThrottle):
    scope = "auth_login"


class RegisterThrottle(AnonRateThrottle):
    scope = "auth_register"


class OTPThrottle(AnonRateThrottle):
    scope = "auth_otp"


class PasswordResetThrottle(AnonRateThrottle):
    scope = "auth_reset"
