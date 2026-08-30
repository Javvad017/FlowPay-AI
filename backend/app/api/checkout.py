from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.checkout_service import (
    create_checkout_order,
    verify_payment,
    get_order,
    get_all_orders,
)


router = APIRouter(
    prefix="/api/checkout",
    tags=["Checkout"],
)


# ==========================================
# Checkout Creation Request
# ==========================================

class CreateCheckoutRequest(BaseModel):
    attribution_source: str = "direct_checkout"


# ==========================================
# Payment Verification Request
# ==========================================

class VerifyPaymentRequest(BaseModel):
    order_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


# ==========================================
# Create Razorpay Order
# ==========================================

@router.post("/create")
def create_order(
    request: CreateCheckoutRequest,
):
    try:
        return create_checkout_order(
            attribution_source=request.attribution_source
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:
        print(
            f"Checkout creation error: {error}"
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to create payment order",
        )


# ==========================================
# Verify Payment
# ==========================================

@router.post("/verify")
def verify_order(
    request: VerifyPaymentRequest,
):
    try:
        order = verify_payment(
            internal_order_id=request.order_id,
            razorpay_payment_id=request.razorpay_payment_id,
            razorpay_order_id=request.razorpay_order_id,
            razorpay_signature=request.razorpay_signature,
        )

        return {
            "success": True,
            "message": "Payment verified successfully",
            "order": order,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:
        print(
            f"Payment verification error: {error}"
        )

        raise HTTPException(
            status_code=500,
            detail="Payment verification failed",
        )


# ==========================================
# Get All Orders
# ==========================================

@router.get("/orders")
def get_checkout_orders():

    orders = get_all_orders()

    return {
        "success": True,
        "orders": orders,
        "total_orders": len(orders),
    }


# ==========================================
# Get Order
# ==========================================

@router.get("/{order_id}")
def get_checkout_order(
    order_id: str,
):

    order = get_order(order_id)

    if order is None:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    return order