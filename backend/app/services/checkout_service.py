import os
import uuid
from typing import Any

import razorpay
from dotenv import load_dotenv

from app.services.cart_service import (
    get_cart,
    clear_cart,
)


load_dotenv()


# ==========================================
# Razorpay Configuration
# ==========================================

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")


if not RAZORPAY_KEY_ID:
    raise RuntimeError(
        "RAZORPAY_KEY_ID is missing from backend/.env"
    )


if not RAZORPAY_KEY_SECRET:
    raise RuntimeError(
        "RAZORPAY_KEY_SECRET is missing from backend/.env"
    )


razorpay_client = razorpay.Client(
    auth=(
        RAZORPAY_KEY_ID,
        RAZORPAY_KEY_SECRET,
    )
)


# ==========================================
# In-memory checkout orders
# ==========================================

orders: dict[str, dict[str, Any]] = {}


# ==========================================
# Create Checkout Order
# ==========================================

def create_checkout_order() -> dict[str, Any]:

    cart = get_cart()

    if not cart["items"]:
        raise ValueError(
            "Cart is empty"
        )

    subtotal = cart["subtotal"]

    if subtotal <= 0:
        raise ValueError(
            "Invalid cart amount"
        )

    # Razorpay expects the amount
    # in the smallest currency unit.
    # ₹2,999 -> 299900 paise

    amount_paise = int(subtotal * 100)

    internal_order_id = (
        f"flowpay_{uuid.uuid4().hex[:12]}"
    )

    razorpay_order = razorpay_client.order.create(
        data={
            "amount": amount_paise,
            "currency": "INR",
            "receipt": internal_order_id,
            "notes": {
                "source": "FlowPay AI",
                "internal_order_id": internal_order_id,
            },
        }
    )

    # Snapshot cart items at order creation.
    # This is important because the cart can change later.

    orders[internal_order_id] = {
        "id": internal_order_id,
        "razorpay_order_id": razorpay_order["id"],
        "items": [
            {
                "product_id": item["product_id"],
                "name": item["name"],
                "price": item["price"],
                "quantity": item["quantity"],
            }
            for item in cart["items"]
        ],
        "amount": subtotal,
        "amount_paise": amount_paise,
        "currency": "INR",
        "status": "created",
        "razorpay_payment_id": None,
    }

    return {
        "order_id": internal_order_id,
        "razorpay_order_id": razorpay_order["id"],
        "amount": amount_paise,
        "currency": "INR",
        "key_id": RAZORPAY_KEY_ID,
        "items": orders[internal_order_id]["items"],
    }


# ==========================================
# Verify Payment
# ==========================================

def verify_payment(
    internal_order_id: str,
    razorpay_payment_id: str,
    razorpay_order_id: str,
    razorpay_signature: str,
) -> dict[str, Any]:

    order = orders.get(
        internal_order_id
    )

    if order is None:
        raise ValueError(
            "Order not found"
        )

    # Never trust a client-supplied order ID.
    # Compare it with our server-side record.

    if (
        order["razorpay_order_id"]
        != razorpay_order_id
    ):
        raise ValueError(
            "Razorpay order ID does not match"
        )

    try:

        razorpay_client.utility.verify_payment_signature(
            {
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": razorpay_signature,
            }
        )

    except Exception:

        order["status"] = "payment_verification_failed"

        raise ValueError(
            "Payment signature verification failed"
        )

    order["status"] = "paid"

    order["razorpay_payment_id"] = (
        razorpay_payment_id
    )
    
    clear_cart()

    return order


# ==========================================
# Get Order
# ==========================================

def get_order(
    internal_order_id: str,
) -> dict[str, Any] | None:

    return orders.get(
        internal_order_id
    )

# ==========================================
# Get All Orders
# ==========================================

def get_all_orders() -> list[dict[str, Any]]:
    return list(orders.values())