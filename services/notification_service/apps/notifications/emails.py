from django.conf import settings
from django.core.mail import send_mail


def _send(subject, message, recipient_email):
    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[recipient_email],
        fail_silently=False,
    )


def _frontend(path=""):
    base = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
    return f"{base}{path}"


def send_booking_email(data):
    status = data["status"]
    client_email = data["client_email"]
    client_username = data["client_username"]
    provider_email = data["provider_email"]
    provider_username = data["provider_username"]
    service_title = data["service_title"]
    scheduled_date = data["scheduled_date"]
    address = data.get("address", "Not specified")
    total_price = data["total_price"]
    cancellation_reason = data.get("cancellation_reason", "")

    block = f"""
  Service : {service_title}
  Date    : {scheduled_date}
  Address : {address or 'Not specified'}
  Amount  : {total_price} FCFA""".rstrip()

    if status == "created":
        _send(
            f"New Booking Request - {service_title}",
            f"""Hi {provider_username},

{client_username} has requested your service.

-------------------------------{block}
  Client  : {client_username}
-------------------------------

Log in to confirm or reject:
{_frontend('/provider/bookings')}

— The Service Hub Team""",
            provider_email,
        )

    elif status == "confirmed":
        _send(
            f"Booking Confirmed - {service_title}",
            f"""Hi {client_username},

Your booking has been confirmed by {provider_username}.

-------------------------------{block}
-------------------------------

{_frontend('/client/bookings')}

— The Service Hub Team""",
            client_email,
        )

    elif status == "rejected":
        _send(
            f"Booking Not Accepted - {service_title}",
            f"""Hi {client_username},

Unfortunately, {provider_username} was unable to accept your booking.

-------------------------------{block}
-------------------------------

{_frontend('/services')}

— The Service Hub Team""",
            client_email,
        )

    elif status == "cancelled":
        reason_text = f"\n  Reason  : {cancellation_reason}" if cancellation_reason else ""
        body = f"-------------------------------{block}{reason_text}\n-------------------------------"
        _send(f"Booking Cancelled - {service_title}",
              f"Hi {client_username},\n\nYour booking has been cancelled.\n\n{body}\n\n{_frontend('/services')}\n\n— The Service Hub Team",
              client_email)
        _send(f"Booking Cancelled - {service_title}",
              f"Hi {provider_username},\n\nA booking was cancelled.\n\n{body}\n\n{_frontend('/provider/bookings')}\n\n— The Service Hub Team",
              provider_email)

    elif status == "in_progress":
        _send(f"Service In Progress - {service_title}",
              f"Hi {client_username},\n\n{provider_username} has started your service.\n\n-------------------------------{block}\n-------------------------------\n\n— The Service Hub Team",
              client_email)

    elif status == "completed":
        _send(f"Service Completed - {service_title}",
              f"Hi {client_username},\n\n{provider_username} has completed your service!\n\n-------------------------------{block}\n-------------------------------\n\nLeave a review:\n{_frontend('/client/bookings')}\n\n— The Service Hub Team",
              client_email)


def send_welcome_email(data):
    username = data["username"]
    email = data["email"]
    role = data["role"]
    if role == "provider":
        body = f"""Hi {username},

Welcome to Service Hub! We're excited to have you as a provider.

1. Complete your profile.
2. Create your first service listing.
3. Start accepting bookings!

{_frontend('/provider/dashboard')}

— The Service Hub Team"""
    else:
        body = f"""Hi {username},

Welcome to Service Hub!

Browse services now:
{_frontend('/services')}

— The Service Hub Team"""
    _send("Welcome to Service Hub!", body, email)


def send_password_reset_email(data):
    _send(
        "Reset Your Service Hub Password",
        f"""Hi {data['username']},

Click the link to reset your password (valid 24 hours):
{data['reset_link']}

— The Service Hub Team""",
        data["email"],
    )


def send_review_email(data):
    stars = "*" * data["rating"] + " " * (5 - data["rating"])
    _send(
        f"New {data['rating']}-Star Review - {data['service_title']}",
        f"""Hi {data['provider_username']},

{data['client_username']} left you a review.

-------------------------------
  Service : {data['service_title']}
  Rating  : {stars} ({data['rating']}/5)
  Comment : {data.get('comment') or 'No comment left.'}
-------------------------------

{_frontend('/provider/dashboard')}

— The Service Hub Team""",
        data["provider_email"],
    )
