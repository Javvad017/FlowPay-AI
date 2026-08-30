from __future__ import annotations

from collections import defaultdict
from typing import Any

from app.services.checkout_service import get_all_orders


# ==========================================
# Revenue Attribution
# ==========================================

def get_attribution() -> dict[str, Any]:
    """
    Calculate revenue attribution from all
    paid orders stored in SQLite.
    """

    all_orders = get_all_orders()

    paid_orders = [
        order
        for order in all_orders
        if order.get("status") == "paid"
    ]

    by_source: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "orders": 0,
            "revenue": 0,
            "items": 0,
        }
    )

    # ------------------------------------------
    # Calculate attribution
    # ------------------------------------------

    for order in paid_orders:

        source = order.get(
            "attribution_source",
            "direct_checkout",
        )

        bucket = by_source[source]

        bucket["orders"] += 1

        bucket["revenue"] += order.get(
            "amount",
            0,
        )

        bucket["items"] += sum(
            item["quantity"]
            for item in order.get(
                "items",
                [],
            )
        )

    # ------------------------------------------
    # Final response
    # ------------------------------------------

    return {
        "success": True,
        "total_paid_orders": len(
            paid_orders
        ),
        "total_revenue": sum(
            order.get("amount", 0)
            for order in paid_orders
        ),
        "sources": dict(by_source),
    }