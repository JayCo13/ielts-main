"""Center (Trung tâm) — P3: teacher dashboard.

Teachers are role='customer' + a CenterMembership(member_type='teacher'), so they
take tests through the normal student/customer exam flow. These read-only
endpoints let a teacher see their own classes and students (accuracy + test
history). A teacher only sees students who share a class with them.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.database import get_db
from app.models.models import (
    User, Center, Classroom, CenterMembership, ClassMember,
    ExamResult, StudentAnswer, ListeningAnswer, Exam,
)
from app.routes.admin.auth import get_current_teacher

router = APIRouter()


# ── helpers ──────────────────────────────────────────────────────────────────

def _teacher_membership(db: Session, user: User) -> CenterMembership:
    m = db.query(CenterMembership).filter(
        CenterMembership.user_id == user.user_id,
        CenterMembership.member_type == "teacher",
    ).first()
    if not m:
        raise HTTPException(status_code=403, detail="Không phải tài khoản giáo viên")
    return m


def _teacher_class_ids(db: Session, user: User, center_id: int) -> List[int]:
    """Classes (in the teacher's center) the teacher is assigned to."""
    rows = (
        db.query(Classroom.class_id)
        .join(ClassMember, ClassMember.class_id == Classroom.class_id)
        .filter(ClassMember.user_id == user.user_id, Classroom.center_id == center_id)
        .all()
    )
    return [r[0] for r in rows]


def _accuracy(correct: int, total: int) -> float:
    return round(correct / total * 100, 1) if total else 0.0


def _student_accuracy(db: Session, user_id: int) -> dict:
    """Overall accuracy across a student's answers (reading/writing via
    StudentAnswer joined through ExamResult, plus ListeningAnswer)."""
    sa_total = (
        db.query(func.count(StudentAnswer.answer_id))
        .join(ExamResult, StudentAnswer.result_id == ExamResult.result_id)
        .filter(ExamResult.user_id == user_id).scalar() or 0
    )
    sa_correct = (
        db.query(func.count(StudentAnswer.answer_id))
        .join(ExamResult, StudentAnswer.result_id == ExamResult.result_id)
        .filter(ExamResult.user_id == user_id, StudentAnswer.score > 0).scalar() or 0
    )
    la_total = db.query(func.count(ListeningAnswer.answer_id)).filter(
        ListeningAnswer.user_id == user_id).scalar() or 0
    la_correct = db.query(func.count(ListeningAnswer.answer_id)).filter(
        ListeningAnswer.user_id == user_id, ListeningAnswer.score > 0).scalar() or 0
    total = sa_total + la_total
    correct = sa_correct + la_correct
    return {"accuracy": _accuracy(correct, total), "answered": total}


def _student_brief(db: Session, m: CenterMembership) -> dict:
    u = m.user
    acc = _student_accuracy(db, u.user_id)
    exams_done = db.query(func.count(ExamResult.result_id)).filter(
        ExamResult.user_id == u.user_id).scalar() or 0
    return {
        "user_id": u.user_id,
        "username": u.username,
        "accuracy": acc["accuracy"],
        "exams_completed": exams_done,
        "is_paused": m.is_paused,
        "is_disabled": m.is_disabled,
    }


# ── endpoints ────────────────────────────────────────────────────────────────

@router.get("/teacher/me", response_model=dict)
async def teacher_me(current_teacher: User = Depends(get_current_teacher),
                    db: Session = Depends(get_db)):
    m = _teacher_membership(db, current_teacher)
    center = db.query(Center).filter(Center.center_id == m.center_id).first()
    class_ids = _teacher_class_ids(db, current_teacher, m.center_id)
    classes = db.query(Classroom).filter(Classroom.class_id.in_(class_ids)).all() if class_ids else []
    return {
        "user_id": current_teacher.user_id,
        "username": current_teacher.username,
        "email": current_teacher.email,
        "image_url": current_teacher.image_url,
        "center": {"center_id": center.center_id, "name": center.name} if center else None,
        "classes": [{"class_id": c.class_id, "name": c.name} for c in classes],
    }


def _students_of_class(db: Session, center_id: int, class_id: int) -> List[CenterMembership]:
    return (
        db.query(CenterMembership)
        .join(ClassMember, ClassMember.user_id == CenterMembership.user_id)
        .filter(ClassMember.class_id == class_id,
                CenterMembership.center_id == center_id,
                CenterMembership.member_type == "student")
        .all()
    )


@router.get("/teacher/classes", response_model=List[dict])
async def teacher_classes(current_teacher: User = Depends(get_current_teacher),
                         db: Session = Depends(get_db)):
    m = _teacher_membership(db, current_teacher)
    class_ids = _teacher_class_ids(db, current_teacher, m.center_id)
    out = []
    for cls in db.query(Classroom).filter(Classroom.class_id.in_(class_ids)).all() if class_ids else []:
        students = _students_of_class(db, m.center_id, cls.class_id)
        accs = [_student_accuracy(db, s.user_id)["accuracy"] for s in students]
        avg = round(sum(accs) / len(accs), 1) if accs else 0.0
        out.append({
            "class_id": cls.class_id,
            "name": cls.name,
            "is_active": cls.is_active,
            "student_count": len(students),
            "average_accuracy": avg,
        })
    return out


@router.get("/teacher/classes/{class_id}/students", response_model=dict)
async def teacher_class_students(class_id: int,
                                current_teacher: User = Depends(get_current_teacher),
                                db: Session = Depends(get_db)):
    m = _teacher_membership(db, current_teacher)
    if class_id not in _teacher_class_ids(db, current_teacher, m.center_id):
        raise HTTPException(status_code=403, detail="Bạn không dạy lớp này")
    cls = db.query(Classroom).filter(Classroom.class_id == class_id).first()
    students = [_student_brief(db, s) for s in _students_of_class(db, m.center_id, class_id)]
    avg = round(sum(s["accuracy"] for s in students) / len(students), 1) if students else 0.0
    return {
        "class_id": class_id,
        "name": cls.name if cls else None,
        "average_accuracy": avg,
        "students": students,
    }


def _result_accuracy(db: Session, result_id: int) -> float:
    total = db.query(func.count(StudentAnswer.answer_id)).filter(
        StudentAnswer.result_id == result_id).scalar() or 0
    correct = db.query(func.count(StudentAnswer.answer_id)).filter(
        StudentAnswer.result_id == result_id, StudentAnswer.score > 0).scalar() or 0
    lt = db.query(func.count(ListeningAnswer.answer_id)).filter(
        ListeningAnswer.result_id == result_id).scalar() or 0
    lc = db.query(func.count(ListeningAnswer.answer_id)).filter(
        ListeningAnswer.result_id == result_id, ListeningAnswer.score > 0).scalar() or 0
    return _accuracy(correct + lc, total + lt)


@router.get("/teacher/students/{user_id}/history", response_model=dict)
async def teacher_student_history(user_id: int,
                                 current_teacher: User = Depends(get_current_teacher),
                                 db: Session = Depends(get_db)):
    m = _teacher_membership(db, current_teacher)
    # The target must be a student sharing a class with this teacher.
    teacher_class_ids = _teacher_class_ids(db, current_teacher, m.center_id)
    if not teacher_class_ids:
        raise HTTPException(status_code=403, detail="Bạn chưa được gán lớp")
    shares = db.query(ClassMember).filter(
        ClassMember.user_id == user_id,
        ClassMember.class_id.in_(teacher_class_ids),
    ).first()
    if not shares:
        raise HTTPException(status_code=403, detail="Học viên không thuộc lớp bạn dạy")

    student = db.query(User).filter(User.user_id == user_id).first()
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
        "username": student.username if student else None,
        "overall": _student_accuracy(db, user_id),
        "history": history,
    }
