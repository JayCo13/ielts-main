from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, timedelta
from jose import jwt, JWTError
import os
import secrets
from app.utils.email_utils import send_password_reset_email, send_email
from app.routes.admin.auth import pwd_context, SECRET_KEY, ALGORITHM, create_access_token, get_current_user
from app.utils.datetime_utils import get_vietnam_time
from app.utils.redis_cache import cache
from typing import Optional

router = APIRouter()

# Set token expiration to 30 minutes
RESET_TOKEN_EXPIRE_MINUTES = 30
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# OTP config for the authenticated change-password flow
CHANGE_PW_OTP_TTL_SECONDS = 600       # code valid for 10 minutes
CHANGE_PW_OTP_COOLDOWN = 60           # min seconds between sends per user
CHANGE_PW_OTP_KEY = "change_pw_otp:{user_id}"
CHANGE_PW_OTP_COOLDOWN_KEY = "change_pw_otp_cooldown:{user_id}"

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)
    confirm_password: str

class ChangePasswordCodeRequest(BaseModel):
    current_password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)
    confirm_password: str
    code: str

@router.post("/request-password-reset", response_model=dict)
async def request_password_reset(
    request: PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """
    Request a password reset. This will send an email with a reset link to the user.
    Works for both student and customer users.
    """
    # Find the user with the provided email
    user = db.query(User).filter(User.email == request.email).first()
    
    # For security reasons, don't reveal whether the email exists
    if not user or user.role not in ["student", "customer"]:
        return {
            "message": "If the email exists in our system, a password reset link will be sent."
        }
    
    # Create a password reset token
    reset_token_expires = timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
    reset_token = create_access_token(
        data={"sub": user.username, "reset": True, "email": user.email},
        expires_delta=reset_token_expires
    )
    
    # Send password reset email
    email_sent = send_password_reset_email(
        to_email=user.email,
        reset_token=reset_token,
        username=user.username,
        frontend_url=FRONTEND_URL
    )
    
    if not email_sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send password reset email. Please try again later."
        )
    
    return {
        "message": "If the email exists in our system, a password reset link will be sent."
    }

@router.post("/reset-password", response_model=dict)
async def reset_password(
    reset_data: PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    """
    Reset the user's password using the reset token.
    """
    # Verify passwords match
    if reset_data.new_password != reset_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )
    
    # Verify token
    try:
        payload = jwt.decode(reset_data.token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Ensure this is a reset token
        if not payload.get("reset"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid reset token"
            )
        
        username = payload.get("sub")
        email = payload.get("email")
        
        if not username or not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid reset token"
            )
            
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired token"
        )
    
    # Find the user
    user = db.query(User).filter(
        User.username == username, 
        User.email == email
    ).first()
    
    if not user or user.role not in ["student", "customer"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update the password
    user.password = pwd_context.hash(reset_data.new_password)
    user.last_active = get_vietnam_time().replace(tzinfo=None)
    
    db.commit()
    
    return {
        "message": "Password has been reset successfully"
    }

@router.get("/verify-reset-token", response_model=dict)
async def verify_reset_token(token: str):
    """
    Verify if a reset token is valid and not expired.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Ensure this is a reset token
        if not payload.get("reset"):
            return {"valid": False}
        
        username = payload.get("sub")
        email = payload.get("email")
        
        if not username or not email:
            return {"valid": False}
            
        return {"valid": True, "username": username, "email": email}

    except JWTError:
        return {"valid": False}

def _change_pw_otp_email_html(code: str, username: str) -> str:
    from app.utils.email_templates import render_email, paragraph, otp_code_block
    body = (
        paragraph(f"Xin chào {username},")
        + paragraph("Mã xác thực để đổi mật khẩu tài khoản của bạn là:")
        + otp_code_block(code)
        + paragraph("Mã có hiệu lực trong 10 phút. Vui lòng không chia sẻ mã này với bất kỳ ai. "
                    "Nếu bạn không yêu cầu đổi mật khẩu, hãy bỏ qua email này và cân nhắc đổi mật khẩu ngay.")
    )
    return render_email("Mã xác thực đổi mật khẩu", body, preheader=f"Mã xác thực đổi mật khẩu: {code}")


@router.post("/change-password/request-code", response_model=dict)
async def request_change_password_code(
    request: ChangePasswordCodeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a 6-digit OTP to the authenticated user's email to authorize a password change.
    Requires the current password so codes aren't sent on bad attempts. Works for all roles.
    """
    # Verify the current password before sending anything
    if not pwd_context.verify(request.current_password, current_user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu hiện tại không đúng"
        )

    if not current_user.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản của bạn chưa có email để nhận mã xác thực"
        )

    # Rate limit resends per user
    if await cache.exists(CHANGE_PW_OTP_COOLDOWN_KEY.format(user_id=current_user.user_id)):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Vui lòng đợi một chút trước khi gửi lại mã"
        )

    # Generate + store the code (keyed by user, single-use)
    code = f"{secrets.randbelow(1000000):06d}"
    stored = await cache.set(
        CHANGE_PW_OTP_KEY.format(user_id=current_user.user_id),
        code,
        ttl=CHANGE_PW_OTP_TTL_SECONDS
    )
    if not stored:
        # Redis unreachable — fail loudly rather than pretend a code was sent
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Dịch vụ xác thực tạm thời không khả dụng, vui lòng thử lại sau"
        )
    await cache.set(
        CHANGE_PW_OTP_COOLDOWN_KEY.format(user_id=current_user.user_id),
        "1",
        ttl=CHANGE_PW_OTP_COOLDOWN
    )

    # Send it (transactional email path)
    try:
        send_email(
            current_user.email,
            "thiieltstrenmay.com - Mã xác thực đổi mật khẩu",
            _change_pw_otp_email_html(code, current_user.username)
        )
    except Exception as e:
        print(f"Failed to send change-password OTP to {current_user.email}: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Không gửi được mã xác thực, vui lòng thử lại"
        )

    # Mask the email so the client can show where the code went
    return {
        "message": "Đã gửi mã xác thực tới email của bạn",
        "email": current_user.email
    }


@router.post("/change-password", response_model=dict)
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change the password for the currently authenticated user.
    Requires the current password AND a valid email OTP. Works for all roles.
    """
    # Verify the current password
    if not pwd_context.verify(request.current_password, current_user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu hiện tại không đúng"
        )

    # Verify the new passwords match
    if request.new_password != request.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới không khớp"
        )

    # Prevent reusing the same password
    if pwd_context.verify(request.new_password, current_user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới phải khác mật khẩu hiện tại"
        )

    # Verify the email OTP (single-use, consumed on success)
    otp_key = CHANGE_PW_OTP_KEY.format(user_id=current_user.user_id)
    stored_code = await cache.get(otp_key)
    submitted = (request.code or "").strip()
    if stored_code is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã xác thực đã hết hạn, vui lòng gửi lại mã"
        )
    if str(stored_code) != submitted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã xác thực không đúng"
        )
    await cache.delete(otp_key)

    # Update the password
    current_user.password = pwd_context.hash(request.new_password)
    current_user.last_active = get_vietnam_time().replace(tzinfo=None)

    db.commit()

    return {
        "message": "Đổi mật khẩu thành công"
    }
