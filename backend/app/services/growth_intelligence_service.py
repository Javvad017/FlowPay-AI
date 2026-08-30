from __future__ import annotations

from typing import Any

from app.services.checkout_service import get_all_orders
from app.api.catalog import PRODUCTS


# ==========================================
# Configuration
# ==========================================

SOURCE_NAMES = {
    "ai_recommendation": "AI Recommendation",
    "cross_sell": "Cross-sell",
    "recovery": "Recovery",
    "direct_checkout": "Direct Checkout",
}


# ==========================================
# Helpers
# ==========================================

def _source_name(source: str) -> str:
    return SOURCE_NAMES.get(
        source,
        source.replace("_", " ").title(),
    )


def _get_paid_orders(
    orders: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    return [
        order
        for order in orders
        if order.get("status") == "paid"
    ]


def _get_pending_orders(
    orders: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    return [
        order
        for order in orders
        if order.get("status") == "created"
    ]


def _get_product_stats(
    paid_orders: list[dict[str, Any]],
) -> dict[str, dict[str, Any]]:

    products: dict[str, dict[str, Any]] = {}

    for order in paid_orders:
        source = order.get(
            "attribution_source",
            "direct_checkout",
        )

        for item in order.get("items", []):

            product_id = item.get(
                "product_id",
                "unknown",
            )

            quantity = int(
                item.get("quantity", 0)
            )

            price = float(
                item.get("price", 0)
            )

            if product_id not in products:
                products[product_id] = {
                    "product_id": product_id,
                    "name": item.get(
                        "name",
                        "Unknown Product",
                    ),
                    "units": 0,
                    "revenue": 0,
                    "sources": {},
                }

            products[product_id]["units"] += quantity

            products[product_id]["revenue"] += (
                price * quantity
            )

            products[product_id]["sources"][source] = (
                products[product_id]["sources"].get(
                    source,
                    0,
                )
                + price * quantity
            )

    return products


# ==========================================
# Growth Intelligence
# ==========================================

def get_growth_intelligence() -> dict[str, Any]:

    orders = get_all_orders()

    paid_orders = _get_paid_orders(orders)
    pending_orders = _get_pending_orders(orders)

    total_revenue = sum(
        float(order.get("amount", 0))
        for order in paid_orders
    )

    paid_count = len(paid_orders)
    total_count = len(orders)

    conversion_rate = (
        (paid_count / total_count) * 100
        if total_count
        else 0
    )

    average_order_value = (
        total_revenue / paid_count
        if paid_count
        else 0
    )

    actions: list[dict[str, Any]] = []

    # ==========================================
    # 1. Recovery Opportunity
    # ==========================================

    if pending_orders:

        pending_value = sum(
            float(order.get("amount", 0))
            for order in pending_orders
        )

    # Keep the actual internal order IDs so the
    # frontend can execute the recovery action.
        pending_order_ids = [
             order.get("id")
            for order in pending_orders
            if order.get("id")
        ]

        actions.append(
            {
                "priority": "high",
                "type": "recovery",
                "title": "Recover abandoned checkouts",
                "message": (
                    f"{len(pending_orders)} checkout(s) "
                    f"worth ₹{pending_value:,.0f} "
                    "are still pending."
                ),
             "action": "recover_pending_orders",
                "evidence": {
                    "pending_orders": len(
                        pending_orders
                    ),
                    "pending_value": round(
                        pending_value,
                        2,
                    ),
                    "order_ids": pending_order_ids,
                },
            }
        )

    # ==========================================
    # 2. Conversion Opportunity
    # ==========================================

    if total_count >= 2 and conversion_rate < 50:

        actions.append(
            {
                "priority": "high",
                "type": "conversion",
                "title": "Improve checkout conversion",
                "message": (
                    f"Current checkout conversion is "
                    f"{conversion_rate:.1f}%. "
                    "Use recovery and AI recommendations "
                    "to reduce checkout drop-off."
                ),
                "action": "optimize_conversion",
                "evidence": {
                    "total_orders": total_count,
                    "paid_orders": paid_count,
                    "conversion_rate": round(
                        conversion_rate,
                        1,
                    ),
                },
            }
        )

    # ==========================================
    # 3. Product Opportunity
    # ==========================================

    product_stats = _get_product_stats(
        paid_orders
    )

    if product_stats:

        top_product = max(
            product_stats.values(),
            key=lambda product: product["revenue"],
        )

        top_product_name = top_product["name"]
        top_product_revenue = top_product["revenue"]

        actions.append(
            {
                "priority": "medium",
                "type": "product",
                "title": (
                    f"Increase {top_product_name} "
                    "basket value"
                ),
                "message": (
                    f"{top_product_name} is currently "
                    f"your strongest product with "
                    f"₹{top_product_revenue:,.0f} "
                    "in confirmed revenue. "
                    "Use complementary products to "
                    "increase order value."
                ),
                "action": "activate_cross_sell",
                "evidence": {
                    "product_id": top_product[
                        "product_id"
                    ],
                    "product": top_product_name,
                    "revenue": round(
                        top_product_revenue,
                        2,
                    ),
                    "units": top_product["units"],
                },
            }
        )

    # ==========================================
    # 4. AOV Opportunity
    # ==========================================

    if paid_count > 0 and average_order_value < 5000:

        actions.append(
            {
                "priority": "medium",
                "type": "aov",
                "title": "Increase average order value",
                "message": (
                    f"Current average order value is "
                    f"₹{average_order_value:,.0f}. "
                    "Use bundles and cross-sells to "
                    "increase basket size."
                ),
                "action": "increase_aov",
                "evidence": {
                    "average_order_value": round(
                        average_order_value,
                        2,
                    ),
                },
            }
        )

    # ==========================================
    # 5. Attribution Opportunity
    # ==========================================

    source_revenue: dict[str, float] = {}

    for order in paid_orders:

        source = order.get(
            "attribution_source",
            "direct_checkout",
        )

        source_revenue[source] = (
            source_revenue.get(source, 0)
            + float(order.get("amount", 0))
        )

    if source_revenue:

        strongest_source = max(
            source_revenue,
            key=source_revenue.get,
        )

        strongest_revenue = source_revenue[
            strongest_source
        ]

        percentage = (
            strongest_revenue / total_revenue * 100
            if total_revenue
            else 0
        )

        actions.append(
            {
                "priority": "low",
                "type": "attribution",
                "title": (
                    f"{_source_name(strongest_source)} "
                    "is your strongest revenue channel"
                ),
                "message": (
                    f"{_source_name(strongest_source)} "
                    f"generated ₹{strongest_revenue:,.0f}, "
                    f"representing {percentage:.1f}% "
                    "of confirmed revenue."
                ),
                "action": "scale_best_channel",
                "evidence": {
                    "source": strongest_source,
                    "source_label": _source_name(
                        str(strongest_source)
                    ),
                    "revenue": round(
                        strongest_revenue,
                        2,
                    ),
                    "percentage": round(
                        percentage,
                        1,
                    ),
                },
            }
        )

    # ==========================================
    # Sort actions by priority
    # ==========================================

    priority_order = {
        "high": 0,
        "medium": 1,
        "low": 2,
    }

    actions.sort(
        key=lambda action: priority_order.get(
            action["priority"],
            99,
        )
    )

    # ==========================================
    # Health
    # ==========================================

    if not orders:
        health = "no_data"

    elif pending_orders and conversion_rate < 50:
        health = "needs_attention"

    elif conversion_rate >= 70:
        health = "strong"

    else:
        health = "good"

    # ==========================================
    # Summary
    # ==========================================

    if not orders:

        summary = (
            "FlowPay has no transaction data yet. "
            "Run an AI recommendation, cross-sell, "
            "or checkout to generate merchant intelligence."
        )

    else:

        summary = (
            f"FlowPay analyzed {len(orders)} order(s), "
            f"{paid_count} paid order(s), and "
            f"₹{total_revenue:,.0f} in confirmed revenue. "
            f"{len(actions)} growth action(s) detected."
        )

    return {
        "success": True,
        "generated_by": "FlowPay Growth Intelligence",
        "health": health,
        "summary": summary,
        "metrics": {
            "total_orders": total_count,
            "paid_orders": paid_count,
            "pending_orders": len(
                pending_orders
            ),
            "total_revenue": round(
                total_revenue,
                2,
            ),
            "conversion_rate": round(
                conversion_rate,
                1,
            ),
            "average_order_value": round(
                average_order_value,
                2,
            ),
        },
        "actions": actions,
    }
