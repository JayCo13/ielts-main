from fastapi import APIRouter, Depends, HTTPException, status, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import PackageTransaction, VIPSubscription, User, VIPPackage
from app.routes.admin.auth import get_current_admin
from datetime import datetime
from typing import List
from sqlalchemy.orm import joinedload
from sqlalchemy import func, case
from pydantic import BaseModel

router = APIRouter()
class TransactionUpdate(BaseModel):
    status: str
    admin_note: str | None = None

@router.post("/packages", response_model=dict)
async def create_vip_package(
    name: str,
    duration_months: int,
    price: float,
    package_type: str,
    skill_type: str = None,
    description: str = None,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Validate package type
    if package_type not in ['all_skills', 'single_skill']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Package type must be 'all_skills' or 'single_skill'"
        )
    
    # Validate skill type for single skill packages
    if package_type == 'single_skill':
        if skill_type not in ['reading', 'writing', 'listening']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Skill type must be 'reading', 'writing', or 'listening'"
            )
    
    package = VIPPackage(
        name=name,
        duration_months=duration_months,
        price=price,
        package_type=package_type,
        skill_type=skill_type,
        description=description,
        is_active=True,
        created_at=datetime.utcnow()
    )
    db.add(package)
    db.commit()
    db.refresh(package)
    return {"message": "VIP package created successfully", "package_id": package.package_id}

@router.get("/packages", response_model=List[dict])
async def get_all_packages(
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    packages = db.query(VIPPackage).all()
    return [
        {
            "package_id": p.package_id,
            "name": p.name,
            "duration_months": p.duration_months,
            "package_type": p.package_type,
            "price": p.price,
            "description": p.description,
            "is_active": p.is_active,
            "created_at": p.created_at
        } for p in packages
    ]

@router.put("/packages/{package_id}", response_model=dict)
async def update_package(
    package_id: int,
    name: str = None,
    price: float = None,
    description: str = None,
    is_active: bool = None,
    package_type: str = None,
    skill_type: str = None,
    duration_months: int = None,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    package = db.query(VIPPackage).filter(VIPPackage.package_id == package_id).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Validate package type if provided
    if package_type is not None:
        if package_type not in ['all_skills', 'single_skill']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Package type must be 'all_skills' or 'single_skill'"
            )
        package.package_type = package_type
        
        # Validate skill type for single skill packages
        if package_type == 'single_skill':
            if skill_type not in ['reading', 'writing', 'listening']:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Skill type must be 'reading', 'writing', or 'listening'"
                )
            package.skill_type = skill_type
        else:
            package.skill_type = None
    
    if name is not None:
        package.name = name
    if price is not None:
        package.price = price
    if description is not None:
        package.description = description
    if is_active is not None:
        package.is_active = is_active
    if duration_months is not None:
        package.duration_months = duration_months
    
    db.commit()
    return {"message": "Package updated successfully"}

@router.get("/subscriptions", response_model=List[dict])
async def get_all_subscriptions(
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Eager load related user and package data to avoid N+1 queries
    subscriptions = db.query(VIPSubscription).options(
        joinedload(VIPSubscription.user),
        joinedload(VIPSubscription.package)
    ).all()
    
    result = []
    for s in subscriptions:
        package_info = {
            "package_id": s.package.package_id,
            "name": s.package.name,
            "duration_months": s.package.duration_months,
            "price": s.package.price,
            "package_type": s.package.package_type,
            "skill_type": s.package.skill_type,
            "description": s.package.description
        }
        
        result.append({
            "subscription_id": s.subscription_id,
            "user_id": s.user_id,
            "user_email": s.user.email, # Access user email via relationship
            "package": package_info, # Include the detailed package info object
            "start_date": s.start_date,
            "end_date": s.end_date,
            "payment_status": s.payment_status,
            "created_at": s.created_at # Optionally add creation date
        })
        
    return result
@router.get("/transactions/pending", response_model=List[dict])
async def get_pending_transactions(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all pending transactions"""
    transactions = db.query(PackageTransaction).filter(
        PackageTransaction.status == "pending"
    ).order_by(PackageTransaction.created_at.desc()).all()
    
    return [{
        "transaction_id": tx.transaction_id,
        "user_email": tx.user.email,
        "package_name": tx.package.name,
        "amount": tx.amount,
        "payment_method": tx.payment_method,
        "bank_description": tx.bank_description,
        "transaction_code": tx.transaction_code,
        "bank_transfer_image": tx.bank_transfer_image,
        "created_at": tx.created_at
    } for tx in transactions]

@router.put("/transactions/{transaction_id}", response_model=dict)
async def update_transaction_status(
    transaction_id: int,
    transaction_status: str = Form(...),  # Changed from status to transaction_status
    admin_note: str = Form(None),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update transaction status"""
    # Validate status value
    if transaction_status not in ["pending", "completed", "reject"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status value. Must be 'pending', 'completed', or 'reject'"
        )
    
    transaction = db.query(PackageTransaction).filter(
        PackageTransaction.transaction_id == transaction_id
    ).first()
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    transaction.status = transaction_status
    transaction.admin_note = admin_note
    
    if transaction_status == "completed":
        # Update subscription status
        subscription = db.query(VIPSubscription).filter(
            VIPSubscription.subscription_id == transaction.subscription_id
        ).first()
        
        if subscription:
            subscription.payment_status = "completed"
            
            # Update user VIP status
            user = db.query(User).filter(User.user_id == transaction.user_id).first()
            if user:
                user.is_vip = True
                user.vip_expiry = subscription.end_date
    elif transaction_status == "reject":
        # Update subscription status when rejected
        subscription = db.query(VIPSubscription).filter(
            VIPSubscription.subscription_id == transaction.subscription_id
        ).first()
        
        if subscription:
            subscription.payment_status = "reject"
    
    db.commit()
    
    return {
        "message": "Transaction status updated successfully",
        "transaction_id": transaction_id,
        "new_status": transaction_status
    }


@router.get("/dashboard/packages", response_model=dict)
async def get_packages_dashboard(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get package statistics for dashboard"""
    # Get total packages
    total_packages = db.query(VIPPackage).count()
    active_packages = db.query(VIPPackage).filter(VIPPackage.is_active == True).count()
    
    # Get subscription statistics
    total_subscriptions = db.query(VIPSubscription).count()
    active_subscriptions = db.query(VIPSubscription).filter(
        VIPSubscription.end_date > datetime.utcnow(),
        VIPSubscription.payment_status == "completed"
    ).count()
    
    # Get package-wise subscription counts
    package_stats = db.query(
        VIPPackage.package_id,
        VIPPackage.name,
        VIPPackage.price,
        func.count(VIPSubscription.subscription_id).label('total_subscriptions'),
        func.sum(
            case(
                (VIPSubscription.payment_status == 'completed', 1),
                else_=0
            )
        ).label('paid_subscriptions')
    ).outerjoin(VIPSubscription).group_by(VIPPackage.package_id).all()
    
    # Get recent transactions
    recent_transactions = db.query(PackageTransaction).order_by(
        PackageTransaction.created_at.desc()
    ).limit(5).all()
    
    return {
        "summary": {
            "total_packages": total_packages,
            "active_packages": active_packages,
            "total_subscriptions": total_subscriptions,
            "active_subscriptions": active_subscriptions
        },
        "package_statistics": [{
            "package_id": stat.package_id,
            "name": stat.name,
            "price": float(stat.price),
            "total_subscriptions": stat.total_subscriptions,
            "paid_subscriptions": stat.paid_subscriptions or 0,
            "revenue": float(stat.paid_subscriptions or 0) * float(stat.price)
        } for stat in package_stats],
        "recent_transactions": [{
            "transaction_id": tx.transaction_id,
            "user_email": tx.user.email,
            "package_name": tx.package.name,
            "amount": float(tx.amount),
            "status": tx.status,
            "created_at": tx.created_at
        } for tx in recent_transactions]
    }

# Add after existing endpoints

@router.get("/dashboard/revenue", response_model=dict)
async def get_total_revenue(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get total revenue from completed transactions"""
    # Calculate total revenue
    total_revenue = db.query(func.sum(PackageTransaction.amount)).filter(
        PackageTransaction.status == "completed"
    ).scalar() or 0
    
    # Get monthly revenue for current year
    current_year = datetime.utcnow().year
    monthly_revenue = db.query(
        func.extract('month', PackageTransaction.created_at).label('month'),
        func.sum(PackageTransaction.amount).label('revenue')
    ).filter(
        PackageTransaction.status == "completed",
        func.extract('year', PackageTransaction.created_at) == current_year
    ).group_by(
        func.extract('month', PackageTransaction.created_at)
    ).all()
    
    return {
        "total_revenue": float(total_revenue),
        "monthly_revenue": [{
            "month": int(month),
            "revenue": float(revenue)
        } for month, revenue in monthly_revenue]
    }