"""Center (Trung tâm) — realtime exam-progress board.

Design: polling + Redis (NOT websocket — the app runs 8 uvicorn workers, so a
websocket would need Redis pub/sub anyway; polling is stateless and Cloudflare-
friendly). While a student takes an exam their app POSTs a lightweight heartbeat
(~every 10s). We store one Redis hash per center — key ``center_live:{center_id}``
mapping ``user_id -> JSON`` — and a teacher/center polls a read endpoint that
returns everyone active in the last FRESH_WINDOW seconds. ``ExamProgress`` (DB) is
upserted as durability + a fallback read path when Redis is down.
"""
from datetime import datetime, timedelta
import json

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List

from app.database import get_db
from app.models.models import (
    User, Center, Classroom, CenterMembership, ClassMember, ExamProgress,
)
from app.routes.admin.auth import (
    get_current_student, get_current_teacher, get_current_center,
)
from app.utils.redis_cache import cache
from app.utils.datetime_utils import get_vietnam_time

router = APIRouter()

# A student is "online" if we've heard from them within this many seconds.
# Heartbeat cadence is ~10s, so this tolerates ~3 missed beats.
FRESH_WINDOW = 35
# Auto-expire a center's whole hash after this idle time (self-cleaning).
HASH_TTL = 6 * 3600


def _now():
    return get_vietnam_time().replace(tzinfo=None)


def _live_key(center_id: int) -> str:
    return f"center_live:{center_id}"


def _student_classes(db: Session, user_id: int, center_id: int):
    """(class_ids, first class name) for a center-student."""
    rows = (
        db.query(Classroom.class_id, Classroom.name)
        .join(ClassMember, ClassMember.class_id == Classroom.class_id)
        .filter(ClassMember.user_id == user_id, Classroom.center_id == center_id)
        .all()
    )
    class_ids = [r[0] for r in rows]
    class_name = rows[0][1] if rows else None
    return class_ids, class_name


# ── student heartbeat ────────────────────────────────────────────────────────

class Heartbeat(BaseModel):
    exam_id: Optional[int] = None
    skill: Optional[str] = None            # listening/reading/writing/speaking
    title: Optional[str] = None            # e.g. "Part 1: Chicken"
    questions_done: Optional[int] = 0
    total_questions: Optional[int] = None
    last_question: Optional[int] = None


@router.post("/student/exam/heartbeat")
async def exam_heartbeat(
    payload: Heartbeat,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_student),
):
    """Record a student's live exam progress. No-op (untracked) for non-center
    students. Best-effort: never raises on a Redis/DB hiccup so it can't disrupt
    the exam."""
    membership = (
        db.query(CenterMembership)
        .filter(
            CenterMembership.user_id == current.user_id,
            CenterMembership.member_type == "student",
            CenterMembership.is_disabled == False,  # noqa: E712
        )
        .first()
    )
    if not membership:
        return {"tracked": False}

    center_id = membership.center_id
    class_ids, class_name = _student_classes(db, current.user_id, center_id)
    now = _now()

    # Preserve started_at across a single exam session (reset when exam changes).
    started_at = now.isoformat()
    if cache.redis_client is not None:
        try:
            prev_raw = await cache.redis_client.hget(_live_key(center_id), str(current.user_id))
            if prev_raw:
                prev = json.loads(prev_raw)
                if prev.get("exam_id") == payload.exam_id and prev.get("started_at"):
                    started_at = prev["started_at"]
        except Exception:
            pass

    entry = {
        "user_id": current.user_id,
        "name": current.username,
        "class_ids": class_ids,
        "class_name": class_name,
        "skill": payload.skill,
        "exam_id": payload.exam_id,
        "title": payload.title,
        "questions_done": payload.questions_done or 0,
        "total_questions": payload.total_questions,
        "last_question": payload.last_question,
        "started_at": started_at,
        "updated_at": now.isoformat(),
    }

    if cache.redis_client is not None:
        try:
            key = _live_key(center_id)
            await cache.redis_client.hset(key, str(current.user_id), json.dumps(entry, default=str))
            await cache.redis_client.expire(key, HASH_TTL)
        except Exception:
            pass

    # Durability / Redis-down fallback: upsert one ExamProgress row per user.
    try:
        row = db.query(ExamProgress).filter(ExamProgress.user_id == current.user_id).first()
        if not row:
            row = ExamProgress(user_id=current.user_id)
            db.add(row)
        row.center_id = center_id
        row.exam_id = payload.exam_id
        row.skill = payload.skill
        row.title = payload.title
        row.questions_done = payload.questions_done or 0
        row.total_questions = payload.total_questions
        row.last_question = payload.last_question
        row.is_active = True
        if not row.started_at:
            row.started_at = now
        row.updated_at = now
        db.commit()
    except Exception:
        db.rollback()

    return {"tracked": True}


@router.post("/student/exam/heartbeat/stop")
async def exam_heartbeat_stop(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_student),
):
    """Drop the student off the board immediately (called on exam submit/leave)
    instead of waiting for the freshness window to lapse."""
    membership = (
        db.query(CenterMembership)
        .filter(
            CenterMembership.user_id == current.user_id,
            CenterMembership.member_type == "student",
        )
        .first()
    )
    if membership and cache.redis_client is not None:
        try:
            await cache.redis_client.hdel(_live_key(membership.center_id), str(current.user_id))
        except Exception:
            pass
    try:
        row = db.query(ExamProgress).filter(ExamProgress.user_id == current.user_id).first()
        if row:
            row.is_active = False
            row.updated_at = _now()
            db.commit()
    except Exception:
        db.rollback()
    return {"ok": True}


# ── board readers ────────────────────────────────────────────────────────────

def _elapsed_seconds(started_iso: Optional[str], now: datetime) -> int:
    if not started_iso:
        return 0
    try:
        started = datetime.fromisoformat(started_iso)
        return max(0, int((now - started).total_seconds()))
    except Exception:
        return 0


async def _read_live(db: Session, center_id: int, allowed_class_ids: Optional[set]) -> List[dict]:
    """Active students for a center. allowed_class_ids=None means no class filter
    (center-wide); otherwise keep only students sharing one of those classes."""
    now = _now()
    cutoff = now - timedelta(seconds=FRESH_WINDOW)
    out: List[dict] = []

    entries = None
    if cache.redis_client is not None:
        try:
            key = _live_key(center_id)
            raw = await cache.redis_client.hgetall(key)
            entries = []
            stale_fields = []
            for field, val in (raw or {}).items():
                try:
                    e = json.loads(val)
                except Exception:
                    stale_fields.append(field)
                    continue
                try:
                    updated = datetime.fromisoformat(e.get("updated_at"))
                except Exception:
                    updated = now
                if updated < cutoff:
                    stale_fields.append(field)
                    continue
                entries.append(e)
            if stale_fields:  # prune expired members so the hash stays small
                try:
                    await cache.redis_client.hdel(key, *stale_fields)
                except Exception:
                    pass
        except Exception:
            entries = None

    # Fallback: Redis unavailable → read fresh ExamProgress rows from the DB.
    if entries is None:
        rows = (
            db.query(ExamProgress)
            .filter(
                ExamProgress.center_id == center_id,
                ExamProgress.is_active == True,  # noqa: E712
                ExamProgress.updated_at >= cutoff,
            )
            .all()
        )
        entries = []
        for r in rows:
            class_ids, class_name = _student_classes(db, r.user_id, center_id)
            u = r.user
            entries.append({
                "user_id": r.user_id,
                "name": u.username if u else str(r.user_id),
                "class_ids": class_ids,
                "class_name": class_name,
                "skill": r.skill,
                "exam_id": r.exam_id,
                "title": r.title,
                "questions_done": r.questions_done,
                "total_questions": r.total_questions,
                "last_question": r.last_question,
                "started_at": r.started_at.isoformat() if r.started_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else now.isoformat(),
            })

    for e in entries:
        if allowed_class_ids is not None:
            if not (set(e.get("class_ids") or []) & allowed_class_ids):
                continue
        e["elapsed_seconds"] = _elapsed_seconds(e.get("started_at"), now)
        out.append(e)

    # Sort by class name then student name for a stable, groupable board.
    out.sort(key=lambda e: ((e.get("class_name") or "").lower(), (e.get("name") or "").lower()))
    return out


@router.get("/teacher/realtime")
async def teacher_realtime(
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    """Live board of students in this teacher's classes."""
    membership = (
        db.query(CenterMembership)
        .filter(
            CenterMembership.user_id == current_teacher.user_id,
            CenterMembership.member_type == "teacher",
        )
        .first()
    )
    if not membership:
        return {"students": []}
    center_id = membership.center_id
    class_id_rows = (
        db.query(Classroom.class_id)
        .join(ClassMember, ClassMember.class_id == Classroom.class_id)
        .filter(ClassMember.user_id == current_teacher.user_id, Classroom.center_id == center_id)
        .all()
    )
    allowed = {r[0] for r in class_id_rows}
    if not allowed:
        return {"students": []}
    students = await _read_live(db, center_id, allowed)
    return {"students": students}


@router.get("/center/realtime")
async def center_realtime(
    db: Session = Depends(get_db),
    current_center: User = Depends(get_current_center),
):
    """Live board of ALL students in the center (center-wide view)."""
    center = db.query(Center).filter(Center.user_id == current_center.user_id).first()
    if not center:
        return {"students": []}
    students = await _read_live(db, center.center_id, None)
    return {"students": students}
