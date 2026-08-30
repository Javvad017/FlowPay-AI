from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.services.checkout_service import get_order
from app.services.database import get_connection


RECOVERABLE_STATUSES = {"created"}


# ==========================================
# Recovery Message
# ==========================================

def _recovery_message(
    order: dict[str, Any],
) -> str:

    return (
        f"Your FlowPay checkout for "
        f"₹{order['amount']:,.0f} is still pending. "
        "Complete payment to finish your purchase."
    )


# ==========================================
# Get Recovery Opportunities
# ==========================================

def get_recovery_opportunities() -> list[dict[str, Any]]:
    """
    Return unpaid checkout orders that can
    be targeted by the recovery agent.
    """

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT *
            FROM orders
            WHERE status = ?
            ORDER BY created_at DESC
            """,
            ("created",),
        )

        rows = cursor.fetchall()

        opportunities: list[dict[str, Any]] = []

        for row in rows:

            order = get_order(
                row["id"]
            )

            if order is None:
                continue

            cursor.execute(
                """
                SELECT attempted_at
                FROM recovery_attempts
                WHERE order_id = ?
                ORDER BY id DESC
                LIMIT 1
                """,
                (order["id"],),
            )

            recovery_row = cursor.fetchone()

            recovery_attempted_at = (
                recovery_row["attempted_at"]
                if recovery_row
                else None
            )

            opportunities.append(
                {
                    "order_id": order["id"],
                    "razorpay_order_id": (
                        order["razorpay_order_id"]
                    ),
                    "amount": order["amount"],
                    "currency": order["currency"],
                    "items": order["items"],
                    "status": "recoverable",
                    "recovery_message": (
                        _recovery_message(order)
                    ),
                    "recovery_attempted": (
                        recovery_attempted_at
                        is not None
                    ),
                    "recovery_attempted_at": (
                        recovery_attempted_at
                    ),
                }
            )

        return opportunities

    finally:

        connection.close()


# ==========================================
# Initiate Recovery
# ==========================================

def initiate_recovery(
    order_id: str,
) -> dict[str, Any]:

    order = get_order(order_id)

    if order is None:
        raise ValueError(
            "Order not found"
        )

    if order.get("status") not in RECOVERABLE_STATUSES:
        raise ValueError(
            "Order is not eligible for recovery"
        )

    now = datetime.now(
        timezone.utc
    ).isoformat()

    connection = get_connection()

    try:

        cursor = connection.cursor()

        # --------------------------------------
        # Record recovery attempt
        # --------------------------------------

        cursor.execute(
            """
            INSERT INTO recovery_attempts (
                order_id,
                attempted_at
            )
            VALUES (?, ?)
            """,
            (
                order_id,
                now,
            ),
        )

        connection.commit()

    except Exception:

        connection.rollback()

        raise

    finally:

        connection.close()

    message = _recovery_message(order)

    return {
        "success": True,
        "order_id": order_id,
        "status": "recovery_initiated",
        "message": message,
        "recovery_attempted_at": now,
    }