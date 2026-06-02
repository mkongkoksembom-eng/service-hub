from django.conf import settings
from django.core.mail import send_mail


def _send(subject, message, recipient_email):
    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[recipient_email],
        fail_silently=True,
    )


def _frontend(path=""):
    base = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
    return f"{base}{path}"


def _booking_block(booking):
    return f"""
  Service : {booking.service.title}
  Date    : {booking.scheduled_date}
  Address : {booking.address or 'Not specified'}
  Amount  : {booking.total_price} FCFA
""".rstrip()


def send_booking_request_email(booking):
    """Provider receives email when a client creates a booking."""
    provider = booking.service.provider.user
    client = booking.client

    _send(
        subject=f"New Booking Request - {booking.service.title}",
        message=f"""Hi {provider.username},

Great news! {client.username} has requested your service.

-------------------------------
{_booking_block(booking)}
  Client  : {client.username} ({client.email})
  Notes   : {booking.notes or 'None'}
-------------------------------

Log in to confirm or reject this booking:
{_frontend('/provider/bookings')}

— The Service Hub Team""",
        recipient_email=provider.email,
    )


def send_booking_confirmed_email(booking):
    """Client receives email when provider confirms their booking."""
    client = booking.client
    provider = booking.service.provider.user

    _send(
        subject=f"Booking Confirmed - {booking.service.title}",
        message=f"""Hi {client.username},

Your booking has been confirmed by {provider.username}.

-------------------------------
{_booking_block(booking)}
-------------------------------

You will be notified when the provider starts the service.

View your bookings:
{_frontend('/client/bookings')}

— The Service Hub Team""",
        recipient_email=client.email,
    )


def send_booking_rejected_email(booking):
    """Client receives email when provider rejects their booking."""
    client = booking.client
    provider = booking.service.provider.user

    _send(
        subject=f"Booking Not Accepted - {booking.service.title}",
        message=f"""Hi {client.username},

Unfortunately, {provider.username} was unable to accept your booking request.

-------------------------------
{_booking_block(booking)}
-------------------------------

You can browse other providers for this service:
{_frontend('/services')}

— The Service Hub Team""",
        recipient_email=client.email,
    )


def send_booking_cancelled_email(booking):
    """Both client and provider receive email when a booking is cancelled."""
    client = booking.client
    provider = booking.service.provider.user
    reason = f"\n  Reason  : {booking.cancellation_reason}" if booking.cancellation_reason else ""

    body = f"""-------------------------------
{_booking_block(booking)}{reason}
-------------------------------"""

    # Notify client
    _send(
        subject=f"Booking Cancelled - {booking.service.title}",
        message=f"""Hi {client.username},

Your booking has been cancelled.

{body}

Browse other services anytime:
{_frontend('/services')}

— The Service Hub Team""",
        recipient_email=client.email,
    )

    # Notify provider
    _send(
        subject=f"Booking Cancelled - {booking.service.title}",
        message=f"""Hi {provider.username},

A booking for your service has been cancelled.

{body}

View your bookings:
{_frontend('/provider/bookings')}

— The Service Hub Team""",
        recipient_email=provider.email,
    )


def send_booking_in_progress_email(booking):
    """Client receives email when provider starts the service."""
    client = booking.client
    provider = booking.service.provider.user

    _send(
        subject=f"Service In Progress - {booking.service.title}",
        message=f"""Hi {client.username},

{provider.username} has started working on your service.

-------------------------------
{_booking_block(booking)}
-------------------------------

You will be notified once the service is complete.

— The Service Hub Team""",
        recipient_email=client.email,
    )


def send_booking_completed_email(booking):
    """Client receives email when provider marks the service as completed."""
    client = booking.client
    provider = booking.service.provider.user

    _send(
        subject=f"Service Completed - {booking.service.title}",
        message=f"""Hi {client.username},

{provider.username} has completed your service. We hope everything went well!

-------------------------------
{_booking_block(booking)}
-------------------------------

Please take a moment to leave a review:
{_frontend('/client/bookings')}

— The Service Hub Team""",
        recipient_email=client.email,
    )


def send_welcome_email(user):
    """New user receives a welcome email after registration."""
    from apps.users.models import User as UserModel

    if user.role == UserModel.Role.PROVIDER:
        body = f"""Hi {user.username},

Welcome to Service Hub! We're excited to have you as a provider.

Here's how to get started:
  1. Complete your profile so clients can find you.
  2. Create your first service listing.
  3. Start accepting bookings!

Set up your provider profile:
{_frontend('/provider/dashboard')}

If you have any questions, just reply to this email — we're here to help.

— The Service Hub Team"""
    else:
        body = f"""Hi {user.username},

Welcome to Service Hub! We're glad you're here.

Here's how to get started:
  1. Browse available services in your area.
  2. Book a provider that fits your needs.
  3. Leave a review after your experience!

Explore services now:
{_frontend('/services')}

If you have any questions, just reply to this email — we're here to help.

— The Service Hub Team"""

    _send(
        subject="Welcome to Service Hub!",
        message=body,
        recipient_email=user.email,
    )


def send_review_received_email(review):
    """Provider receives email when a client leaves a review."""
    provider = review.service.provider.user
    client = review.client
    stars = "*" * review.rating + " " * (5 - review.rating)

    _send(
        subject=f"New {review.rating}-Star Review - {review.service.title}",
        message=f"""Hi {provider.username},

{client.username} has left you a review.

-------------------------------
  Service : {review.service.title}
  Rating  : {stars} ({review.rating}/5)
  Comment : {review.comment or 'No comment left.'}
-------------------------------

View your reviews:
{_frontend('/provider/dashboard')}

— The Service Hub Team""",
        recipient_email=provider.email,
    )
