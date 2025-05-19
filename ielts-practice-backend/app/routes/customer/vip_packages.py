from fastapi import APIRouter, Depends, HTTPException, status, Form, File, UploadFile, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import VIPPackage, VIPSubscription, User, PackageTransaction
from app.routes.admin.auth import get_current_student
from datetime import datetime, timedelta
from typing import List
from pydantic import BaseModel
import os
from uuid import uuid4
router = APIRouter()

class PackageResponse(BaseModel):
    package_id: int
    name: str
    duration_months: int
    price: float
    description: str | None

@router.get("/packages/available", response_model=List[PackageResponse])
async def get_available_packages(
    skill_type: str = None,
    db: Session = Depends(get_db)
):
    """Get all available VIP packages (public endpoint)"""
    query = db.query(VIPPackage).filter(VIPPackage.is_active == True)
    
    if skill_type:
        if skill_type not in ['reading', 'writing', 'listening', 'all']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid skill type"
            )
        if skill_type == 'all':
            query = query.filter(VIPPackage.package_type == 'all_skills')
        else:
            query = query.filter(
                (VIPPackage.package_type == 'single_skill') & 
                (VIPPackage.skill_type == skill_type)
            )
    
    packages = query.all()
    
    return [{
        "package_id": pkg.package_id,
        "name": pkg.name,
        "duration_months": pkg.duration_months,
        "price": pkg.price,
        "description": pkg.description,
        "package_type": pkg.package_type,
        "skill_type": pkg.skill_type
    } for pkg in packages]

@router.get("/subscription/status", response_model=dict)
async def get_subscription_status(
    current_user: User = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """Get current user's VIP subscription status"""
    active_subscription = db.query(VIPSubscription).filter(
        VIPSubscription.user_id == current_user.user_id,
        VIPSubscription.end_date > datetime.utcnow(),
        VIPSubscription.payment_status == "completed"
    ).first()
    
    if active_subscription:
        return {
            "is_subscribed": True,
            "subscription_id": active_subscription.subscription_id,
            "package_name": active_subscription.package.name,
            "package_type": active_subscription.package.package_type,
            "skill_type": active_subscription.package.skill_type,
            "start_date": active_subscription.start_date,
            "end_date": active_subscription.end_date,
            "days_remaining": (active_subscription.end_date - datetime.utcnow()).days
        }
    
    return {
        "is_subscribed": False,
        "message": "No active VIP subscription"
    }


@router.post("/packages/{package_id}/purchase", response_model=dict)
async def purchase_package(
    package_id: int,
    request: Request,
    payment_method: str = Form(...),
    bank_description: str = Form(...),
    transaction_code: str = Form(...),  # Add new parameter
    bank_transfer_image: UploadFile = File(None),
    current_user: User = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    package = db.query(VIPPackage).filter(
        VIPPackage.package_id == package_id,
        VIPPackage.is_active == True
    ).first()
    
    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Package not found or not available"
        )
    
    # Check for existing active subscription
    active_subscription = db.query(VIPSubscription).filter(
        VIPSubscription.user_id == current_user.user_id,
        VIPSubscription.end_date > datetime.utcnow(),
        VIPSubscription.payment_status == "completed"
    ).first()
    
    if active_subscription:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active subscription"
        )
    
    # Check if transaction code already exists
    existing_transaction = db.query(PackageTransaction).filter(
        PackageTransaction.transaction_code == transaction_code
    ).first()
    
    if existing_transaction:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transaction code already exists"
        )
    
    # Create subscription record
    start_date = datetime.utcnow()
    end_date = start_date + timedelta(days=package.duration_months * 30)
    
    subscription = VIPSubscription(
        user_id=current_user.user_id,
        package_id=package_id,
        start_date=start_date,
        end_date=end_date,
        payment_status="pending",
        created_at=datetime.utcnow()
    )
    
    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    
    # Save bank transfer image if provided
    image_url = None
    if bank_transfer_image:
        # Create payments directory if it doesn't exist
        os.makedirs("static/payments", exist_ok=True)
        
        file_extension = os.path.splitext(bank_transfer_image.filename)[1]
        unique_filename = f"{uuid4()}{file_extension}"
        file_path = os.path.join("static/payments", unique_filename)
        
        with open(file_path, "wb") as buffer:
            content = await bank_transfer_image.read()
            buffer.write(content)
        
        image_url = f"/static/payments/{unique_filename}"
    
    # Create transaction record with transaction code
    transaction = PackageTransaction(
        user_id=current_user.user_id,
        package_id=package_id,
        subscription_id=subscription.subscription_id,
        amount=package.price,
        bank_description=bank_description,
        payment_method=payment_method,
        transaction_code=transaction_code,  # Add transaction code
        bank_transfer_image=image_url,
        status="pending",
        created_at=datetime.utcnow()
    )
    
    db.add(transaction)
    db.commit()
    
    return {
        "message": "Payment request submitted successfully. Waiting for admin approval.",
        "transaction_id": transaction.transaction_id,
        "transaction_code": transaction_code,
        "status": "pending"
    }

@router.get("/subscription/history", response_model=List[dict])
async def get_subscription_history(
    current_user: User = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """Get user's VIP subscription history"""
    subscriptions = db.query(VIPSubscription).filter(
        VIPSubscription.user_id == current_user.user_id
    ).order_by(VIPSubscription.created_at.desc()).all()
    
    return [{
        "subscription_id": sub.subscription_id,
        "package_name": sub.package.name,
        "start_date": sub.start_date,
        "end_date": sub.end_date,
        "payment_status": sub.payment_status,
        "is_active": sub.end_date > datetime.utcnow() and sub.payment_status == "completed"
    } for sub in subscriptions]


@router.get("/transactions/{transaction_id}/status", response_model=dict)
async def get_transaction_status(
    transaction_id: int,
    current_user: User = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """Get detailed transaction status"""
    transaction = db.query(PackageTransaction).filter(
        PackageTransaction.transaction_id == transaction_id,
        PackageTransaction.user_id == current_user.user_id
    ).first()
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    waiting_time = (datetime.utcnow() - transaction.created_at).total_seconds() // 60  # minutes
    
    return {
        "transaction_id": transaction.transaction_id,
        "status": transaction.status,
        "admin_note": transaction.admin_note,
        "created_at": transaction.created_at,
        "package_name": transaction.package.name,
        "amount": float(transaction.amount),
        "payment_method": transaction.payment_method,
        "bank_description": transaction.bank_description,
        "bank_transfer_image": transaction.bank_transfer_image,
        "waiting_time_minutes": waiting_time,
        "subscription_status": transaction.subscription.payment_status if transaction.subscription else None,
        "is_completed": transaction.status == "completed",
        "last_updated": transaction.created_at  # Changed from updated_at to created_at
    }

@router.get("/remaining-days", response_model=dict)
async def get_vip_remaining_days(
    current_user: User = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """Get the remaining days of the user's VIP subscription"""
    active_subscription = db.query(VIPSubscription).filter(
        VIPSubscription.user_id == current_user.user_id,
        VIPSubscription.end_date > datetime.utcnow(),
        VIPSubscription.payment_status == "completed"
    ).first()
    
    if not active_subscription:
        return {
            "has_active_subscription": False,
            "remaining_days": 0,
            "message": "No active VIP subscription found"
        }
    
    remaining_days = (active_subscription.end_date - datetime.utcnow()).days
    
    return {
        "has_active_subscription": True,
        "remaining_days": remaining_days,
        "end_date": active_subscription.end_date,
        "package_name": active_subscription.package.name
    }
