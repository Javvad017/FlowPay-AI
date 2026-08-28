from fastapi import APIRouter

from app.services.checkout_service import get_all_orders


router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"],
)


@router.get("/stats")
def get_dashboard_stats():
    orders = get_all_orders()

    paid_orders = [
        order for order in orders
        if order.get("status") == "paid"
    ]

    pending_orders = [
        order for order in orders
        if order.get("status") == "created"
    ]

    paid_revenue = sum(
        float(order.get("amount", 0))
        for order in paid_orders
    )

    items_sold = sum(
        int(item.get("quantity", 0))
        for order in paid_orders
        for item in order.get("items", [])
    )

    paid_count = len(paid_orders)
    total_count = len(orders)

    conversion_rate = (
        round((paid_count / total_count) * 100, 1)
        if total_count
        else 0
    )

    average_order_value = (
        round(paid_revenue / paid_count)
        if paid_count
        else 0
    )

    return {
        "ai_assisted_revenue": paid_revenue,
        "ai_assisted_revenue_change": 0,
        "conversations": 0,
        "conversations_change": 0,
        "high_intent_customers": 0,
        "high_intent_customers_change": 0,
        "conversion_rate": conversion_rate,
        "conversion_rate_change": 0,
        "recommendations": items_sold,
        "conversions": paid_count,
        "recovered_carts": len(pending_orders),
        "upsell_revenue": average_order_value,
    }


@router.get("/activity")
def get_recent_activity():
    orders = list(reversed(get_all_orders()))
    activity = []

    for order in orders:
        items = order.get("items", [])

        item_summary = ", ".join(
            f"{item.get('name', 'Product')} × {item.get('quantity', 0)}"
            for item in items
        )

        status = str(order.get("status", "unknown"))

        if status == "paid":
            display_status = "Paid"
        elif status == "created":
            display_status = "Pending"
        elif status == "payment_verification_failed":
            display_status = "Failed"
        else:
            display_status = status.replace("_", " ").title()

        activity.append({
            "customer": display_status,
            "action": item_summary or "Checkout activity",
            "amount": float(order.get("amount", 0)),
            "status": display_status,
            "order_id": order.get("id"),
        })

    return activity
