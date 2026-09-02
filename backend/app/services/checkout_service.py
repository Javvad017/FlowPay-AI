import os
import uuid
from datetime import datetime, timezone
from typing import Any

import razorpay
from dotenv import load_dotenv

from app.services.cart_service import (
    get_cart,
    clear_cart,
)
from app.services.database import get_connection
from app.services.inventory_service import decrement_inventory


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
# Helpers
# ==========================================

def utc_now() -> str:
    return datetime.now(
        timezone.utc
    ).isoformat()


def order_row_to_dict(
    connection,
    order_row,
) -> dict[str, Any] | None:

    if order_row is None:
        return None

    order = dict(order_row)

    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT
            product_id,
            name,
            price,
            quantity
        FROM order_items
        WHERE order_id = ?
        ORDER BY id ASC
        """,
        (order["id"],),
    )

    items = [
        dict(row)
        for row in cursor.fetchall()
    ]

    order["items"] = items

    return order


# ==========================================
# Create Checkout Order
# ==========================================

def create_checkout_order(
    attribution_source: str = "direct_checkout",
) -> dict[str, Any]:

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
    #
    # ₹2,999 -> 299900 paise

    amount_paise = int(
        subtotal * 100
    )

    internal_order_id = (
        f"flowpay_{uuid.uuid4().hex[:12]}"
    )

    created_at = utc_now()

    # ------------------------------------------
    # Create Razorpay order
    # ------------------------------------------

    razorpay_order = (
        razorpay_client.order.create(
            data={
                "amount": amount_paise,
                "currency": "INR",
                "receipt": internal_order_id,
                "notes": {
                    "source": "FlowPay AI",
                    "internal_order_id": (
                        internal_order_id
                    ),
                    "attribution_source": (
                        attribution_source
                    ),
                },
            }
        )
    )

    # ------------------------------------------
    # Save order to SQLite
    # ------------------------------------------

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO orders (
                id,
                razorpay_order_id,
                amount,
                amount_paise,
                currency,
                status,
                razorpay_payment_id,
                attribution_source,
                created_at,
                paid_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                internal_order_id,
                razorpay_order["id"],
                subtotal,
                amount_paise,
                "INR",
                "created",
                None,
                attribution_source,
                created_at,
                None,
            ),
        )

        # --------------------------------------
        # Snapshot cart items
        # --------------------------------------

        for item in cart["items"]:

            cursor.execute(
                """
                INSERT INTO order_items (
                    order_id,
                    product_id,
                    name,
                    price,
                    quantity
                )
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    internal_order_id,
                    item["product_id"],
                    item["name"],
                    item["price"],
                    item["quantity"],
                ),
            )

        connection.commit()

    except Exception:

        connection.rollback()

        raise

    finally:

        connection.close()

    # ------------------------------------------
    # Response
    # ------------------------------------------

    return {
        "order_id": internal_order_id,
        "razorpay_order_id": razorpay_order["id"],
        "amount": amount_paise,
        "currency": "INR",
        "key_id": RAZORPAY_KEY_ID,
        "items": [
            {
                "product_id": item["product_id"],
                "name": item["name"],
                "price": item["price"],
                "quantity": item["quantity"],
            }
            for item in cart["items"]
        ],
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

    connection = get_connection()

    try:

        cursor = connection.cursor()

        # --------------------------------------
        # Get order
        # --------------------------------------

        cursor.execute(
            """
            SELECT *
            FROM orders
            WHERE id = ?
            """,
            (internal_order_id,),
        )

        order_row = cursor.fetchone()

        if order_row is None:
            raise ValueError(
                "Order not found"
            )

        order = dict(order_row)

        # --------------------------------------
        # Verify Razorpay order ID
        # --------------------------------------

        if (
            order["razorpay_order_id"]
            != razorpay_order_id
        ):
            raise ValueError(
                "Razorpay order ID does not match"
            )

        # --------------------------------------
        # Prevent duplicate verification
        # --------------------------------------

        if order["status"] == "paid":

            existing_payment_id = (
                order["razorpay_payment_id"]
            )

            if (
                existing_payment_id
                == razorpay_payment_id
            ):

                updated_order = (
                    order_row_to_dict(
                        connection,
                        order_row,
                    )
                )

                return updated_order

            raise ValueError(
                "Order has already been paid"
            )

        # --------------------------------------
        # Verify Razorpay signature
        # --------------------------------------

        try:

            razorpay_client.utility.verify_payment_signature(
                {
                    "razorpay_order_id": (
                        razorpay_order_id
                    ),
                    "razorpay_payment_id": (
                        razorpay_payment_id
                    ),
                    "razorpay_signature": (
                        razorpay_signature
                    ),
                }
            )

        except Exception:

            cursor.execute(
                """
                UPDATE orders
                SET status = ?
                WHERE id = ?
                """,
                (
                    "payment_verification_failed",
                    internal_order_id,
                ),
            )

            connection.commit()

            raise ValueError(
                "Payment signature verification failed"
            )

        # --------------------------------------
        # Fetch ordered items for inventory deduction
        # --------------------------------------

        cursor.execute(
            """
            SELECT product_id, quantity
            FROM order_items
            WHERE order_id = ?
            """,
            (internal_order_id,),
        )

        order_items = [
            dict(row) for row in cursor.fetchall()
        ]

        # --------------------------------------
        # Decrement inventory atomically
        # (uses same connection = same transaction)
        # --------------------------------------

        decrement_inventory(order_items, connection=connection)

        # --------------------------------------
        # Mark order as paid
        # --------------------------------------

        paid_at = utc_now()

        cursor.execute(
            """
            UPDATE orders
            SET
                status = ?,
                razorpay_payment_id = ?,
                paid_at = ?
            WHERE id = ?
            """,
            (
                "paid",
                razorpay_payment_id,
                paid_at,
                internal_order_id,
            ),
        )

        connection.commit()

        # --------------------------------------
        # Clear server-side cart
        # --------------------------------------

        clear_cart()

        # --------------------------------------
        # Return updated order
        # --------------------------------------

        cursor.execute(
            """
            SELECT *
            FROM orders
            WHERE id = ?
            """,
            (internal_order_id,),
        )

        updated_row = cursor.fetchone()

        return order_row_to_dict(
            connection,
            updated_row,
        )

    finally:

        connection.close()


# ==========================================
# Get Order
# ==========================================

def get_order(
    internal_order_id: str,
) -> dict[str, Any] | None:

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT *
            FROM orders
            WHERE id = ?
            """,
            (internal_order_id,),
        )

        row = cursor.fetchone()

        return order_row_to_dict(
            connection,
            row,
        )

    finally:

        connection.close()


# ==========================================
# Get All Orders
# ==========================================

def get_all_orders() -> list[dict[str, Any]]:

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT *
            FROM orders
            ORDER BY created_at DESC
            """
        )

        rows = cursor.fetchall()

        return [
            order_row_to_dict(
                connection,
                row,
            )
            for row in rows
        ]

    finally:

        connection.close()