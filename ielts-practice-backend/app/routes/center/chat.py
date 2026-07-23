"""Center (Trung tâm) — P4 chat / messaging.

Teacher<->student direct threads and per-class channels, plus pinned "homework"
messages (is_pinned, "không bị trôi"). Polling + Redis (unread markers), same
rationale as the realtime board — no websocket. ChatMessage is the source of
truth; Redis only holds per-(user,thread) last-read ids for unread counts.

Access rules:
- class channel: the user must belong to that class (teacher or student).
- direct thread: a student may only talk to a teacher who shares a class with
  them; a teacher only to a student who shares a class. No student<->student,
  no chat-all.
- pin/unpin: teachers only, on a class message of a class they teach.
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, or_, and_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import (
    User, Classroom, CenterMembership, ClassMember, ChatMessage,
)
from app.routes.admin.auth import get_current_student
from app.utils.redis_cache import cache
from app.utils.datetime_utils import get_vietnam_time

router = APIRouter()

MSG_LIMIT = 200


# ── membership / access helpers ──────────────────────────────────────────────

def _membership(db: Session, user: User) -> CenterMembership:
    m = (
        db.query(CenterMembership)
        .filter(
            CenterMembership.user_id == user.user_id,
            CenterMembership.is_disabled == False,  # noqa: E712
        )
        .first()
    )
    if not m:
        raise HTTPException(status_code=403, detail="Tài khoản không thuộc trung tâm nào")
    return m


def _class_ids(db: Session, user_id: int, center_id: int) -> set:
    rows = (
        db.query(Classroom.class_id)
        .join(ClassMember, ClassMember.class_id == Classroom.class_id)
        .filter(ClassMember.user_id == user_id, Classroom.center_id == center_id)
        .all()
    )
    return {r[0] for r in rows}


def _shared(db: Session, a: int, b: int, center_id: int) -> bool:
    return bool(_class_ids(db, a, center_id) & _class_ids(db, b, center_id))


def _direct_key(a: int, b: int) -> str:
    lo, hi = sorted((a, b))
    return f"direct:{lo}:{hi}"


def _class_key(class_id: int) -> str:
    return f"class:{class_id}"


async def _last_read(user_id: int, tkey: str) -> int:
    if cache.redis_client is None:
        return 0
    try:
        v = await cache.redis_client.get(f"chat_read:{user_id}:{tkey}")
        return int(v) if v else 0
    except Exception:
        return 0


async def _mark_read(user_id: int, tkey: str, message_id: int):
    if cache.redis_client is None or not message_id:
        return
    try:
        await cache.redis_client.set(f"chat_read:{user_id}:{tkey}", int(message_id))
    except Exception:
        pass


def _msg_dict(db: Session, m: ChatMessage, me_id: int, name_cache: dict) -> dict:
    if m.sender_id not in name_cache:
        u = db.query(User.username).filter(User.user_id == m.sender_id).first()
        name_cache[m.sender_id] = u[0] if u else str(m.sender_id)
    return {
        "message_id": m.message_id,
        "sender_id": m.sender_id,
        "sender_name": name_cache[m.sender_id],
        "content": m.content,
        "is_pinned": bool(m.is_pinned),
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "mine": m.sender_id == me_id,
    }


# ── threads list ─────────────────────────────────────────────────────────────

@router.get("/chat/threads")
async def chat_threads(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_student),
):
    m = _membership(db, current)
    center_id = m.center_id
    my_classes = _class_ids(db, current.user_id, center_id)
    threads = []

    # Class channels the user belongs to.
    if my_classes:
        classes = db.query(Classroom).filter(
            Classroom.class_id.in_(my_classes), Classroom.is_active == True  # noqa: E712
        ).all()
        for c in classes:
            tkey = _class_key(c.class_id)
            last = (
                db.query(ChatMessage)
                .filter(ChatMessage.scope == "class", ChatMessage.class_id == c.class_id)
                .order_by(ChatMessage.message_id.desc())
                .first()
            )
            last_read = await _last_read(current.user_id, tkey)
            unread = (
                db.query(func.count(ChatMessage.message_id))
                .filter(
                    ChatMessage.scope == "class",
                    ChatMessage.class_id == c.class_id,
                    ChatMessage.message_id > last_read,
                    ChatMessage.sender_id != current.user_id,
                ).scalar() or 0
            )
            threads.append({
                "type": "class",
                "id": c.class_id,
                "name": c.name,
                "last": last.content if last else None,
                "last_at": last.created_at.isoformat() if last and last.created_at else None,
                "unread": unread,
            })

    # Direct partners.
    partner_ids = set()
    if m.member_type == "student":
        # Teachers who teach any of the student's classes.
        if my_classes:
            rows = (
                db.query(CenterMembership.user_id)
                .join(ClassMember, ClassMember.user_id == CenterMembership.user_id)
                .filter(
                    CenterMembership.center_id == center_id,
                    CenterMembership.member_type == "teacher",
                    ClassMember.class_id.in_(my_classes),
                ).distinct().all()
            )
            partner_ids = {r[0] for r in rows}
    else:  # teacher → existing direct conversations
        rows = (
            db.query(ChatMessage.sender_id, ChatMessage.recipient_id)
            .filter(
                ChatMessage.scope == "direct",
                or_(ChatMessage.sender_id == current.user_id,
                    ChatMessage.recipient_id == current.user_id),
            ).all()
        )
        for s, r in rows:
            partner_ids.add(r if s == current.user_id else s)

    for pid in partner_ids:
        if pid == current.user_id:
            continue
        tkey = _direct_key(current.user_id, pid)
        last = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.scope == "direct",
                or_(
                    and_(ChatMessage.sender_id == current.user_id, ChatMessage.recipient_id == pid),
                    and_(ChatMessage.sender_id == pid, ChatMessage.recipient_id == current.user_id),
                ),
            )
            .order_by(ChatMessage.message_id.desc())
            .first()
        )
        last_read = await _last_read(current.user_id, tkey)
        unread = (
            db.query(func.count(ChatMessage.message_id))
            .filter(
                ChatMessage.scope == "direct",
                ChatMessage.sender_id == pid,
                ChatMessage.recipient_id == current.user_id,
                ChatMessage.message_id > last_read,
            ).scalar() or 0
        )
        uname = db.query(User.username).filter(User.user_id == pid).first()
        threads.append({
            "type": "direct",
            "id": pid,
            "name": uname[0] if uname else str(pid),
            "last": last.content if last else None,
            "last_at": last.created_at.isoformat() if last and last.created_at else None,
            "unread": unread,
        })

    # Most-recent conversation first; empty threads (no messages) sink to bottom.
    threads.sort(key=lambda t: (t["last_at"] or ""), reverse=True)
    return {"role": m.member_type, "threads": threads}


# ── messages ─────────────────────────────────────────────────────────────────

def _authorize_thread(db: Session, user: User, m: CenterMembership, scope: str, target_id: int):
    center_id = m.center_id
    if scope == "class":
        if target_id not in _class_ids(db, user.user_id, center_id):
            raise HTTPException(status_code=403, detail="Bạn không thuộc lớp này")
    elif scope == "direct":
        other = db.query(CenterMembership).filter(
            CenterMembership.user_id == target_id,
            CenterMembership.center_id == center_id,
        ).first()
        if not other:
            raise HTTPException(status_code=403, detail="Người nhận không thuộc trung tâm")
        # student<->teacher only, and must share a class
        if m.member_type == other.member_type:
            raise HTTPException(status_code=403, detail="Chỉ được nhắn giữa giáo viên và học viên")
        if not _shared(db, user.user_id, target_id, center_id):
            raise HTTPException(status_code=403, detail="Không cùng lớp")
    else:
        raise HTTPException(status_code=400, detail="scope không hợp lệ")


@router.get("/chat/messages")
async def chat_messages(
    scope: str = Query(..., pattern="^(class|direct)$"),
    target_id: int = Query(...),
    after_id: int = Query(0),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_student),
):
    m = _membership(db, current)
    _authorize_thread(db, current, m, scope, target_id)

    q = db.query(ChatMessage)
    if scope == "class":
        q = q.filter(ChatMessage.scope == "class", ChatMessage.class_id == target_id)
        tkey = _class_key(target_id)
    else:
        q = q.filter(
            ChatMessage.scope == "direct",
            or_(
                and_(ChatMessage.sender_id == current.user_id, ChatMessage.recipient_id == target_id),
                and_(ChatMessage.sender_id == target_id, ChatMessage.recipient_id == current.user_id),
            ),
        )
        tkey = _direct_key(current.user_id, target_id)

    if after_id:
        q = q.filter(ChatMessage.message_id > after_id)
    rows = q.order_by(ChatMessage.message_id.asc()).limit(MSG_LIMIT).all()

    name_cache: dict = {}
    messages = [_msg_dict(db, r, current.user_id, name_cache) for r in rows]

    # Pinned messages (class only) always returned so the UI can keep them on top.
    pinned = []
    if scope == "class":
        prows = (
            db.query(ChatMessage)
            .filter(ChatMessage.scope == "class", ChatMessage.class_id == target_id,
                    ChatMessage.is_pinned == True)  # noqa: E712
            .order_by(ChatMessage.message_id.desc())
            .all()
        )
        pinned = [_msg_dict(db, r, current.user_id, name_cache) for r in prows]

    if rows:
        await _mark_read(current.user_id, tkey, rows[-1].message_id)
    return {"messages": messages, "pinned": pinned}


class SendMessage(BaseModel):
    scope: str
    target_id: int
    content: str
    is_pinned: Optional[bool] = False


@router.post("/chat/messages")
async def chat_send(
    payload: SendMessage,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_student),
):
    m = _membership(db, current)
    if not payload.content or not payload.content.strip():
        raise HTTPException(status_code=400, detail="Nội dung trống")
    if payload.scope not in ("class", "direct"):
        raise HTTPException(status_code=400, detail="scope không hợp lệ")
    _authorize_thread(db, current, m, payload.scope, payload.target_id)

    # Only a teacher may pin (homework), and only on a class message.
    pin = bool(payload.is_pinned) and m.member_type == "teacher" and payload.scope == "class"

    msg = ChatMessage(
        center_id=m.center_id,
        sender_id=current.user_id,
        scope=payload.scope,
        class_id=payload.target_id if payload.scope == "class" else None,
        recipient_id=payload.target_id if payload.scope == "direct" else None,
        content=payload.content.strip(),
        is_pinned=pin,
        created_at=get_vietnam_time().replace(tzinfo=None),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    name_cache = {current.user_id: current.username}
    return _msg_dict(db, msg, current.user_id, name_cache)


class PinToggle(BaseModel):
    pinned: bool


@router.post("/chat/messages/{message_id}/pin")
async def chat_pin(
    message_id: int,
    payload: PinToggle,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_student),
):
    m = _membership(db, current)
    if m.member_type != "teacher":
        raise HTTPException(status_code=403, detail="Chỉ giáo viên được ghim")
    msg = db.query(ChatMessage).filter(ChatMessage.message_id == message_id).first()
    if not msg or msg.scope != "class":
        raise HTTPException(status_code=404, detail="Không tìm thấy tin nhắn lớp")
    if msg.class_id not in _class_ids(db, current.user_id, m.center_id):
        raise HTTPException(status_code=403, detail="Bạn không dạy lớp này")
    msg.is_pinned = bool(payload.pinned)
    db.commit()
    return {"message_id": message_id, "is_pinned": msg.is_pinned}
