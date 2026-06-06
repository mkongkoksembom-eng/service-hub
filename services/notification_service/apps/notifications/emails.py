from django.conf import settings
from django.core.mail import EmailMultiAlternatives

from shared import email_layout as L


def _send(subject, text_body, html_body, recipient_email):
    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[recipient_email],
    )
    msg.attach_alternative(html_body, "text/html")
    msg.send(fail_silently=False)


def _frontend(path=""):
    base = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
    return f"{base}{path}"


def _layout(body_html):
    return L.layout(body_html, frontend_url=_frontend(), from_email=settings.DEFAULT_FROM_EMAIL)


def _booking_rows(data, extras=None):
    rows = [
        ("Service", data["service_title"]),
        ("Date", data["scheduled_date"]),
        ("Address", data.get("address") or "Not specified"),
        ("Amount", f"{data['total_price']} FCFA"),
    ]
    return rows + (extras or [])


def _booking_block(data):
    return (
        f"  Service : {data['service_title']}\n"
        f"  Date    : {data['scheduled_date']}\n"
        f"  Address : {data.get('address') or 'Not specified'}\n"
        f"  Amount  : {data['total_price']} FCFA"
    )


def send_booking_email(data):
    status = data["status"]
    client_email = data["client_email"]
    client_username = data["client_username"]
    provider_email = data["provider_email"]
    provider_username = data["provider_username"]
    service_title = data["service_title"]
    cancellation_reason = data.get("cancellation_reason", "")

    if status == "created":
        html = _layout(
            L.greeting(f"Hi {provider_username}")
            + L.paragraph(f"<strong>{client_username}</strong> has sent you a new booking request. Review the details below and confirm or decline.")
            + L.info_card("Booking Details", _booking_rows(data, [("Client", client_username)]))
            + L.button("Review Booking", _frontend("/provider/bookings"))
            + L.divider()
            + L.paragraph(L.muted("You have 24 hours to respond before the request expires."))
        )
        _send(
            f"New Booking Request — {service_title}",
            f"Hi {provider_username},\n\n{client_username} has requested your service.\n\n"
            f"-------------------------------\n{_booking_block(data)}\n  Client  : {client_username}\n-------------------------------\n\n"
            f"Log in to confirm or reject:\n{_frontend('/provider/bookings')}\n\n— The Service Hub Team",
            html,
            provider_email,
        )

    elif status == "confirmed":
        html = _layout(
            L.greeting(f"Hi {client_username}")
            + L.paragraph(f"Great news! <strong>{provider_username}</strong> has confirmed your booking. You're all set.")
            + L.info_card("Booking Details", _booking_rows(data))
            + L.button("View My Bookings", _frontend("/client/bookings"))
            + L.divider()
            + L.paragraph(L.muted("You'll receive another update when the provider starts the service."))
        )
        _send(
            f"Booking Confirmed — {service_title}",
            f"Hi {client_username},\n\nYour booking has been confirmed by {provider_username}.\n\n"
            f"-------------------------------\n{_booking_block(data)}\n-------------------------------\n\n"
            f"{_frontend('/client/bookings')}\n\n— The Service Hub Team",
            html,
            client_email,
        )

    elif status == "rejected":
        html = _layout(
            L.greeting(f"Hi {client_username}")
            + L.paragraph(f"Unfortunately, <strong>{provider_username}</strong> was unable to accept your booking request. Don't worry — there are plenty of other great providers available.")
            + L.info_card("Booking Details", _booking_rows(data))
            + L.button("Browse Other Providers", _frontend("/services"))
            + L.divider()
            + L.paragraph(L.muted("We're sorry for the inconvenience. You can search for a similar service and book another provider."))
        )
        _send(
            f"Booking Not Accepted — {service_title}",
            f"Hi {client_username},\n\nUnfortunately, {provider_username} was unable to accept your booking.\n\n"
            f"-------------------------------\n{_booking_block(data)}\n-------------------------------\n\n"
            f"{_frontend('/services')}\n\n— The Service Hub Team",
            html,
            client_email,
        )

    elif status == "cancelled":
        reason_row = [("Reason", cancellation_reason)] if cancellation_reason else []
        reason_text = f"\n  Reason  : {cancellation_reason}" if cancellation_reason else ""

        html_client = _layout(
            L.greeting(f"Hi {client_username}")
            + L.paragraph("Your booking has been cancelled. Here's a summary:")
            + L.info_card("Booking Details", _booking_rows(data, reason_row))
            + L.button("Browse Services", _frontend("/services"))
            + L.divider()
            + L.paragraph(L.muted("We hope to help you again soon. Browse other available services anytime."))
        )
        _send(
            f"Booking Cancelled — {service_title}",
            f"Hi {client_username},\n\nYour booking has been cancelled.\n\n"
            f"-------------------------------\n{_booking_block(data)}{reason_text}\n-------------------------------\n\n"
            f"{_frontend('/services')}\n\n— The Service Hub Team",
            html_client,
            client_email,
        )

        html_provider = _layout(
            L.greeting(f"Hi {provider_username}")
            + L.paragraph("A booking for your service has been cancelled.")
            + L.info_card("Booking Details", _booking_rows(data, reason_row))
            + L.button("View My Bookings", _frontend("/provider/bookings"))
        )
        _send(
            f"Booking Cancelled — {service_title}",
            f"Hi {provider_username},\n\nA booking was cancelled.\n\n"
            f"-------------------------------\n{_booking_block(data)}{reason_text}\n-------------------------------\n\n"
            f"{_frontend('/provider/bookings')}\n\n— The Service Hub Team",
            html_provider,
            provider_email,
        )

    elif status == "in_progress":
        html = _layout(
            L.greeting(f"Hi {client_username}")
            + L.paragraph(f"<strong>{provider_username}</strong> has started working on your service. Sit tight!")
            + L.info_card("Booking Details", _booking_rows(data))
            + L.button("Track in My Bookings", _frontend("/client/bookings"))
            + L.divider()
            + L.paragraph(L.muted("You'll get another notification once the service is complete."))
        )
        _send(
            f"Service In Progress — {service_title}",
            f"Hi {client_username},\n\n{provider_username} has started your service.\n\n"
            f"-------------------------------\n{_booking_block(data)}\n-------------------------------\n\n— The Service Hub Team",
            html,
            client_email,
        )

    elif status == "completed":
        html = _layout(
            L.greeting(f"Hi {client_username}")
            + L.paragraph(f"<strong>{provider_username}</strong> has completed your service. We hope everything went perfectly!")
            + L.info_card("Booking Details", _booking_rows(data))
            + L.button("Leave a Review", _frontend("/client/bookings"))
            + L.divider()
            + L.paragraph(L.muted("Reviews help other clients choose great providers. It only takes a minute!"))
        )
        _send(
            f"Service Completed — {service_title}",
            f"Hi {client_username},\n\n{provider_username} has completed your service!\n\n"
            f"-------------------------------\n{_booking_block(data)}\n-------------------------------\n\n"
            f"Leave a review:\n{_frontend('/client/bookings')}\n\n— The Service Hub Team",
            html,
            client_email,
        )


def send_welcome_email(data):
    username = data["username"]
    email = data["email"]
    role = data["role"]

    if role == "provider":
        items = [
            ("Complete your profile", "Add your skills, location, and a photo so clients can find and trust you."),
            ("Create a service listing", "Describe what you offer, set your pricing, and publish your first service."),
            ("Start accepting bookings", "Respond quickly to requests and build your reputation with great reviews."),
        ]
        cta_label, cta_url = "Set Up My Provider Profile", _frontend("/provider/dashboard")
        intro = "We're excited to have you as a provider on Service Hub. Here's how to get started:"
        text_steps = "  1. Complete your profile.\n  2. Create your first service listing.\n  3. Start accepting bookings!"
    else:
        items = [
            ("Browse services", "Explore providers across construction, ICT, health, events, and more."),
            ("Book a provider", "Choose your date, describe your needs, and send a booking request in minutes."),
            ("Leave a review", "After your experience, help others by rating your provider."),
        ]
        cta_label, cta_url = "Explore Services", _frontend("/services")
        intro = "We're glad you're here. Here's how to make the most of Service Hub:"
        text_steps = "  1. Browse available services.\n  2. Book a provider that fits your needs.\n  3. Leave a review after your experience!"

    html = _layout(
        L.greeting(f"Welcome, {username}!")
        + L.paragraph(intro)
        + L.steps(items)
        + L.button(cta_label, cta_url)
        + L.divider()
        + L.paragraph(L.muted("Questions? Just reply to this email — we're always happy to help."))
    )
    text = (
        f"Hi {username},\n\nWelcome to Service Hub!\n\n{intro}\n\n{text_steps}\n\n"
        f"Get started:\n{cta_url}\n\n— The Service Hub Team"
    )
    _send("Welcome to Service Hub!", text, html, email)


def send_password_reset_email(data):
    username = data["username"]
    email = data["email"]
    reset_link = data["reset_link"]

    html = _layout(
        L.greeting(f"Hi {username}")
        + L.paragraph("We received a request to reset your Service Hub password. Click the button below to choose a new one.")
        + L.button("Reset My Password", reset_link)
        + L.notice("&#9203;&nbsp; This link is valid for <strong>24 hours</strong>. After that you'll need to request a new one.")
        + L.divider()
        + L.paragraph(L.muted("If you didn't request a password reset, you can safely ignore this email — your account is secure."))
    )
    text = (
        f"Hi {username},\n\nWe received a request to reset your password.\n\n"
        f"Click the link below to set a new password (valid for 24 hours):\n{reset_link}\n\n"
        f"If you did not request this, you can safely ignore this email.\n\n— The Service Hub Team"
    )
    _send("Reset Your Service Hub Password", text, html, email)


def send_review_email(data):
    rating = data["rating"]
    service_title = data["service_title"]
    reviewer_username = data["reviewer_username"]
    provider_email = data["provider_email"]
    if not provider_email:
        return

    html = _layout(
        L.greeting("Hi there")
        + L.paragraph(f"<strong>{reviewer_username}</strong> left you a review for <strong>{service_title}</strong>.")
        + L.info_card("Review", [
            ("Service", service_title),
            ("Rating", L.stars(rating)),
        ])
        + L.button("View My Dashboard", _frontend("/provider/dashboard"))
    )
    text = (
        f"Hi there,\n\n{reviewer_username} left you a {rating}-star review.\n\n"
        f"-------------------------------\n  Service : {service_title}\n  Rating  : {'*' * rating}{' ' * (5 - rating)} ({rating}/5)\n-------------------------------\n\n"
        f"{_frontend('/provider/dashboard')}\n\n— The Service Hub Team"
    )
    _send(f"New {rating}-Star Review — {service_title}", text, html, provider_email)
