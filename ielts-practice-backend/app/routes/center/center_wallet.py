"""Center (Trung tâm) — P2: wallet (PayOS top-up) + VIP purchasing.

Flow:
  - The center tops up its wallet via PayOS (POST /center/wallet/deposit → a
    pending CenterWalletTransaction + a PayOS checkout link). The shared PayOS
    webhook credits the wallet on success.
  - The center then buys VIP for a teacher/student FROM the wallet
    (POST /center/vip/purchase), paying a tiered-discounted price and having the
    VIP granted directly (no second payment). Each purchase increments the
    center's cumulative count, which drives the 0/5/10% discount tier.
"""
import time
from datetime import timedelta
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional

from app.database import get_db
from app.models.models import (
    User, Center, VIPPackage, VIPSubscription, CenterWalletTransaction,
)
from app.routes.admin.auth import get_current_center
from app.routes.center.center_actions import _center_of, compute_discount_rate
from app.routes.center.center_management import _membership_or_404
from app.utils.payos_service import create_payment_link
from app.utils.datetime_utils import get_vietnam_time

router = APIRouter()


def _now():
    return get_vietnam_time().replace(tzinfo=None)


# ── wallet top-up via PayOS ──────────────────────────────────────────────────

class DepositRequest(BaseModel):
    amount: int = Field(..., ge=10000)   # VND, min 10k
    origin: Optional[str] = None         # caller's site origin, to return to after PayOS


def _return_urls(origin: Optional[str]):
    """Build PayOS return/cancel URLs on the CENTER site (so cancelling returns
    to the center dashboard, not the student site). Only trust an origin whose
    host is thiieltstrenmay.com or a subdomain of it."""
    base = "https://trungtam.thiieltstrenmay.com"
    if origin:
        try:
            host = (urlparse(origin).hostname or "").lower()
            if host == "thiieltstrenmay.com" or host.endswith(".thiieltstrenmay.com"):
                base = origin.rstrip("/")
        except Exception:
            pass
    return f"{base}/wallet?deposit=success", f"{base}/wallet?deposit=cancel"


@router.post("/center/wallet/deposit", response_model=dict)
async def deposit(request: DepositRequest,
                 current_center: User = Depends(get_current_center),
                 db: Session = Depends(get_db)):
    center = _center_of(current_center, db)

    txn = CenterWalletTransaction(
        center_id=center.center_id,
        type="deposit",
        amount=request.amount,
        method="payos",
        status="pending",
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)

    # Globally-unique PayOS order code (PayOS enforces uniqueness per merchant).
    order_code = int(f"{int(time.time())}{txn.transaction_id}")
    txn.payos_order_code = order_code
    db.commit()

    try:
        return_url, cancel_url = _return_urls(request.origin)
        payos_response = create_payment_link(
            order_code=order_code,
            amount=int(request.amount),
            description="Nap vi trung tam",
            return_url=return_url,
            cancel_url=cancel_url,
        )
        txn.payos_checkout_url = payos_response.checkout_url
        db.commit()
        return {
            "message": "Đã tạo link nạp tiền",
            "transaction_id": txn.transaction_id,
            "checkoutUrl": payos_response.checkout_url,
            "status": "pending",
        }
    except Exception as e:
        db.delete(txn)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Không tạo được link thanh toán: {e}")


@router.get("/center/wallet/transactions", response_model=List[dict])
async def wallet_transactions(current_center: User = Depends(get_current_center),
                             db: Session = Depends(get_db)):
    center = _center_of(current_center, db)
    rows = (
        db.query(CenterWalletTransaction)
        .filter(CenterWalletTransaction.center_id == center.center_id)
        .order_by(CenterWalletTransaction.created_at.desc())
        .all()
    )
    out = []
    for t in rows:
        target = db.query(User).filter(User.user_id == t.target_user_id).first() if t.target_user_id else None
        out.append({
            "transaction_id": t.transaction_id,
            "type": t.type,
            "amount": t.amount,
            "method": t.method,
            "status": t.status,
            "target_username": target.username if target else None,
            "discount_rate": t.discount_rate,
            "note": t.note,
            "created_at": t.created_at,
        })
    return out


# ── VIP packages (with this center's discount applied) ───────────────────────

@router.get("/center/vip/packages", response_model=List[dict])
async def list_packages(current_center: User = Depends(get_current_center),
                       db: Session = Depends(get_db)):
    center = _center_of(current_center, db)
    rate = compute_discount_rate(center.vip_purchase_count)
    packages = db.query(VIPPackage).filter(VIPPackage.is_active == True).all()
    return [{
        "package_id": p.package_id,
        "name": p.name,
        "duration_months": p.duration_months,
        "price": p.price,
        "discounted_price": round(p.price * (1 - rate / 100)),
        "discount_rate": rate,
        "package_type": p.package_type,
        "skill_type": p.skill_type,
    } for p in packages]


# ── buy VIP for a member, paid from the wallet ───────────────────────────────

class PurchaseVIPRequest(BaseModel):
    target_user_id: int
    package_id: int


def _grant_vip(db: Session, target: User, package: VIPPackage):
    """Create a completed VIPSubscription (stacking onto any active one) and
    bump the user's is_vip/vip_expiry — the no-payment grant path."""
    now = _now()
    if package.package_type == "single_skill":
        active = db.query(VIPSubscription).join(VIPPackage).filter(
            VIPSubscription.user_id == target.user_id,
            VIPSubscription.end_date > now,
            VIPSubscription.payment_status == "completed",
            ((VIPPackage.package_type == "single_skill") & (VIPPackage.skill_type == package.skill_type)) |
            (VIPPackage.package_type == "all_skills")
        ).order_by(VIPSubscription.end_date.desc()).first()
    else:
        active = db.query(VIPSubscription).join(VIPPackage).filter(
            VIPSubscription.user_id == target.user_id,
            VIPSubscription.end_date > now,
            VIPSubscription.payment_status == "completed",
            VIPPackage.package_type == "all_skills"
        ).order_by(VIPSubscription.end_date.desc()).first()

    start = active.end_date if active else now
    end = start + timedelta(days=package.duration_months * 30)
    sub = VIPSubscription(
        user_id=target.user_id,
        package_id=package.package_id,
        start_date=start,
        end_date=end,
        payment_status="completed",
        created_at=now,
    )
    db.add(sub)
    db.flush()
    target.is_vip = True
    if target.vip_expiry is None or end > target.vip_expiry:
        target.vip_expiry = end
    return sub, end


@router.post("/center/vip/purchase", response_model=dict)
async def purchase_vip(request: PurchaseVIPRequest,
                      current_center: User = Depends(get_current_center),
                      db: Session = Depends(get_db)):
    center = _center_of(current_center, db)
    membership = _membership_or_404(db, center, request.target_user_id)  # teacher or student of this center
    target = membership.user

    package = db.query(VIPPackage).filter(
        VIPPackage.package_id == request.package_id,
        VIPPackage.is_active == True,
    ).first()
    if not package:
        raise HTTPException(status_code=404, detail="Không tìm thấy gói VIP")

    rate = compute_discount_rate(center.vip_purchase_count)
    price = round(package.price * (1 - rate / 100))

    if center.wallet_balance < price:
        raise HTTPException(status_code=400, detail="Số dư ví không đủ, vui lòng nạp thêm")

    # Deduct from wallet
    center.wallet_balance -= price
    center.wallet_used += price

    # Grant VIP
    sub, end = _grant_vip(db, target, package)

    # Advance the discount tier
    center.vip_purchase_count += 1
    center.discount_rate = compute_discount_rate(center.vip_purchase_count)

    # Ledger entry
    txn = CenterWalletTransaction(
        center_id=center.center_id,
        type="vip_purchase",
        amount=price,
        method="wallet",
        status="completed",
        target_user_id=target.user_id,
        package_id=package.package_id,
        discount_rate=rate,
        note=f"VIP {package.name} cho {target.username}",
    )
    db.add(txn)
    db.commit()

    return {
        "message": "Đã mua VIP thành công",
        "target_user_id": target.user_id,
        "target_username": target.username,
        "package": package.name,
        "price": price,
        "discount_rate": rate,
        "vip_expiry": end,
        "wallet_balance": center.wallet_balance,
        "vip_purchase_count": center.vip_purchase_count,
        "next_discount_rate": center.discount_rate,
    }
