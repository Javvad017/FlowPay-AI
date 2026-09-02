from __future__ import annotations

from typing import Any

from app.api.catalog import PRODUCTS
from app.services.database import get_connection



# ==========================================
# Find Product
# ==========================================

def _get_product(
    product_id: str,
) -> dict[str, Any] | None:

    return next(
        (
            product
            for product in PRODUCTS
            if product["id"] == product_id
        ),
        None,
    )


# ==========================================
# Add to Cart
# ==========================================

def add_to_cart(
    product_id: str,
    quantity: int = 1,
) -> dict[str, Any]:

    if quantity < 1:
        raise ValueError(
            "Quantity must be at least 1"
        )

    product = _get_product(product_id)

    if product is None:
        raise ValueError(
            "Product not found"
        )

    if product.get("inventory", 0) < quantity:
        raise ValueError(
            "Not enough inventory"
        )

    connection = get_connection()

    try:

        cursor = connection.cursor()

        # --------------------------------------
        # Check existing cart item
        # --------------------------------------

        cursor.execute(
            """
            SELECT *
            FROM cart_items
            WHERE product_id = ?
            """,
            (product_id,),
        )

        existing_item = cursor.fetchone()

        if existing_item:

            existing_quantity = int(
                existing_item["quantity"]
            )

            new_quantity = (
                existing_quantity + quantity
            )

            if product.get("inventory", 0) < new_quantity:
                raise ValueError(
                    "Not enough inventory"
                )

            cursor.execute(
                """
                UPDATE cart_items
                SET
                    quantity = ?,
                    name = ?,
                    price = ?
                WHERE product_id = ?
                """,
                (
                    new_quantity,
                    product["name"],
                    product["price"],
                    product_id,
                ),
            )

        else:

            cursor.execute(
                """
                INSERT INTO cart_items (
                    product_id,
                    name,
                    price,
                    quantity
                )
                VALUES (?, ?, ?, ?)
                """,
                (
                    product["id"],
                    product["name"],
                    product["price"],
                    quantity,
                ),
            )

        connection.commit()

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()

    return get_cart()


# ==========================================
# Remove from Cart
# ==========================================

def remove_from_cart(
    product_id: str,
) -> dict[str, Any]:

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            DELETE FROM cart_items
            WHERE product_id = ?
            """,
            (product_id,),
        )

        connection.commit()

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()

    return get_cart()


# ==========================================
# Clear Cart
# ==========================================

def clear_cart() -> dict[str, Any]:

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            DELETE FROM cart_items
            """
        )

        connection.commit()

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()

    return get_cart()


# ==========================================
# Get Cart
# ==========================================

def get_cart() -> dict[str, Any]:

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                product_id,
                name,
                price,
                quantity
            FROM cart_items
            ORDER BY id ASC
            """
        )

        rows = cursor.fetchall()

        items = [
            {
                "product_id": row["product_id"],
                "name": row["name"],
                "price": float(row["price"]),
                "quantity": int(row["quantity"]),
            }
            for row in rows
        ]

    finally:
        connection.close()

    subtotal = sum(
        item["price"] * item["quantity"]
        for item in items
    )

    total_items = sum(
        item["quantity"]
        for item in items
    )

    return {
        "items": items,
        "total_items": total_items,
        "subtotal": round(subtotal, 2),
    }