from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User
from pydantic import BaseModel, EmailStr
import dns.resolver
import re
import os
import secrets
from app.utils.email_utils import send_email
from app.utils.email_blocklist import is_disposable_email
from app.utils.redis_cache import cache
from typing import Dict

router = APIRouter()

# OTP config
OTP_TTL_SECONDS = 600          # code valid for 10 minutes
OTP_RESEND_COOLDOWN = 60       # min seconds between sends to the same email
OTP_KEY = "email_otp:{email}"
OTP_COOLDOWN_KEY = "email_otp_cooldown:{email}"


class EmailVerifyRequest(BaseModel):
    email: EmailStr

def is_valid_email_format(email: str) -> bool:
    """Check if email has a valid format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def verify_email_domain(email: str) -> Dict[str, bool]:
    """Verify if the email domain exists and has MX records"""
    if not is_valid_email_format(email):
        return {"valid_format": False, "domain_exists": False}
    
    domain = email.split('@')[-1]
    
    try:
        # Check if the domain has MX records
        dns.resolver.resolve(domain, 'MX')
        return {"valid_format": True, "domain_exists": True}
    except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.resolver.NoNameservers, dns.exception.Timeout):
        try:
            # Fallback to A records if no MX records
            dns.resolver.resolve(domain, 'A')
            return {"valid_format": True, "domain_exists": True}
        except:
            return {"valid_format": True, "domain_exists": False}
    except Exception:
        return {"valid_format": True, "domain_exists": False}

 
@router.post("/verify-email", response_model=Dict)
async def verify_email(
    request: EmailVerifyRequest,
    db: Session = Depends(get_db)
):
    """
    Verify if an email is valid and check if it already exists in the system.
    If it exists, send a notification to the user.
    """
    email = request.email
    
    # Step 1: Verify email format and domain
    verification_result = verify_email_domain(email)
    
    if not verification_result["valid_format"]:
        return {
            "valid": False,
            "exists": False,
            "message": "Invalid email format"
        }
    
    if not verification_result["domain_exists"]:
        return {
            "valid": False,
            "exists": False,
            "message": "Email domain does not exist or cannot receive emails"
        }

    # Reject disposable / temporary email providers
    if is_disposable_email(email):
        return {
            "valid": False,
            "exists": False,
            "message": "Vui lòng dùng email cá nhân thật (không dùng email tạm thời)"
        }

    # Step 2: Check if the email already exists in the database
    existing_user = db.query(User).filter(User.email == email).first()
    
    if existing_user:
        # Send notification email to the existing user
        try:
            
            # Don't reveal to the client that the email exists for security reasons
            return {
                "valid": True,
                "exists": False,  # We say false for security
                "message": "Email validation completed"
            }
        except Exception as e:
            print(f"Failed to send notification: {str(e)}")
            return {
                "valid": True,
                "exists": False,  # We say false for security
                "message": "Email validation completed"
            }
    
    # Email is valid and doesn't exist in our system
    return {
        "valid": True,
        "exists": False,
        "message": "Email is valid and can be used for registration"
    }


def _otp_email_html(code: str) -> str:
    return f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
            <h2 style="color: #4a86e8;">thiieltstrenmay.com - Mã xác thực đăng ký</h2>
            <p>Xin chào,</p>
            <p>Mã xác thực đăng ký tài khoản của bạn là:</p>
            <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #111; text-align: center; margin: 24px 0;">{code}</p>
            <p>Mã có hiệu lực trong <strong>10 phút</strong>. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>
            <p>Nếu bạn không yêu cầu đăng ký, hãy bỏ qua email này.</p>
            <p>Cảm ơn bạn,<br>Đội ngũ thiieltstrenmay.com</p>
        </div>
    </body>
    </html>
    """


@router.post("/send-verification-code", response_model=Dict)
async def send_verification_code(
    request: EmailVerifyRequest,
    db: Session = Depends(get_db),
):
    """Send a 6-digit OTP to the email so registration can confirm inbox ownership.

    Rejects bad-format, non-existent, disposable, and already-registered emails
    before sending, and rate-limits resends per email.
    """
    email = request.email.strip().lower()

    # Format + domain (MX/A) check
    domain_result = verify_email_domain(email)
    if not domain_result["valid_format"]:
        raise HTTPException(status_code=400, detail="Email không đúng định dạng")
    if not domain_result["domain_exists"]:
        raise HTTPException(status_code=400, detail="Tên miền email không tồn tại hoặc không nhận được email")

    # Block disposable providers
    if is_disposable_email(email):
        raise HTTPException(status_code=400, detail="Vui lòng dùng email cá nhân thật (không dùng email tạm thời)")

    # Don't send codes to emails that are already registered
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email đã được đăng ký")

    # Rate limit resends
    if await cache.exists(OTP_COOLDOWN_KEY.format(email=email)):
        raise HTTPException(status_code=429, detail="Vui lòng đợi một chút trước khi gửi lại mã")

    # Generate + store code
    code = f"{secrets.randbelow(1000000):06d}"
    stored = await cache.set(OTP_KEY.format(email=email), code, ttl=OTP_TTL_SECONDS)
    if not stored:
        # Redis unreachable — fail loudly rather than pretend a code was sent
        raise HTTPException(status_code=503, detail="Dịch vụ xác thực tạm thời không khả dụng, vui lòng thử lại sau")
    await cache.set(OTP_COOLDOWN_KEY.format(email=email), "1", ttl=OTP_RESEND_COOLDOWN)

    # Send it (transactional email path)
    try:
        send_email(email, "thiieltstrenmay.com - Mã xác thực đăng ký", _otp_email_html(code))
    except Exception as e:
        print(f"Failed to send OTP email to {email}: {e}")
        raise HTTPException(status_code=502, detail="Không gửi được mã xác thực, vui lòng thử lại")

    return {"success": True, "message": "Đã gửi mã xác thực tới email của bạn"}


async def verify_email_code(email: str, code: str) -> bool:
    """Check a submitted OTP against the stored one; consume it on success."""
    email = (email or "").strip().lower()
    code = (code or "").strip()
    if not code:
        return False
    stored = await cache.get(OTP_KEY.format(email=email))
    if stored is None:
        return False
    if str(stored) != code:
        return False
    # Single-use: delete on success
    await cache.delete(OTP_KEY.format(email=email))
    return True

