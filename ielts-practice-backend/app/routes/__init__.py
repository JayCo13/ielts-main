from fastapi import APIRouter
from .admin.auth import router as admin_router
from .admin.admin_actions import router as admin_actions_router
from .admin.reading_admin import router as reading_admin_router
from .admin.vip_management import router as admin_vip_router
from .student.student_actions import router as student_actions_router
from .customer.vip_packages import router as customer_vip_router
from .AI.ai import router as ai_router
from .auth import router as auth_router

router = APIRouter()

# Include the admin routes
router.include_router(admin_router)
router.include_router(admin_actions_router, prefix="/admin", tags=["admin"])
router.include_router(reading_admin_router, prefix="/admin/reading", tags=["reading"])
router.include_router(admin_vip_router, prefix="/admin/vip", tags=["admin-vip"])
router.include_router(student_actions_router, prefix="/student", tags=["student"])
router.include_router(customer_vip_router, prefix="/customer/vip", tags=["customer-vip"])
router.include_router(ai_router, prefix="/ai", tags=["ai"])
router.include_router(auth_router, tags=["auth"])


