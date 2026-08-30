from fastapi import APIRouter

from app.services.database import reset_demo_data
from app.services.cart_service import clear_cart


router = APIRouter(
    prefix="/api/demo",
    tags=["Demo"],
)


@router.post("/reset")
def reset_demo():

    # Clear SQLite data
    reset_demo_data()

    # Clear in-memory cart
    clear_cart()

    return {
        "success": True,
        "message": "Demo data reset successfully.",
    }