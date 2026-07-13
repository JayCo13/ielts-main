"""Thin Resend HTTPS API client for outbound email.

Both the transactional path (app/utils/email_utils.py) and the marketing/
broadcast path (app/utils/email_service.py) prefer Resend when RESEND_API_KEY
is set, and fall back to their previous transport (Gmail SMTP / AWS SES) when
it isn't — so deploying this is a no-op until the key is configured.

Transactional and marketing use DIFFERENT From identities so a marketing spam
complaint can't drag down OTP / password-reset deliverability.

Env:
  RESEND_API_KEY          re_...  (enables Resend for both paths)
  RESEND_FROM             transactional From, e.g. "Thi IELTS Trên Máy <noreply@thiieltstrenmay.com>"
  RESEND_MARKETING_FROM   marketing From,      e.g. "Thi IELTS Trên Máy <news@thiieltstrenmay.com>"
"""
import os
import logging
import requests

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"

DEFAULT_FROM = "Thi IELTS Trên Máy <noreply@thiieltstrenmay.com>"
DEFAULT_MARKETING_FROM = "Thi IELTS Trên Máy <news@thiieltstrenmay.com>"


def resend_configured() -> bool:
    return bool(os.getenv("RESEND_API_KEY"))


def transactional_from() -> str:
    return os.getenv("RESEND_FROM", DEFAULT_FROM)


def marketing_from() -> str:
    return os.getenv("RESEND_MARKETING_FROM", DEFAULT_MARKETING_FROM)


def send_via_resend(from_addr: str, to_email: str, subject: str, html: str) -> bool:
    """Send one email through Resend. Returns True on success, False otherwise."""
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        logger.error("send_via_resend called but RESEND_API_KEY is not set")
        return False
    try:
        resp = requests.post(
            RESEND_API_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": from_addr,
                "to": [to_email],
                "subject": subject,
                "html": html,
            },
            timeout=15,
        )
        if resp.status_code // 100 == 2:
            return True
        logger.error(f"Resend send to {to_email} failed: {resp.status_code} {resp.text[:300]}")
        return False
    except Exception as e:
        logger.error(f"Resend send to {to_email} errored: {e}")
        return False
