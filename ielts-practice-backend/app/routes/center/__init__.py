from fastapi import APIRouter
from app.routes.center.center_actions import router as center_actions_router
from app.routes.center.center_management import router as center_management_router
from app.routes.center.center_wallet import router as center_wallet_router

router = APIRouter()
router.include_router(center_actions_router, tags=["center"])
router.include_router(center_management_router, tags=["center"])
router.include_router(center_wallet_router, tags=["center"])
