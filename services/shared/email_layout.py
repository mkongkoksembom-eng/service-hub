"""Shared HTML email layout/components used by user_service and notification_service.

Pure string-building helpers — callers pass plain values (no ORM objects), since
each service only has access to its own data.
"""
from datetime import datetime


def layout(body_html, *, frontend_url, from_email):
    year = datetime.now().year
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
            <a href="{frontend_url}" style="color:#09090b;text-decoration:none;font-weight:500;">Home</a>
            &nbsp;&nbsp;&middot;&nbsp;&nbsp;
            <a href="{frontend_url}/services" style="color:#09090b;text-decoration:none;font-weight:500;">Browse Services</a>
            &nbsp;&nbsp;&middot;&nbsp;&nbsp;
            <a href="mailto:{from_email}" style="color:#09090b;text-decoration:none;font-weight:500;">Contact Us</a>
          </p>
        </td>
      </tr>

    </table>
    </td></tr>
  </table>

</body>
</html>"""


def greeting(name):
    return f'<p style="margin:0 0 4px;font-size:13px;color:#71717a;font-weight:500;">Hello,</p><h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#09090b;letter-spacing:-0.025em;">{name} &#128075;</h1>'


def paragraph(text):
    return f'<p style="margin:0 0 16px;font-size:14px;line-height:1.65;color:#3f3f46;">{text}</p>'


def divider():
    return '<div style="border-top:1px solid #e4e4e7;margin:28px 0;"></div>'


def button(label, url):
    return f"""
<table cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
  <tr>
    <td style="background:#09090b;border-radius:8px;">
      <a href="{url}"
         style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:-0.01em;">{label} &rarr;</a>
    </td>
  </tr>
</table>"""


def info_card(title, rows):
    """rows: list of (label, value_html) tuples rendered as a bordered key/value table."""
    rows_html = ""
    for i, (k, v) in enumerate(rows):
        border = "" if i == len(rows) - 1 else "border-bottom:1px solid #e4e4e7;"
        rows_html += f"""<tr>
          <td style="padding:11px 16px;font-size:12px;color:#71717a;font-weight:600;letter-spacing:0.03em;text-transform:uppercase;white-space:nowrap;{border}width:28%;vertical-align:top;">{k}</td>
          <td style="padding:11px 16px;font-size:13px;color:#09090b;font-weight:500;{border}">{v}</td>
        </tr>"""
    return f"""
<table width="100%" cellpadding="0" cellspacing="0" border="0"
  style="border:1px solid #e4e4e7;border-radius:10px;overflow:hidden;margin:24px 0;">
  <tr>
    <td colspan="2" style="background:#09090b;padding:11px 16px;">
      <span style="color:#a1a1aa;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">{title}</span>
    </td>
  </tr>
  {rows_html}
</table>"""


def stars(rating):
    filled = "&#9733;" * rating
    empty = "&#9734;" * (5 - rating)
    return (
        f'<span style="color:#09090b;font-size:20px;letter-spacing:2px;">{filled}</span>'
        f'<span style="color:#d4d4d8;font-size:20px;letter-spacing:2px;">{empty}</span>'
        f'&nbsp;&nbsp;<span style="font-size:13px;color:#09090b;font-weight:600;">{rating} / 5</span>'
    )


def steps(items):
    rows = ""
    for i, (title, desc) in enumerate(items):
        rows += f"""<tr>
          <td style="vertical-align:top;padding-right:16px;padding-bottom:20px;width:36px;">
            <div style="width:32px;height:32px;background:#09090b;border-radius:7px;text-align:center;line-height:32px;font-size:12px;font-weight:700;color:#ffffff;">{i+1:02d}</div>
          </td>
          <td style="padding-bottom:20px;vertical-align:top;">
            <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#09090b;">{title}</p>
            <p style="margin:0;font-size:13px;color:#71717a;line-height:1.55;">{desc}</p>
          </td>
        </tr>"""
    return f'<table cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 4px;">{rows}</table>'


def otp_box(otp):
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


def notice(text):
    return f"""
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
  <tr>
    <td style="background:#f4f4f5;border:1px solid #e4e4e7;border-radius:8px;padding:12px 16px;">
      <p style="margin:0;font-size:13px;color:#71717a;line-height:1.5;">{text}</p>
    </td>
  </tr>
</table>"""


def muted(text):
    return f'<span style="color:#71717a;font-size:13px;">{text}</span>'
