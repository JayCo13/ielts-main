from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from app.database import get_db
from app.models.models import Announcement

router = APIRouter()


class PublicAnnouncement(BaseModel):
    announcement_id: int
    icon: Optional[str] = None
    content: str
    link: Optional[str] = None
    is_important: bool
    created_at: Optional[str] = None


@router.get("/announcements", response_model=List[PublicAnnouncement])
async def get_public_announcements(db: Session = Depends(get_db)):
    """Public (no-auth) list of active homepage announcements for the student
    landing page. Important items are pinned first, then manual order, then
    newest. Matches the public VIP-packages precedent (no auth dependency)."""
    items = (
        db.query(Announcement)
        .filter(Announcement.is_active == True)  # noqa: E712
        .order_by(
            Announcement.is_important.desc(),
            Announcement.display_order.asc(),
            Announcement.created_at.desc(),
        )
        .all()
    )
    return [
        PublicAnnouncement(
            announcement_id=a.announcement_id,
            icon=a.icon,
            content=a.content,
            link=a.link,
            is_important=bool(a.is_important),
            created_at=a.created_at.isoformat() if a.created_at else None,
        )
        for a in items
    ]
