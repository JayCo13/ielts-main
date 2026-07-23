from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from app.database import get_db
from app.models.models import Announcement, User
from app.routes.admin.auth import get_current_admin

router = APIRouter()


# ---- Schemas ----
class AnnouncementCreate(BaseModel):
    content: str
    icon: Optional[str] = None
    link: Optional[str] = None
    is_important: Optional[bool] = False
    display_order: Optional[int] = 0
    is_active: Optional[bool] = True


class AnnouncementUpdate(BaseModel):
    content: Optional[str] = None
    icon: Optional[str] = None
    link: Optional[str] = None
    is_important: Optional[bool] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class AnnouncementResponse(BaseModel):
    announcement_id: int
    icon: Optional[str] = None
    content: str
    link: Optional[str] = None
    is_important: bool
    display_order: int
    is_active: bool
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


def _serialize(a: Announcement) -> AnnouncementResponse:
    return AnnouncementResponse(
        announcement_id=a.announcement_id,
        icon=a.icon,
        content=a.content,
        link=a.link,
        is_important=bool(a.is_important),
        display_order=a.display_order or 0,
        is_active=bool(a.is_active),
        created_at=a.created_at.isoformat() if a.created_at else None,
    )


@router.get("/announcements", response_model=List[AnnouncementResponse])
async def list_announcements(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """List every announcement (active + inactive) for the admin table."""
    items = (
        db.query(Announcement)
        .order_by(
            Announcement.is_important.desc(),
            Announcement.display_order.asc(),
            Announcement.created_at.desc(),
        )
        .all()
    )
    return [_serialize(a) for a in items]


@router.post("/announcements", response_model=AnnouncementResponse)
async def create_announcement(
    payload: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Create a new homepage announcement."""
    if not payload.content or not payload.content.strip():
        raise HTTPException(status_code=400, detail="Nội dung không được để trống")
    item = Announcement(
        content=payload.content.strip(),
        icon=payload.icon,
        link=payload.link,
        is_important=bool(payload.is_important),
        display_order=payload.display_order or 0,
        is_active=payload.is_active if payload.is_active is not None else True,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _serialize(item)


@router.put("/announcements/{announcement_id}", response_model=AnnouncementResponse)
async def update_announcement(
    announcement_id: int,
    payload: AnnouncementUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Partially update an announcement."""
    item = (
        db.query(Announcement)
        .filter(Announcement.announcement_id == announcement_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin")
    if payload.content is not None:
        item.content = payload.content.strip()
    if payload.icon is not None:
        item.icon = payload.icon
    if payload.link is not None:
        item.link = payload.link
    if payload.is_important is not None:
        item.is_important = payload.is_important
    if payload.display_order is not None:
        item.display_order = payload.display_order
    if payload.is_active is not None:
        item.is_active = payload.is_active
    db.commit()
    db.refresh(item)
    return _serialize(item)


@router.delete("/announcements/{announcement_id}")
async def delete_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Delete an announcement."""
    item = (
        db.query(Announcement)
        .filter(Announcement.announcement_id == announcement_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin")
    db.delete(item)
    db.commit()
    return {"message": "Đã xóa thông tin"}
