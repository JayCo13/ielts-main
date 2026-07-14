"""Shared, email-client-safe HTML template for transactional emails.

Table-based layout + inline CSS so it renders consistently in Gmail, Outlook,
Apple Mail, etc. All transactional emails (OTP, password reset, account created)
compose their body and pass it to render_email() for a consistent, branded look.

Brand palette (see CLAUDE.md "Brand identity"):
  PRIMARY  #0096b1  teal   — buttons, links, accents
  DARK     #2b5356  slate-teal — headings, brand name
  ORANGE   #eb7e37  orange — secondary accent
"""

BRAND_NAME = "Thi IELTS Trên Máy"
BRAND_TAGLINE = "Luyện thi IELTS trên máy tính"
PRIMARY = "#0096b1"
PRIMARY_DARK = "#0b7285"
DARK = "#2b5356"
ORANGE = "#eb7e37"
BRAND_URL = "https://thiieltstrenmay.com"
LOGO_URL = "https://thiieltstrenmay.com/img/logo-ielts.png"
SUPPORT_LINE = "Cần hỗ trợ? Trả lời email này hoặc truy cập thiieltstrenmay.com"

FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif"


def paragraph(text: str) -> str:
    return (
        f'<p style="margin:0 0 16px 0;font-family:{FONT};font-size:15px;'
        f'line-height:1.6;color:#374151;">{text}</p>'
    )


def otp_code_block(code: str, note: str = "Mã có hiệu lực trong 10 phút") -> str:
    return (
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">'
        '<tr><td align="center" style="padding:8px 0 20px 0;">'
        f'<div style="display:inline-block;background-color:#e8f6f9;border:1px dashed {PRIMARY};'
        'border-radius:10px;padding:18px 36px;">'
        f'<div style="font-family:{FONT};font-size:34px;font-weight:700;letter-spacing:10px;'
        f'color:{PRIMARY_DARK};">{code}</div>'
        '</div>'
        f'<div style="font-family:{FONT};font-size:13px;color:#9aa5b1;margin-top:10px;">{note}</div>'
        '</td></tr></table>'
    )


def cta_button(label: str, url: str) -> str:
    return (
        '<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" '
        'style="margin:8px auto 20px auto;">'
        f'<tr><td align="center" bgcolor="{PRIMARY}" style="border-radius:8px;">'
        f'<a href="{url}" target="_blank" style="display:inline-block;padding:14px 34px;'
        f'font-family:{FONT};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;'
        'border-radius:8px;">' + label + '</a>'
        '</td></tr></table>'
    )


def render_email(heading: str, body_html: str, preheader: str = "") -> str:
    """Wrap inner body_html in the branded, responsive email shell."""
    return f"""<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="color-scheme" content="light">
<title>{heading}</title>
</head>
<body style="margin:0;padding:0;background-color:#eef2f4;">
<span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">{preheader}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#eef2f4;">
<tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:100%;background-color:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
    <!-- Header (white so the colorful logo pops) -->
    <tr><td align="center" style="padding:30px 24px 18px 24px;background-color:#ffffff;">
      <img src="{LOGO_URL}" width="72" height="72" alt="{BRAND_NAME}" style="display:block;margin:0 auto 10px auto;border:0;">
      <div style="font-family:{FONT};font-size:20px;font-weight:700;color:{DARK};letter-spacing:0.2px;">{BRAND_NAME}</div>
      <div style="font-family:{FONT};font-size:12px;color:#8a97a0;margin-top:3px;">{BRAND_TAGLINE}</div>
    </td></tr>
    <!-- Signature accent bar (orange + teal) -->
    <tr><td style="font-size:0;line-height:0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
        <td width="50%" height="4" style="background-color:{ORANGE};font-size:0;line-height:0;">&nbsp;</td>
        <td width="50%" height="4" style="background-color:{PRIMARY};font-size:0;line-height:0;">&nbsp;</td>
      </tr></table>
    </td></tr>
    <!-- Body -->
    <tr><td style="padding:30px 36px 8px 36px;">
      <h1 style="margin:0 0 18px 0;font-family:{FONT};font-size:22px;font-weight:700;color:{DARK};">{heading}</h1>
      {body_html}
    </td></tr>
    <!-- Footer -->
    <tr><td style="padding:20px 36px 28px 36px;border-top:1px solid #eef2f4;">
      <div style="font-family:{FONT};font-size:12px;line-height:1.6;color:#9aa5b1;">
        {SUPPORT_LINE}<br>
        <a href="{BRAND_URL}" target="_blank" style="color:{PRIMARY};text-decoration:none;">thiieltstrenmay.com</a>
        &nbsp;·&nbsp; © {BRAND_NAME}
      </div>
    </td></tr>
  </table>
  <div style="font-family:{FONT};font-size:11px;color:#b9c2cc;margin-top:14px;">
    Email này được gửi tự động, vui lòng không xem đây là email spam.
  </div>
</td></tr>
</table>
</body>
</html>"""
