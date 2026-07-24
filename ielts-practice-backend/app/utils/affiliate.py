"""Affiliate / referral helpers.

Commission = 10% of the actual amount paid for a VIP PackageTransaction, credited
as "xu" (1 xu = 1 VND) to the referrer's wallet, PERMANENTLY (every purchase by a
referred user). Credit is idempotent via the unique AffiliateWalletTx.
source_transaction_id, so neither the PayOS webhook nor the admin-confirm path can
double-pay. All functions are best-effort and never raise into the payment flow.
"""
import random
import string

from app.models.models import User, AffiliateWalletTx

COMMISSION_RATE = 0.10
WITHDRAW_MIN_XU = 300_000
_ALPHABET = string.ascii_uppercase + string.digits


def generate_referral_code(db, length: int = 8) -> str:
    for _ in range(20):
        code = ''.join(random.choices(_ALPHABET, k=length))
        if not db.query(User).filter(User.referral_code == code).first():
            return code
    return ''.join(random.choices(_ALPHABET, k=length + 4))


def ensure_referral_code(db, user: User) -> str:
    """Assign a referral code to a user if they don't have one yet (does not commit)."""
    if not user.referral_code:
        user.referral_code = generate_referral_code(db)
    return user.referral_code


def credit_referral_commission(db, transaction) -> bool:
    """Idempotently credit the buyer's referrer 10% of transaction.amount as xu.
    Does NOT commit — the caller's own db.commit() persists it. Returns True only
    when a new commission ledger row was added."""
    try:
        if not transaction or transaction.amount is None:
            return False
        buyer = db.query(User).filter(User.user_id == transaction.user_id).first()
        if not buyer or not buyer.referred_by or buyer.referred_by == buyer.user_id:
            return False
        # Already credited for this transaction? (also protected by a unique index)
        existing = db.query(AffiliateWalletTx).filter(
            AffiliateWalletTx.source_transaction_id == transaction.transaction_id).first()
        if existing:
            return False
        referrer = db.query(User).filter(User.user_id == buyer.referred_by).first()
        if not referrer:
            return False
        commission = int(round(float(transaction.amount) * COMMISSION_RATE))
        if commission <= 0:
            return False
        referrer.affiliate_balance = (referrer.affiliate_balance or 0) + commission
        db.add(AffiliateWalletTx(
            user_id=referrer.user_id,
            type='commission',
            amount=commission,
            balance_after=referrer.affiliate_balance,
            description=f"Hoa hồng từ đơn VIP #{transaction.transaction_id}",
            source_user_id=buyer.user_id,
            source_transaction_id=transaction.transaction_id,
        ))
        return True
    except Exception:
        return False
