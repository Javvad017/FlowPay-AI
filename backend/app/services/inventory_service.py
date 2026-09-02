"""
Inventory Service
=================
Single source of truth for product stock levels.

All reads and writes go through the SQLite `inventory` table.
Never read stock from PRODUCTS directly at runtime.
"""

from __future__ import annotations

from typing import Any

from app.services.database import get_connection


# ==========================================
# Get single product inventory
# ==========================================

def get_inventory(product_id: str) -> int:
    """Return the current stock quantity for *product_id*.
    Returns 0 if the product has no inventory row (safe default)."""

    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT quantity
            FROM inventory
            WHERE product_id = ?
            """,
            (product_id,),
        )

        row = cursor.fetchone()

        if row is None:
            return 0

        return int(row["quantity"])

    finally:
        connection.close()


# ==========================================
# Get all product inventory
# ==========================================

def get_all_inventory() -> list[dict[str, Any]]:
    """Return a list of {product_id, quantity, initial_quantity} rows."""

    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT product_id, quantity, initial_quantity
            FROM inventory
            ORDER BY product_id ASC
            """
        )

        return [dict(row) for row in cursor.fetchall()]

    finally:
        connection.close()


# ==========================================
# Decrement inventory — atomic, transactional
# ==========================================

def decrement_inventory(
    items: list[dict[str, Any]],
    connection=None,
) -> None:
    """Atomically deduct stock for each item in *items*.

    Each item must have:
        product_id: str
        quantity:   int

    Rules:
    - All deductions succeed together or none at all (single transaction).
    - Raises ValueError if any product has insufficient stock.
    - Never allows quantity to go below 0.

    Pass an open *connection* to run inside the caller's transaction.
    If no connection is given, the function opens and manages its own.
    """

    owns_connection = connection is None

    if owns_connection:
        connection = get_connection()

    try:
        cursor = connection.cursor()

        for item in items:
            product_id: str = item["product_id"]
            qty: int = int(item["quantity"])

            # Fetch current stock with a row-level read inside the transaction
            cursor.execute(
                """
                SELECT quantity
                FROM inventory
                WHERE product_id = ?
                """,
                (product_id,),
            )

            row = cursor.fetchone()

            if row is None:
                if owns_connection:
                    connection.rollback()
                raise ValueError(
                    f"Inventory record not found for product '{product_id}'"
                )

            current_qty = int(row["quantity"])

            if current_qty < qty:
                if owns_connection:
                    connection.rollback()
                raise ValueError(
                    f"Insufficient inventory for product '{product_id}' "
                    f"(requested {qty}, available {current_qty})"
                )

            # Safe deduction — WHERE clause prevents going below 0
            cursor.execute(
                """
                UPDATE inventory
                SET quantity = quantity - ?
                WHERE product_id = ?
                  AND quantity >= ?
                """,
                (qty, product_id, qty),
            )

            if cursor.rowcount == 0:
                # Race condition: another request beat us
                if owns_connection:
                    connection.rollback()
                raise ValueError(
                    f"Insufficient inventory for product '{product_id}' "
                    f"(concurrent update detected)"
                )

        if owns_connection:
            connection.commit()

    except Exception:
        if owns_connection:
            connection.rollback()
        raise

    finally:
        if owns_connection:
            connection.close()


# ==========================================
# Reset all inventory to initial values
# ==========================================

def reset_inventory() -> None:
    """Restore every product's quantity to its initial_quantity."""

    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            UPDATE inventory
            SET quantity = initial_quantity
            """
        )

        connection.commit()

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()
