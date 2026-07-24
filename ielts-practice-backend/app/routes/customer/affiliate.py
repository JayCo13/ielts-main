"""Customer-facing affiliate endpoints (Trang cá nhân → Affiliate).

Each customer sees their referral link, signup count, total commission earned,
wallet balance (xu) + history, and can request a bank withdrawal (≥ 300,000 xu).
"""
import os
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
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


class WithdrawRequest(BaseModel):
    account_holder: str
    account_number: str
    bank: str
    amount: Optional[int] = None  # xu; default = full balance


@router.post("/withdraw")
async def request_withdraw(
    payload: WithdrawRequest,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_student),
):
    balance = current.affiliate_balance or 0
    if balance < WITHDRAW_MIN_XU:
        raise HTTPException(status_code=400, detail=f"Số dư tối thiểu để rút là {WITHDRAW_MIN_XU:,} xu")
    amount = payload.amount if payload.amount and payload.amount > 0 else balance
    if amount < WITHDRAW_MIN_XU:
        raise HTTPException(status_code=400, detail=f"Số tiền rút tối thiểu là {WITHDRAW_MIN_XU:,} xu")
    if amount > balance:
        raise HTTPException(status_code=400, detail="Số tiền rút vượt quá số dư")
    if not payload.account_holder.strip() or not payload.account_number.strip() or not payload.bank.strip():
        raise HTTPException(status_code=400, detail="Vui lòng nhập đủ thông tin tài khoản nhận")

    # Deduct immediately; refunded if the admin later rejects.
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
        account_holder=payload.account_holder.strip(),
        account_number=payload.account_number.strip(),
        bank=payload.bank.strip(),
        status="pending",
    )
    db.add(w)
    db.commit()
    db.refresh(w)
    return {"ok": True, "withdrawal_id": w.withdrawal_id, "status": w.status, "balance": current.affiliate_balance}
