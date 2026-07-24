"""Customer-facing affiliate endpoints (Trang cá nhân → Affiliate).

Each customer sees their referral link, signup count, total commission earned,
wallet balance (xu) + history, and can request a bank withdrawal (≥ 300,000 xu).
"""
import os
import uuid
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User, AffiliateWalletTx, AffiliateWithdrawal
from app.routes.admin.auth import get_current_student
from app.utils.affiliate import ensure_referral_code, WITHDRAW_MIN_XU
from app.utils.datetime_utils import get_vietnam_time

router = APIRouter()

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://thiieltstrenmay.com").rstrip("/")


def _notify_admin_withdrawal(username: str, email: str, amount: int, bank: str, account_number: str, account_holder: str, has_qr: bool):
    """Best-effort email to the admin inbox when a withdrawal is requested."""
    try:
        from app.utils.email_utils import send_email, EMAIL_FROM, EMAIL_USERNAME
        from app.utils.email_templates import render_email, paragraph
        to = os.getenv("ADMIN_NOTIFY_EMAIL") or EMAIL_FROM or EMAIL_USERNAME
        if not to:
            return
        body = (
            paragraph(f"Có yêu cầu <b>rút tiền hoa hồng Affiliate</b> mới.")
            + paragraph(f"Tài khoản: <b>{username}</b> ({email or '—'})")
            + paragraph(f"Số tiền: <b>{amount:,} xu</b> (= {amount:,}đ)")
            + paragraph(f"Nhận qua: {'QR + ' if has_qr else ''}{bank or '—'} · {account_number or '—'} · {account_holder or '—'}")
            + paragraph("Vào trang Admin → Affiliate để xem chi tiết và xử lý.")
        )
        send_email(to, "Yêu cầu rút tiền Affiliate mới", render_email("Yêu cầu rút tiền Affiliate", body))
    except Exception:
        pass


def _now():
    return get_vietnam_time().replace(tzinfo=None)


@router.get("")
@router.get("/")
async def get_affiliate(db: Session = Depends(get_db), current: User = Depends(get_current_student)):
    # Lazily assign a referral code to legacy accounts that don't have one.
    if not current.referral_code:
        ensure_referral_code(db, current)
        db.commit()
        db.refresh(current)

    signup_count = db.query(func.count(User.user_id)).filter(User.referred_by == current.user_id).scalar() or 0
    total_commission = db.query(func.coalesce(func.sum(AffiliateWalletTx.amount), 0)).filter(
        AffiliateWalletTx.user_id == current.user_id,
        AffiliateWalletTx.type == "commission",
    ).scalar() or 0
    balance = current.affiliate_balance or 0
    return {
        "referral_code": current.referral_code,
        "referral_link": f"{FRONTEND_URL}/register?ref={current.referral_code}",
        "signup_count": int(signup_count),
        "total_commission": int(total_commission),
        "balance": int(balance),
        "withdraw_min": WITHDRAW_MIN_XU,
        "can_withdraw": int(balance) >= WITHDRAW_MIN_XU,
    }


@router.get("/history")
async def affiliate_history(db: Session = Depends(get_db), current: User = Depends(get_current_student)):
    rows = (
        db.query(AffiliateWalletTx)
        .filter(AffiliateWalletTx.user_id == current.user_id)
        .order_by(AffiliateWalletTx.id.desc())
        .limit(200)
        .all()
    )
    return [
        {
            "id": r.id,
            "type": r.type,
            "amount": r.amount,
            "balance_after": r.balance_after,
            "description": r.description,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.get("/withdrawals")
async def my_withdrawals(db: Session = Depends(get_db), current: User = Depends(get_current_student)):
    rows = (
        db.query(AffiliateWithdrawal)
        .filter(AffiliateWithdrawal.user_id == current.user_id)
        .order_by(AffiliateWithdrawal.withdrawal_id.desc())
        .all()
    )
    return [
        {
            "withdrawal_id": w.withdrawal_id,
            "amount": w.amount,
            "status": w.status,
            "bank": w.bank,
            "account_number": w.account_number,
            "account_holder": w.account_holder,
            "created_at": w.created_at.isoformat() if w.created_at else None,
            "processed_at": w.processed_at.isoformat() if w.processed_at else None,
        }
        for w in rows
    ]


# ── payout method (Payment page) ─────────────────────────────────────────────

PAYOUT_QR_DIR = "static/affiliate_qr"


def _has_payout(user: User) -> bool:
    """User can withdraw once they've provided a QR image OR full bank details."""
    has_bank = bool((user.payout_bank or "").strip() and (user.payout_account_number or "").strip()
                    and (user.payout_account_holder or "").strip())
    return bool(user.payout_qr_url) or has_bank


@router.get("/payment")
async def get_payment(current: User = Depends(get_current_student)):
    return {
        "qr_url": current.payout_qr_url,
        "bank": current.payout_bank,
        "account_number": current.payout_account_number,
        "account_holder": current.payout_account_holder,
        "is_set": _has_payout(current),
    }


class PaymentInfo(BaseModel):
    bank: Optional[str] = None
    account_number: Optional[str] = None
    account_holder: Optional[str] = None


@router.put("/payment")
async def set_payment(
    payload: PaymentInfo,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_student),
):
    current.payout_bank = (payload.bank or "").strip() or None
    current.payout_account_number = (payload.account_number or "").strip() or None
    current.payout_account_holder = (payload.account_holder or "").strip() or None
    db.commit()
    return {"ok": True, "is_set": _has_payout(current)}


@router.post("/payment/qr")
async def upload_payout_qr(
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_student),
):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File phải là ảnh")
    os.makedirs(PAYOUT_QR_DIR, exist_ok=True)
    ext = os.path.splitext(image.filename or "")[1] or ".png"
    fname = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(PAYOUT_QR_DIR, fname)
    with open(path, "wb") as f:
        f.write(await image.read())
    current.payout_qr_url = f"/{PAYOUT_QR_DIR}/{fname}"
    db.commit()
    return {"ok": True, "qr_url": current.payout_qr_url}


@router.delete("/payment/qr")
async def delete_payout_qr(db: Session = Depends(get_db), current: User = Depends(get_current_student)):
    current.payout_qr_url = None
    db.commit()
    return {"ok": True}


# ── withdrawal ───────────────────────────────────────────────────────────────

class WithdrawRequest(BaseModel):
    amount: Optional[int] = None  # xu; default = full balance


@router.post("/withdraw")
async def request_withdraw(
    payload: WithdrawRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_student),
):
    balance = current.affiliate_balance or 0
    if balance < WITHDRAW_MIN_XU:
        raise HTTPException(status_code=400, detail=f"Số dư tối thiểu để rút là {WITHDRAW_MIN_XU:,} xu")
    if not _has_payout(current):
        raise HTTPException(status_code=400, detail="Vui lòng cập nhật Thông tin thanh toán (QR hoặc tài khoản ngân hàng) trước khi rút")
    amount = payload.amount if payload.amount and payload.amount > 0 else balance
    if amount < WITHDRAW_MIN_XU:
        raise HTTPException(status_code=400, detail=f"Số tiền rút tối thiểu là {WITHDRAW_MIN_XU:,} xu")
    if amount > balance:
        raise HTTPException(status_code=400, detail="Số tiền rút vượt quá số dư")

    # Deduct immediately; refunded if the admin later rejects. Snapshot the saved
    # payout method (QR + bank) so the admin can just scan and transfer.
    current.affiliate_balance = balance - amount
    db.add(AffiliateWalletTx(
        user_id=current.user_id,
        type="withdraw",
        amount=-amount,
        balance_after=current.affiliate_balance,
        description="Yêu cầu rút tiền",
    ))
    w = AffiliateWithdrawal(
        user_id=current.user_id,
        amount=amount,
        account_holder=current.payout_account_holder,
        account_number=current.payout_account_number,
        bank=current.payout_bank,
        qr_url=current.payout_qr_url,
        status="pending",
    )
    db.add(w)
    db.commit()
    db.refresh(w)

    # Notify the admin by email (after the response, non-blocking).
    background_tasks.add_task(
        _notify_admin_withdrawal, current.username, current.email, int(amount),
        current.payout_bank, current.payout_account_number, current.payout_account_holder,
        bool(current.payout_qr_url),
    )
    return {"ok": True, "withdrawal_id": w.withdrawal_id, "status": w.status, "balance": current.affiliate_balance}
