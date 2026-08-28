from typing import Any

from app.api.catalog import PRODUCTS


# ==========================================
# In-memory cart
# ==========================================

cart: dict[str, Any] = {
    "items": []
}


# ==========================================
# Add to cart
# ==========================================

def add_to_cart(
    product_id: str,
    quantity: int = 1,
) -> dict[str, Any]:

    if quantity < 1:
        raise ValueError(
            "Quantity must be at least 1"
        )

    product = next(
        (
            product
            for product in PRODUCTS
            if product["id"] == product_id
        ),
        None,
    )

    if product is None:
        raise ValueError(
            "Product not found"
        )

    if product["inventory"] < quantity:
        raise ValueError(
            "Not enough inventory"
        )

    # Check if product already exists
    existing_item = next(
        (
            item
            for item in cart["items"]
            if item["product_id"] == product_id
        ),
        None,
    )

    if existing_item:

        new_quantity = (
            existing_item["quantity"]
            + quantity
        )

        if product["inventory"] < new_quantity:
            raise ValueError(
                "Not enough inventory"
            )

        existing_item["quantity"] = new_quantity

    else:

        cart["items"].append(
            {
                "product_id": product["id"],
                "name": product["name"],
                "price": product["price"],
                "quantity": quantity,
            }
        )

    return get_cart()


# ==========================================
# Remove from cart
# ==========================================

def remove_from_cart(
    product_id: str,
) -> dict[str, Any]:

    cart["items"] = [
        item
        for item in cart["items"]
        if item["product_id"] != product_id
    ]

    return get_cart()


# ==========================================
# Get cart
# ==========================================

def get_cart() -> dict[str, Any]:

    subtotal = sum(
        item["price"] * item["quantity"]
        for item in cart["items"]
    )

    total_items = sum(
        item["quantity"]
        for item in cart["items"]
    )

    return {
        "items": cart["items"],
        "total_items": total_items,
        "subtotal": subtotal,
    }

    # ==========================================
# Clear cart
# ==========================================

def clear_cart() -> dict[str, Any]:
    cart["items"] = []
    return get_cart()