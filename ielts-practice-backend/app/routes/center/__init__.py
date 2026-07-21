from fastapi import APIRouter
from app.routes.center.center_actions import router as center_actions_router

router = APIRouter()
router.include_router(center_actions_router, tags=["center"])
