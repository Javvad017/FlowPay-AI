from __future__ import annotations

from fastapi import APIRouter

from app.services.attribution_service import get_attribution
from app.services.checkout_service import orders
from app.services.recovery_service import get_recovery_opportunities


router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


def _paid_orders():
    return [o for o in orders.values() if o.get("status") == "paid"]


def _pending_orders():
    return [
        o for o in orders.values()
        if o.get("status") in {"created", "recovery_initiated"}
    ]


def _items_sold():
    return sum(
        item["quantity"]
        for order in _paid_orders()
        for item in order.get("items", [])
    )


@router.get("/stats")
def get_dashboard_stats():
    paid = _paid_orders()
    pending = _pending_orders()
    total = len(paid) + len(pending)

    revenue = sum(order.get("amount", 0) for order in paid)
    conversion_rate = round((len(paid) / total) * 100, 1) if total else 0

    attribution = get_attribution()
    ai_bucket = attribution["sources"].get(
        "ai_recommendation",
        {"orders": 0, "revenue": 0, "items": 0},
    )

    recoverable = get_recovery_opportunities()
    recoverable_value = sum(item["amount"] for item in recoverable)

    return {
        # Existing dashboard fields kept for frontend compatibility.
        "ai_assisted_revenue": ai_bucket["revenue"],
        "ai_assisted_revenue_change": 0,
        "conversations": 0,
        "conversations_change": 0,
        "high_intent_customers": 0,
        "high_intent_customers_change": 0,
        "conversion_rate": conversion_rate,
        "conversion_rate_change": 0,
        "recommendations": _items_sold(),
        "conversions": len(paid),
        "recovered_carts": sum(
            1 for order in orders.values()
            if order.get("recovery_status") == "initiated"
        ),
        "upsell_revenue": 0,

        # Live payment metrics.
        "paid_revenue": revenue,
        "paid_orders": len(paid),
        "pending_orders": len(pending),
        "items_sold": _items_sold(),

        # Growth-agent metrics.
        "recoverable_carts": len(recoverable),
        "recoverable_revenue": recoverable_value,
        "ai_attributed_revenue": ai_bucket["revenue"],
        "ai_attributed_orders": ai_bucket["orders"],
    }


@router.get("/activity")
def get_recent_activity():
    activity = []

    for order in sorted(
        orders.values(),
        key=lambda item: item["id"],
        reverse=True,
    )[:10]:
        status = order.get("status", "unknown")

        if status == "paid":
            action = "AI checkout → Payment confirmed"
            display_status = "Paid"
        elif status in {"created", "recovery_initiated"}:
            action = "Cart recovery opportunity"
            display_status = "Pending"
        else:
            action = "Payment workflow"
            display_status = status.replace("_", " ").title()

        activity.append(
            {
                "customer": "FlowPay Customer",
                "action": action,
                "amount": order.get("amount", 0),
                "status": display_status,
                "order_id": order.get("id"),
            }
        )

    return activity
