"""Center (Trung tâm) — item 8: "Xem toàn bộ dữ liệu".

Center-wide read views over ALL its teachers' and students' exam activity
(accuracy, exams completed, full history). Scoped to the authenticated center.
Reuses the teacher-dashboard accuracy helpers and the management VIP/class
helpers so numbers stay consistent across the app.
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import (
    User, Center, CenterMembership, ExamResult, Exam,
)
from app.routes.admin.auth import get_current_center
from app.routes.center.center_actions import _center_of
from app.routes.center.center_management import _vip_status, _classes_of_user, _membership_or_404
from app.routes.center.teacher_dashboard import _student_accuracy, _result_accuracy

router = APIRouter()


def _member_ids(db: Session, center: Center, member_type: Optional[str] = None) -> List[int]:
    q = db.query(CenterMembership.user_id).filter(CenterMembership.center_id == center.center_id)
    if member_type:
        q = q.filter(CenterMembership.member_type == member_type)
    return [r[0] for r in q.all()]


@router.get("/center/reports/overview")
async def reports_overview(
    db: Session = Depends(get_db),
    current_center: User = Depends(get_current_center),
):
    center = _center_of(current_center, db)
    teachers = _member_ids(db, center, "teacher")
    students = _member_ids(db, center, "student")
    all_ids = teachers + students
    total_exams = 0
    if all_ids:
        total_exams = db.query(func.count(ExamResult.result_id)).filter(
            ExamResult.user_id.in_(all_ids)).scalar() or 0
    from app.models.models import Classroom
    class_count = db.query(func.count(Classroom.class_id)).filter(
        Classroom.center_id == center.center_id).scalar() or 0
    return {
        "teachers": len(teachers),
        "students": len(students),
        "classes": class_count,
        "total_exams": total_exams,
    }


@router.get("/center/reports/members")
async def reports_members(
    member_type: str = Query("student", pattern="^(student|teacher)$"),
    db: Session = Depends(get_db),
    current_center: User = Depends(get_current_center),
):
    """All teachers or students of the center with accuracy + exams completed +
    class + VIP + status."""
    center = _center_of(current_center, db)
    ms = (
        db.query(CenterMembership)
        .filter(CenterMembership.center_id == center.center_id,
                CenterMembership.member_type == member_type)
        .all()
    )
    out = []
    for m in ms:
        u = m.user
        if not u:
            continue
        acc = _student_accuracy(db, u.user_id)
        exams_done = db.query(func.count(ExamResult.result_id)).filter(
            ExamResult.user_id == u.user_id).scalar() or 0
        out.append({
            "user_id": u.user_id,
            "username": u.username,
            "email": u.email,
            "classes": _classes_of_user(db, center, u.user_id),
            "accuracy": acc["accuracy"],
            "answered": acc["answered"],
            "exams_completed": exams_done,
            "vip": _vip_status(u),
            "is_paused": m.is_paused,
            "is_disabled": m.is_disabled,
        })
    # Most active first.
    out.sort(key=lambda x: x["exams_completed"], reverse=True)
    return out


@router.get("/center/reports/members/{user_id}/history")
async def reports_member_history(
    user_id: int,
    db: Session = Depends(get_db),
    current_center: User = Depends(get_current_center),
):
    """Full exam history for any member (teacher or student) of this center."""
    center = _center_of(current_center, db)
    m = _membership_or_404(db, center, user_id)  # ensures the member belongs here
    user = db.query(User).filter(User.user_id == user_id).first()
    results = (
        db.query(ExamResult)
        .filter(ExamResult.user_id == user_id)
        .order_by(ExamResult.completion_date.desc())
        .all()
    )
    history = []
    for r in results:
        exam = db.query(Exam).filter(Exam.exam_id == r.exam_id).first()
        history.append({
            "result_id": r.result_id,
            "exam_title": exam.title if exam else None,
            "total_score": r.total_score,
            "accuracy": _result_accuracy(db, r.result_id),
            "completion_date": r.completion_date,
            "is_forecast": r.is_forecast,
        })
    return {
        "user_id": user_id,
        "username": user.username if user else None,
        "member_type": m.member_type,
        "classes": _classes_of_user(db, center, user_id),
        "overall": _student_accuracy(db, user_id),
        "history": history,
    }
