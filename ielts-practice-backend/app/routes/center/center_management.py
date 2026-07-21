"""Center (Trung tâm) — P1: manage teachers, students and classrooms.

All endpoints are scoped to the currently authenticated center: a center can
only see/mutate its own members and classes. Teachers get role='teacher' and
center-students get role='customer' (no 90-day student window — access depends
purely on VIP the center buys in P2). Membership rows mark who belongs to the
center; class_members joins them into classrooms (a teacher may teach several
classes; a student has 0 or 1 class → 'khách lẻ' when none).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List

from app.database import get_db
from app.models.models import (
    User, Center, Classroom, CenterMembership, ClassMember,
)
from app.routes.admin.auth import get_current_center, pwd_context
from app.routes.center.center_actions import _center_of
from app.utils.datetime_utils import get_vietnam_time

router = APIRouter()


# ── helpers ──────────────────────────────────────────────────────────────────

def _now():
    return get_vietnam_time().replace(tzinfo=None)


def _vip_status(user: User) -> dict:
    """Derive VIP status from user.vip_expiry (what the center's VIP grant in P2
    will set)."""
    now = _now()
    if user.vip_expiry and user.vip_expiry > now:
        return {"is_vip": True, "remaining_days": (user.vip_expiry - now).days}
    return {"is_vip": False, "remaining_days": 0}


def _membership_or_404(db: Session, center: Center, user_id: int, member_type: Optional[str] = None) -> CenterMembership:
    q = db.query(CenterMembership).filter(
        CenterMembership.center_id == center.center_id,
        CenterMembership.user_id == user_id,
    )
    if member_type:
        q = q.filter(CenterMembership.member_type == member_type)
    m = q.first()
    if not m:
        raise HTTPException(status_code=404, detail="Không tìm thấy thành viên trong trung tâm này")
    return m


def _classes_of_user(db: Session, center: Center, user_id: int) -> List[dict]:
    rows = (
        db.query(Classroom)
        .join(ClassMember, ClassMember.class_id == Classroom.class_id)
        .filter(ClassMember.user_id == user_id, Classroom.center_id == center.center_id)
        .all()
    )
    return [{"class_id": c.class_id, "name": c.name} for c in rows]


def _sync_active(user: User, membership: CenterMembership):
    """A member can log in only when neither paused nor disabled."""
    user.is_active = not (membership.is_paused or membership.is_disabled)


def _member_dict(db: Session, center: Center, m: CenterMembership) -> dict:
    u = m.user
    return {
        "user_id": u.user_id,
        "username": u.username,
        "email": u.email,
        "image_url": u.image_url,
        "member_type": m.member_type,
        "classes": _classes_of_user(db, center, u.user_id),
        "vip": _vip_status(u),
        "is_paused": m.is_paused,
        "is_disabled": m.is_disabled,
        "created_at": m.created_at,
    }


# ── schemas ──────────────────────────────────────────────────────────────────

class CreateMemberRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    email: Optional[EmailStr] = None
    class_id: Optional[int] = None  # optionally assign to a class on creation


class UpdateMemberRequest(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    password: Optional[str] = Field(None, min_length=6)
    is_paused: Optional[bool] = None
    is_disabled: Optional[bool] = None


class ClassRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)


class ClassUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    is_active: Optional[bool] = None


class ClassMemberRequest(BaseModel):
    user_id: int


# ── member creation ──────────────────────────────────────────────────────────

def _create_member(request: CreateMemberRequest, role: str, member_type: str,
                   center: Center, db: Session) -> dict:
    if db.query(User).filter(User.username == request.username).first():
        raise HTTPException(status_code=400, detail="Tên đăng nhập đã tồn tại")
    if request.email and db.query(User).filter(User.email == request.email).first():
        raise HTTPException(status_code=400, detail="Email đã được sử dụng")

    user = User(
        username=request.username,
        email=request.email,
        password=pwd_context.hash(request.password),
        role=role,
        is_active=True,
        status="offline",
    )
    db.add(user)
    db.flush()

    membership = CenterMembership(
        center_id=center.center_id,
        user_id=user.user_id,
        member_type=member_type,
        is_paused=False,
        is_disabled=False,
    )
    db.add(membership)

    if request.class_id is not None:
        cls = db.query(Classroom).filter(
            Classroom.class_id == request.class_id,
            Classroom.center_id == center.center_id,
        ).first()
        if not cls:
            raise HTTPException(status_code=404, detail="Không tìm thấy lớp")
        db.add(ClassMember(class_id=cls.class_id, user_id=user.user_id))

    db.commit()
    db.refresh(membership)
    return _member_dict(db, center, membership)


@router.post("/center/teachers", response_model=dict)
async def create_teacher(request: CreateMemberRequest,
                        current_center: User = Depends(get_current_center),
                        db: Session = Depends(get_db)):
    center = _center_of(current_center, db)
    # Teachers are role='customer' (take tests like a VIP customer); the
    # member_type='teacher' membership is what marks them as a teacher.
    return _create_member(request, role="customer", member_type="teacher", center=center, db=db)


@router.post("/center/students", response_model=dict)
async def create_student(request: CreateMemberRequest,
                        current_center: User = Depends(get_current_center),
                        db: Session = Depends(get_db)):
    center = _center_of(current_center, db)
    return _create_member(request, role="customer", member_type="student", center=center, db=db)


# ── member listing ───────────────────────────────────────────────────────────

@router.get("/center/teachers", response_model=List[dict])
async def list_teachers(current_center: User = Depends(get_current_center),
                       db: Session = Depends(get_db)):
    center = _center_of(current_center, db)
    members = db.query(CenterMembership).filter(
        CenterMembership.center_id == center.center_id,
        CenterMembership.member_type == "teacher",
    ).all()
    return [_member_dict(db, center, m) for m in members]


@router.get("/center/students", response_model=List[dict])
async def list_students(current_center: User = Depends(get_current_center),
                       db: Session = Depends(get_db)):
    center = _center_of(current_center, db)
    members = db.query(CenterMembership).filter(
        CenterMembership.center_id == center.center_id,
        CenterMembership.member_type == "student",
    ).all()
    return [_member_dict(db, center, m) for m in members]


# ── member update (rename / password / pause / disable) ──────────────────────

@router.put("/center/members/{user_id}", response_model=dict)
async def update_member(user_id: int, request: UpdateMemberRequest,
                       current_center: User = Depends(get_current_center),
                       db: Session = Depends(get_db)):
    center = _center_of(current_center, db)
    m = _membership_or_404(db, center, user_id)
    user = m.user

    if request.username is not None and request.username != user.username:
        if db.query(User).filter(User.username == request.username).first():
            raise HTTPException(status_code=400, detail="Tên đăng nhập đã tồn tại")
        user.username = request.username
    if request.password is not None:
        user.password = pwd_context.hash(request.password)
    if request.is_paused is not None:
        m.is_paused = request.is_paused
    if request.is_disabled is not None:
        m.is_disabled = request.is_disabled

    _sync_active(user, m)
    db.commit()
    db.refresh(m)
    return _member_dict(db, center, m)


# ── classrooms ───────────────────────────────────────────────────────────────

def _class_dict(db: Session, center: Center, cls: Classroom) -> dict:
    member_rows = (
        db.query(CenterMembership)
        .join(ClassMember, ClassMember.user_id == CenterMembership.user_id)
        .filter(ClassMember.class_id == cls.class_id,
                CenterMembership.center_id == center.center_id)
        .all()
    )
    teachers = [{"user_id": m.user_id, "username": m.user.username}
                for m in member_rows if m.member_type == "teacher"]
    students = [{"user_id": m.user_id, "username": m.user.username}
                for m in member_rows if m.member_type == "student"]
    return {
        "class_id": cls.class_id,
        "name": cls.name,
        "is_active": cls.is_active,
        "teachers": teachers,
        "students": students,
        "student_count": len(students),
        "created_at": cls.created_at,
    }


@router.post("/center/classes", response_model=dict)
async def create_class(request: ClassRequest,
                      current_center: User = Depends(get_current_center),
                      db: Session = Depends(get_db)):
    center = _center_of(current_center, db)
    cls = Classroom(center_id=center.center_id, name=request.name, is_active=True)
    db.add(cls)
    db.commit()
    db.refresh(cls)
    return _class_dict(db, center, cls)


@router.get("/center/classes", response_model=List[dict])
async def list_classes(current_center: User = Depends(get_current_center),
                      db: Session = Depends(get_db)):
    center = _center_of(current_center, db)
    classes = db.query(Classroom).filter(Classroom.center_id == center.center_id).all()
    return [_class_dict(db, center, c) for c in classes]


def _class_or_404(db: Session, center: Center, class_id: int) -> Classroom:
    cls = db.query(Classroom).filter(
        Classroom.class_id == class_id,
        Classroom.center_id == center.center_id,
    ).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp")
    return cls


@router.get("/center/classes/{class_id}", response_model=dict)
async def get_class(class_id: int,
                   current_center: User = Depends(get_current_center),
                   db: Session = Depends(get_db)):
    center = _center_of(current_center, db)
    return _class_dict(db, center, _class_or_404(db, center, class_id))


@router.put("/center/classes/{class_id}", response_model=dict)
async def update_class(class_id: int, request: ClassUpdateRequest,
                      current_center: User = Depends(get_current_center),
                      db: Session = Depends(get_db)):
    center = _center_of(current_center, db)
    cls = _class_or_404(db, center, class_id)
    if request.name is not None:
        cls.name = request.name
    if request.is_active is not None:
        cls.is_active = request.is_active
    db.commit()
    db.refresh(cls)
    return _class_dict(db, center, cls)


@router.post("/center/classes/{class_id}/members", response_model=dict)
async def add_class_member(class_id: int, request: ClassMemberRequest,
                          current_center: User = Depends(get_current_center),
                          db: Session = Depends(get_db)):
    center = _center_of(current_center, db)
    cls = _class_or_404(db, center, class_id)
    # target must be a member of this center
    _membership_or_404(db, center, request.user_id)
    exists = db.query(ClassMember).filter(
        ClassMember.class_id == cls.class_id,
        ClassMember.user_id == request.user_id,
    ).first()
    if not exists:
        db.add(ClassMember(class_id=cls.class_id, user_id=request.user_id))
        db.commit()
    return _class_dict(db, center, cls)


@router.delete("/center/classes/{class_id}/members/{user_id}", response_model=dict)
async def remove_class_member(class_id: int, user_id: int,
                             current_center: User = Depends(get_current_center),
                             db: Session = Depends(get_db)):
    center = _center_of(current_center, db)
    cls = _class_or_404(db, center, class_id)
    row = db.query(ClassMember).filter(
        ClassMember.class_id == cls.class_id,
        ClassMember.user_id == user_id,
    ).first()
    if row:
        db.delete(row)
        db.commit()
    return _class_dict(db, center, cls)
