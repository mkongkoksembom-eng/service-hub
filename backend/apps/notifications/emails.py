from datetime import datetime
from django.conf import settings
from django.core.mail import EmailMultiAlternatives


# ─────────────────────────────────────────────────────────────
# Transport
# ─────────────────────────────────────────────────────────────

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


# ─────────────────────────────────────────────────────────────
# HTML primitives
# ─────────────────────────────────────────────────────────────

def _layout(body_html):
    year = datetime.now().year
    base = _frontend()
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

      <!-- Logo header -->
      <tr>
        <td style="background:#09090b;padding:24px 32px;border-radius:12px 12px 0 0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td>
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="width:32px;height:32px;background:#ffffff;border-radius:7px;text-align:center;vertical-align:middle;font-size:14px;line-height:32px;">
                      &#128188;
                    </td>
                    <td style="padding-left:10px;">
                      <span style="color:#ffffff;font-size:17px;font-weight:700;letter-spacing:-0.02em;">Service Hub</span>
                    </td>
                  </tr>
                </table>
              </td>
              <td align="right">
                <span style="color:#71717a;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;">Cameroonian Service Marketplace</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="background:#ffffff;padding:40px 32px;border-left:1px solid #e4e4e7;border-right:1px solid #e4e4e7;">
          {body_html}
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f9f9f9;padding:24px 32px;border:1px solid #e4e4e7;border-top:none;border-radius:0 0 12px 12px;">
          <p style="margin:0 0 10px;font-size:12px;color:#71717a;text-align:center;">
            &copy; {year} Service Hub &mdash; Connecting Cameroon&rsquo;s workforce.
          </p>
          <p style="margin:0;text-align:center;font-size:12px;">
            <a href="{base}" style="color:#09090b;text-decoration:none;font-weight:500;">Home</a>
            &nbsp;&nbsp;&middot;&nbsp;&nbsp;
            <a href="{base}/services" style="color:#09090b;text-decoration:none;font-weight:500;">Browse Services</a>
            &nbsp;&nbsp;&middot;&nbsp;&nbsp;
            <a href="mailto:{settings.DEFAULT_FROM_EMAIL}" style="color:#09090b;text-decoration:none;font-weight:500;">Contact Us</a>
          </p>
        </td>
      </tr>

    </table>
    </td></tr>
  </table>

</body>
</html>"""


def _greeting(name):
    return f'<p style="margin:0 0 4px;font-size:13px;color:#71717a;font-weight:500;">Hello,</p><h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#09090b;letter-spacing:-0.025em;">{name} &#128075;</h1>'


def _p(text):
    return f'<p style="margin:0 0 16px;font-size:14px;line-height:1.65;color:#3f3f46;">{text}</p>'


def _divider():
    return '<div style="border-top:1px solid #e4e4e7;margin:28px 0;"></div>'


def _button(label, url):
    return f"""
<table cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
  <tr>
    <td style="background:#09090b;border-radius:8px;">
      <a href="{url}"
         style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:-0.01em;">{label} &rarr;</a>
    </td>
  </tr>
</table>"""


def _booking_card(booking):
    rows = [
        ("Service",  booking.service.title),
        ("Date",     str(booking.scheduled_date)),
        ("Address",  booking.address or "Not specified"),
        ("Amount",   f"{booking.total_price:,} FCFA"),
    ]
    rows_html = ""
    for i, (k, v) in enumerate(rows):
        border = "" if i == len(rows) - 1 else "border-bottom:1px solid #e4e4e7;"
        rows_html += f"""<tr>
          <td style="padding:11px 16px;font-size:12px;color:#71717a;font-weight:600;letter-spacing:0.03em;text-transform:uppercase;white-space:nowrap;{border}width:28%;">{k}</td>
          <td style="padding:11px 16px;font-size:13px;color:#09090b;font-weight:500;{border}">{v}</td>
        </tr>"""
    return f"""
<table width="100%" cellpadding="0" cellspacing="0" border="0"
  style="border:1px solid #e4e4e7;border-radius:10px;overflow:hidden;margin:24px 0;">
  <tr>
    <td colspan="2" style="background:#09090b;padding:11px 16px;">
      <span style="color:#a1a1aa;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">Booking Details</span>
    </td>
  </tr>
  {rows_html}
</table>"""


def _booking_card_with_extras(booking, extras):
    """booking_card + additional key/value rows (e.g. Client, Notes)."""
    rows = [
        ("Service",  booking.service.title),
        ("Date",     str(booking.scheduled_date)),
        ("Address",  booking.address or "Not specified"),
        ("Amount",   f"{booking.total_price:,} FCFA"),
    ] + extras
    rows_html = ""
    for i, (k, v) in enumerate(rows):
        border = "" if i == len(rows) - 1 else "border-bottom:1px solid #e4e4e7;"
        rows_html += f"""<tr>
          <td style="padding:11px 16px;font-size:12px;color:#71717a;font-weight:600;letter-spacing:0.03em;text-transform:uppercase;white-space:nowrap;{border}width:28%;">{k}</td>
          <td style="padding:11px 16px;font-size:13px;color:#09090b;font-weight:500;{border}">{v}</td>
        </tr>"""
    return f"""
<table width="100%" cellpadding="0" cellspacing="0" border="0"
  style="border:1px solid #e4e4e7;border-radius:10px;overflow:hidden;margin:24px 0;">
  <tr>
    <td colspan="2" style="background:#09090b;padding:11px 16px;">
      <span style="color:#a1a1aa;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">Booking Details</span>
    </td>
  </tr>
  {rows_html}
</table>"""


def _review_card(review):
    filled = "&#9733;" * review.rating
    empty  = "&#9734;" * (5 - review.rating)
    stars  = (
        f'<span style="color:#09090b;font-size:20px;letter-spacing:2px;">{filled}</span>'
        f'<span style="color:#d4d4d8;font-size:20px;letter-spacing:2px;">{empty}</span>'
    )
    comment = review.comment or "No comment left."
    rows = [
        ("Service", review.service.title),
        ("Rating",  f'{stars}&nbsp;&nbsp;<span style="font-size:13px;color:#09090b;font-weight:600;">{review.rating} / 5</span>'),
        ("Comment", f'<span style="font-style:italic;color:#3f3f46;">&ldquo;{comment}&rdquo;</span>'),
    ]
    rows_html = ""
    for i, (k, v) in enumerate(rows):
        border = "" if i == len(rows) - 1 else "border-bottom:1px solid #e4e4e7;"
        align  = "vertical-align:top;" if k == "Comment" else ""
        rows_html += f"""<tr>
          <td style="padding:11px 16px;font-size:12px;color:#71717a;font-weight:600;letter-spacing:0.03em;text-transform:uppercase;white-space:nowrap;{border}{align}width:28%;">{k}</td>
          <td style="padding:11px 16px;font-size:13px;{border}">{v}</td>
        </tr>"""
    return f"""
<table width="100%" cellpadding="0" cellspacing="0" border="0"
  style="border:1px solid #e4e4e7;border-radius:10px;overflow:hidden;margin:24px 0;">
  <tr>
    <td colspan="2" style="background:#09090b;padding:11px 16px;">
      <span style="color:#a1a1aa;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">Review</span>
    </td>
  </tr>
  {rows_html}
</table>"""


def _steps(steps):
    items = ""
    for i, (title, desc) in enumerate(steps):
        items += f"""<tr>
          <td style="vertical-align:top;padding-right:16px;padding-bottom:20px;width:36px;">
            <div style="width:32px;height:32px;background:#09090b;border-radius:7px;text-align:center;line-height:32px;font-size:12px;font-weight:700;color:#ffffff;">{i+1:02d}</div>
          </td>
          <td style="padding-bottom:20px;vertical-align:top;">
            <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#09090b;">{title}</p>
            <p style="margin:0;font-size:13px;color:#71717a;line-height:1.55;">{desc}</p>
          </td>
        </tr>"""
    return f'<table cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 4px;">{items}</table>'


def _otp_box(otp):
    return f"""
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
  <tr>
    <td align="center">
      <div style="display:inline-block;background:#f4f4f5;border:1px solid #e4e4e7;border-radius:10px;padding:24px 40px;">
        <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#09090b;font-family:'Courier New',Courier,monospace;">{otp}</span>
      </div>
    </td>
  </tr>
</table>"""


def _notice(text):
    return f"""
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
  <tr>
    <td style="background:#f4f4f5;border:1px solid #e4e4e7;border-radius:8px;padding:12px 16px;">
      <p style="margin:0;font-size:13px;color:#71717a;line-height:1.5;">{text}</p>
    </td>
  </tr>
</table>"""


# ─────────────────────────────────────────────────────────────
# Plain-text helpers
# ─────────────────────────────────────────────────────────────

def _booking_block(booking):
    return (
        f"  Service : {booking.service.title}\n"
        f"  Date    : {booking.scheduled_date}\n"
        f"  Address : {booking.address or 'Not specified'}\n"
        f"  Amount  : {booking.total_price:,} FCFA"
    )


# ─────────────────────────────────────────────────────────────
# Email functions
# ─────────────────────────────────────────────────────────────

def send_otp_email(email, otp):
    """Registration OTP verification code."""
    html = _layout(
        _greeting("Welcome to Service Hub")
        + _p("To verify your email address, enter the code below during registration. It expires in <strong>10 minutes</strong>.")
        + _otp_box(otp)
        + _notice("&#128274;&nbsp; Do not share this code with anyone. Service Hub will never ask for your code.")
        + _divider()
        + _p('<span style="color:#71717a;font-size:13px;">If you did not request this code you can safely ignore this email.</span>')
    )
    text = (
        f"Your Service Hub verification code is:\n\n"
        f"    {otp}\n\n"
        f"This code expires in 10 minutes. Do not share it with anyone."
    )
    _send("Your Service Hub verification code", text, html, email)


def send_password_reset_email(username, email, reset_link):
    """Password reset link."""
    html = _layout(
        _greeting(f"Hi {username}")
        + _p("We received a request to reset your Service Hub password. Click the button below to choose a new one.")
        + _button("Reset My Password", reset_link)
        + _notice("&#9203;&nbsp; This link is valid for <strong>24 hours</strong>. After that you'll need to request a new one.")
        + _divider()
        + _p('<span style="color:#71717a;font-size:13px;">If you didn\'t request a password reset, you can safely ignore this email — your account is secure.</span>')
    )
    text = (
        f"Hi {username},\n\n"
        f"We received a request to reset your password.\n\n"
        f"Click the link below to set a new password (valid for 24 hours):\n{reset_link}\n\n"
        f"If you did not request this, you can safely ignore this email.\n\n"
        f"— The Service Hub Team"
    )
    _send("Reset Your Service Hub Password", text, html, email)


def send_booking_request_email(booking):
    """Provider receives email when a client creates a booking."""
    provider = booking.service.provider.user
    client   = booking.client
    html = _layout(
        _greeting(f"Hi {provider.username}")
        + _p(f"<strong>{client.username}</strong> has sent you a new booking request. Review the details below and confirm or decline.")
        + _booking_card_with_extras(booking, [
            ("Client", f"{client.username} &lt;{client.email}&gt;"),
            ("Notes",  booking.notes or "None"),
        ])
        + _button("Review Booking", _frontend("/provider/bookings"))
        + _divider()
        + _p('<span style="color:#71717a;font-size:13px;">You have 24 hours to respond before the request expires.</span>')
    )
    text = (
        f"Hi {provider.username},\n\n"
        f"{client.username} has requested your service.\n\n"
        f"-------------------------------\n{_booking_block(booking)}\n"
        f"  Client  : {client.username} ({client.email})\n"
        f"  Notes   : {booking.notes or 'None'}\n-------------------------------\n\n"
        f"Log in to confirm or reject this booking:\n{_frontend('/provider/bookings')}\n\n"
        f"— The Service Hub Team"
    )
    _send(f"New Booking Request — {booking.service.title}", text, html, provider.email)


def send_booking_confirmed_email(booking):
    """Client receives email when provider confirms their booking."""
    client   = booking.client
    provider = booking.service.provider.user
    html = _layout(
        _greeting(f"Hi {client.username}")
        + _p(f"Great news! <strong>{provider.username}</strong> has confirmed your booking. You're all set.")
        + _booking_card(booking)
        + _button("View My Bookings", _frontend("/client/bookings"))
        + _divider()
        + _p('<span style="color:#71717a;font-size:13px;">You\'ll receive another update when the provider starts the service.</span>')
    )
    text = (
        f"Hi {client.username},\n\n"
        f"Your booking has been confirmed by {provider.username}.\n\n"
        f"-------------------------------\n{_booking_block(booking)}\n-------------------------------\n\n"
        f"View your bookings:\n{_frontend('/client/bookings')}\n\n"
        f"— The Service Hub Team"
    )
    _send(f"Booking Confirmed — {booking.service.title}", text, html, client.email)


def send_booking_rejected_email(booking):
    """Client receives email when provider rejects their booking."""
    client   = booking.client
    provider = booking.service.provider.user
    html = _layout(
        _greeting(f"Hi {client.username}")
        + _p(f"Unfortunately, <strong>{provider.username}</strong> was unable to accept your booking request. Don't worry — there are plenty of other great providers available.")
        + _booking_card(booking)
        + _button("Browse Other Providers", _frontend("/services"))
        + _divider()
        + _p('<span style="color:#71717a;font-size:13px;">We\'re sorry for the inconvenience. You can search for a similar service and book another provider.</span>')
    )
    text = (
        f"Hi {client.username},\n\n"
        f"Unfortunately, {provider.username} was unable to accept your booking request.\n\n"
        f"-------------------------------\n{_booking_block(booking)}\n-------------------------------\n\n"
        f"Browse other providers:\n{_frontend('/services')}\n\n"
        f"— The Service Hub Team"
    )
    _send(f"Booking Not Accepted — {booking.service.title}", text, html, client.email)


def send_booking_cancelled_email(booking):
    """Both client and provider receive email when a booking is cancelled."""
    client   = booking.client
    provider = booking.service.provider.user
    reason_row = ([("Reason", booking.cancellation_reason)] if booking.cancellation_reason else [])

    # Client
    html_client = _layout(
        _greeting(f"Hi {client.username}")
        + _p("Your booking has been cancelled. Here's a summary:")
        + _booking_card_with_extras(booking, reason_row)
        + _button("Browse Services", _frontend("/services"))
        + _divider()
        + _p('<span style="color:#71717a;font-size:13px;">We hope to help you again soon. Browse other available services anytime.</span>')
    )
    text_client = (
        f"Hi {client.username},\n\nYour booking has been cancelled.\n\n"
        f"-------------------------------\n{_booking_block(booking)}\n"
        + (f"  Reason  : {booking.cancellation_reason}\n" if booking.cancellation_reason else "")
        + f"-------------------------------\n\nBrowse other services:\n{_frontend('/services')}\n\n— The Service Hub Team"
    )
    _send(f"Booking Cancelled — {booking.service.title}", text_client, html_client, client.email)

    # Provider
    html_provider = _layout(
        _greeting(f"Hi {provider.username}")
        + _p("A booking for your service has been cancelled.")
        + _booking_card_with_extras(booking, reason_row)
        + _button("View My Bookings", _frontend("/provider/bookings"))
    )
    text_provider = (
        f"Hi {provider.username},\n\nA booking for your service has been cancelled.\n\n"
        f"-------------------------------\n{_booking_block(booking)}\n"
        + (f"  Reason  : {booking.cancellation_reason}\n" if booking.cancellation_reason else "")
        + f"-------------------------------\n\nView your bookings:\n{_frontend('/provider/bookings')}\n\n— The Service Hub Team"
    )
    _send(f"Booking Cancelled — {booking.service.title}", text_provider, html_provider, provider.email)


def send_booking_in_progress_email(booking):
    """Client receives email when provider starts the service."""
    client   = booking.client
    provider = booking.service.provider.user
    html = _layout(
        _greeting(f"Hi {client.username}")
        + _p(f"<strong>{provider.username}</strong> has started working on your service. Sit tight!")
        + _booking_card(booking)
        + _button("Track in My Bookings", _frontend("/client/bookings"))
        + _divider()
        + _p('<span style="color:#71717a;font-size:13px;">You\'ll get another notification once the service is complete.</span>')
    )
    text = (
        f"Hi {client.username},\n\n"
        f"{provider.username} has started working on your service.\n\n"
        f"-------------------------------\n{_booking_block(booking)}\n-------------------------------\n\n"
        f"— The Service Hub Team"
    )
    _send(f"Service In Progress — {booking.service.title}", text, html, client.email)


def send_booking_completed_email(booking):
    """Client receives email when provider marks the service as completed."""
    client   = booking.client
    provider = booking.service.provider.user
    html = _layout(
        _greeting(f"Hi {client.username}")
        + _p(f"<strong>{provider.username}</strong> has completed your service. We hope everything went perfectly!")
        + _booking_card(booking)
        + _button("Leave a Review", _frontend("/client/bookings"))
        + _divider()
        + _p('<span style="color:#71717a;font-size:13px;">Reviews help other clients choose great providers. It only takes a minute!</span>')
    )
    text = (
        f"Hi {client.username},\n\n"
        f"{provider.username} has completed your service. We hope everything went well!\n\n"
        f"-------------------------------\n{_booking_block(booking)}\n-------------------------------\n\n"
        f"Leave a review:\n{_frontend('/client/bookings')}\n\n"
        f"— The Service Hub Team"
    )
    _send(f"Service Completed — {booking.service.title}", text, html, client.email)


def send_welcome_email(user):
    """New user receives a welcome email after registration."""
    from apps.users.models import User as UserModel

    if user.role == UserModel.Role.PROVIDER:
        steps = [
            ("Complete your profile",   "Add your skills, location, and a photo so clients can find and trust you."),
            ("Create a service listing", "Describe what you offer, set your pricing, and publish your first service."),
            ("Start accepting bookings", "Respond quickly to requests and build your reputation with great reviews."),
        ]
        cta_label = "Set Up My Provider Profile"
        cta_url   = _frontend("/provider/dashboard")
        intro     = "We're excited to have you as a provider on Service Hub. Here's how to get started:"
        text_steps = "  1. Complete your profile so clients can find you.\n  2. Create your first service listing.\n  3. Start accepting bookings!"
        text_cta   = _frontend("/provider/dashboard")
    else:
        steps = [
            ("Browse services",      "Explore 2,400+ verified providers across construction, ICT, health, events, and more."),
            ("Book a provider",      "Choose your date, describe your needs, and send a booking request in minutes."),
            ("Leave a review",       "After your experience, help others by rating your provider."),
        ]
        cta_label = "Explore Services"
        cta_url   = _frontend("/services")
        intro     = "We're glad you're here. Here's how to make the most of Service Hub:"
        text_steps = "  1. Browse available services.\n  2. Book a provider that fits your needs.\n  3. Leave a review after your experience!"
        text_cta   = _frontend("/services")

    html = _layout(
        _greeting(f"Welcome, {user.username}!")
        + _p(intro)
        + _steps(steps)
        + _button(cta_label, cta_url)
        + _divider()
        + _p('<span style="color:#71717a;font-size:13px;">Questions? Just reply to this email &mdash; we\'re always happy to help.</span>')
    )
    text = (
        f"Hi {user.username},\n\nWelcome to Service Hub!\n\n{intro}\n\n{text_steps}\n\n"
        f"Get started:\n{text_cta}\n\n"
        f"If you have any questions, just reply to this email.\n\n— The Service Hub Team"
    )
    _send("Welcome to Service Hub!", text, html, user.email)


def send_review_received_email(review):
    """Provider receives email when a client leaves a review."""
    provider = review.service.provider.user
    client   = review.client
    html = _layout(
        _greeting(f"Hi {provider.username}")
        + _p(f"<strong>{client.username}</strong> just left you a review. Here's what they said:")
        + _review_card(review)
        + _button("View My Dashboard", _frontend("/provider/dashboard"))
        + _divider()
        + _p('<span style="color:#71717a;font-size:13px;">Reviews build trust and help you attract more clients. Keep up the great work!</span>')
    )
    stars_text = "★" * review.rating + "☆" * (5 - review.rating)
    text = (
        f"Hi {provider.username},\n\n{client.username} has left you a review.\n\n"
        f"-------------------------------\n"
        f"  Service : {review.service.title}\n"
        f"  Rating  : {stars_text} ({review.rating}/5)\n"
        f"  Comment : {review.comment or 'No comment left.'}\n"
        f"-------------------------------\n\n"
        f"View your reviews:\n{_frontend('/provider/dashboard')}\n\n"
        f"— The Service Hub Team"
    )
    _send(f"New {review.rating}-Star Review — {review.service.title}", text, html, provider.email)
