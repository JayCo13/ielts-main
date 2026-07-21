"""Center (Trung tâm) management — P0 foundation.

Endpoints here cover center onboarding (admin) and the center's own profile /
wallet summary. Teacher/student/class management (P1) and wallet top-up + VIP
purchasing (P2) build on top of these models.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

from datetime import timedelta

from app.database import get_db
from app.models.models import User, Center, CenterMembership
from app.routes.admin.auth import (
    get_current_admin, get_current_center, pwd_context,
    create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES,
)

router = APIRouter()


class CenterLoginRequest(BaseModel):
    username: str
    password: str


@router.post("/center/login", response_model=dict)
async def center_login(request: CenterLoginRequest, db: Session = Depends(get_db)):
    """Login for the center-management dashboard (center admins and teachers).

    Unlike the exam-taking /login, this does NOT do single-session/device
    binding — a center admin may work in several tabs, and a teacher is also
    logged into the exam app; neither should trip account-sharing detection.
    Returns the dashboard role ('center' or 'teacher') for client routing.
    """
    user = db.query(User).filter(User.username == request.username).first()
    if not user or not pwd_context.verify(request.password, user.password):
        raise HTTPException(status_code=401, detail="Sai tên đăng nhập hoặc mật khẩu")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Tài khoản đã bị khoá hoặc tạm dừng")

    dashboard_role = None
    if user.role == "center":
        dashboard_role = "center"
    else:
        teacher_m = db.query(CenterMembership).filter(
            CenterMembership.user_id == user.user_id,
            CenterMembership.member_type == "teacher",
            CenterMembership.is_disabled == False,
        ).first()
        if teacher_m:
            dashboard_role = "teacher"
    if not dashboard_role:
        raise HTTPException(status_code=403, detail="Tài khoản không có quyền truy cập trang quản lý trung tâm")

    token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": dashboard_role,
        "username": user.username,
        "user_id": user.user_id,
    }


def compute_discount_rate(vip_purchase_count: int) -> float:
    """Tiered VIP discount based on the center's cumulative VIP purchase count:
    purchases 1-5 -> 0%, 6-20 -> 5%, 21+ -> 10%.

    The count passed in is how many VIP registrations have ALREADY been made;
    the returned rate applies to the NEXT purchase (so the 6th purchase, made
    when count == 5, gets 5%)."""
    made = vip_purchase_count or 0
    if made >= 20:      # the 21st purchase onward
        return 10.0
    if made >= 5:       # the 6th through 20th purchase
        return 5.0
    return 0.0


class CreateCenterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    logo_url: Optional[str] = None


@router.post("/admin/centers", response_model=dict)
async def create_center(
    request: CreateCenterRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Admin onboards a new center: creates its login User (role='center') and
    the Center row with an empty wallet."""
    if db.query(User).filter(User.username == request.username).first():
        raise HTTPException(status_code=400, detail="Tên đăng nhập đã tồn tại")
    if db.query(User).filter(User.email == request.email).first():
        raise HTTPException(status_code=400, detail="Email đã được sử dụng")

    user = User(
        username=request.username,
        email=request.email,
        password=pwd_context.hash(request.password),
        role="center",
        is_active=True,
        status="offline",
    )
    db.add(user)
    db.flush()  # get user_id

    center = Center(
        user_id=user.user_id,
        name=request.name,
        logo_url=request.logo_url,
        wallet_balance=0,
        wallet_deposited=0,
        wallet_used=0,
        vip_purchase_count=0,
        discount_rate=0,
        is_active=True,
    )
    db.add(center)
    db.commit()
    db.refresh(center)

    return {
        "message": "Đã tạo tài khoản trung tâm",
        "center_id": center.center_id,
        "user_id": user.user_id,
        "name": center.name,
        "username": user.username,
    }


def _center_of(user: User, db: Session) -> Center:
    center = db.query(Center).filter(Center.user_id == user.user_id).first()
    if not center:
        raise HTTPException(status_code=404, detail="Không tìm thấy trung tâm cho tài khoản này")
    return center


@router.get("/center/me", response_model=dict)
async def get_my_center(
    current_center: User = Depends(get_current_center),
    db: Session = Depends(get_db),
):
    """Center's own profile + wallet summary + current discount tier."""
    center = _center_of(current_center, db)
    # Keep the cached discount_rate honest with the count on read.
    next_discount = compute_discount_rate(center.vip_purchase_count)
    return {
        "center_id": center.center_id,
        "name": center.name,
        "logo_url": center.logo_url,
        "wallet": {
            "balance": center.wallet_balance,
            "deposited": center.wallet_deposited,
            "used": center.wallet_used,
        },
        "vip_purchase_count": center.vip_purchase_count,
        "discount_rate": next_discount,   # applies to the next VIP purchase
        "is_active": center.is_active,
        "created_at": center.created_at,
    }
