from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.cart_service import (
    add_to_cart,
    get_cart,
    remove_from_cart,
)


router = APIRouter(
    prefix="/api/cart",
    tags=["Cart"],
)


# ==========================================
# Request Models
# ==========================================

class AddToCartRequest(BaseModel):
    product_id: str
    quantity: int = 1


class RemoveFromCartRequest(BaseModel):
    product_id: str


# ==========================================
# Get Cart
# ==========================================

@router.get("")
def get_current_cart():
    return get_cart()


# ==========================================
# Add Product
# ==========================================

@router.post("/add")
def add_product(
    request: AddToCartRequest,
):

    try:

        return add_to_cart(
            product_id=request.product_id,
            quantity=request.quantity,
        )

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )


# ==========================================
# Remove Product
# ==========================================

@router.post("/remove")
def remove_product(
    request: RemoveFromCartRequest,
):

    return remove_from_cart(
        product_id=request.product_id,
    )