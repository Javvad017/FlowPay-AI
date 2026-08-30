from fastapi import APIRouter

from app.services.checkout_service import get_all_orders


router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"],
)


# ==========================================
# Dashboard Stats
# ==========================================

@router.get("/stats")
def get_dashboard_stats():
    orders = get_all_orders()

    paid_orders = [
        order
        for order in orders
        if order.get("status") == "paid"
    ]

    pending_orders = [
        order
        for order in orders
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

    # Attribution breakdown
    ai_revenue = sum(
        float(order.get("amount", 0))
        for order in paid_orders
        if order.get("attribution_source")
        == "ai_recommendation"
    )

    cross_sell_revenue = sum(
        float(order.get("amount", 0))
        for order in paid_orders
        if order.get("attribution_source")
        == "cross_sell"
    )

    recovery_revenue = sum(
        float(order.get("amount", 0))
        for order in paid_orders
        if order.get("attribution_source")
        == "recovery"
    )

    direct_revenue = sum(
        float(order.get("amount", 0))
        for order in paid_orders
        if order.get("attribution_source")
        in (None, "", "direct_checkout")
    )

    return {
        # Existing dashboard fields
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

        # Revenue intelligence
        "total_revenue": paid_revenue,
        "ai_revenue": ai_revenue,
        "cross_sell_revenue": cross_sell_revenue,
        "recovery_revenue": recovery_revenue,
        "direct_revenue": direct_revenue,
        "ai_orders": sum(
            1
            for order in paid_orders
            if order.get("attribution_source")
            == "ai_recommendation"
        ),
        "cross_sell_orders": sum(
            1
            for order in paid_orders
            if order.get("attribution_source")
            == "cross_sell"
        ),
        "recovery_orders": sum(
            1
            for order in paid_orders
            if order.get("attribution_source")
            == "recovery"
        ),
        "direct_orders": sum(
            1
            for order in paid_orders
            if order.get("attribution_source")
            in (None, "", "direct_checkout")
        ),
    }


# ==========================================
# Revenue Intelligence
# ==========================================

@router.get("/revenue-intelligence")
def get_revenue_intelligence():
    orders = get_all_orders()

    paid_orders = [
        order
        for order in orders
        if order.get("status") == "paid"
    ]

    total_revenue = sum(
        float(order.get("amount", 0))
        for order in paid_orders
    )

    source_config = {
        "ai_recommendation": "AI Recommendation",
        "cross_sell": "Cross-sell",
        "recovery": "Recovery",
        "direct_checkout": "Direct Checkout",
    }

    breakdown = {
        key: {
            "label": label,
            "orders": 0,
            "revenue": 0,
            "items": 0,
        }
        for key, label in source_config.items()
    }

    for order in paid_orders:
        source = order.get(
            "attribution_source",
            "direct_checkout",
        )

        if source not in breakdown:
            source = "direct_checkout"

        breakdown[source]["orders"] += 1
        breakdown[source]["revenue"] += float(
            order.get("amount", 0)
        )
        breakdown[source]["items"] += sum(
            int(item.get("quantity", 0))
            for item in order.get("items", [])
        )

    for data in breakdown.values():
        data["revenue"] = round(
            data["revenue"],
            2,
        )

    # Product performance from paid orders.
    products: dict[str, dict] = {}

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

            if product_id not in products:
                products[product_id] = {
                    "product_id": product_id,
                    "name": item.get(
                        "name",
                        "Product",
                    ),
                    "units": 0,
                    "revenue": 0,
                    "sources": {},
                }

            quantity = int(
                item.get("quantity", 0)
            )

            revenue = float(
                item.get("price", 0)
            ) * quantity

            products[product_id]["units"] += quantity
            products[product_id]["revenue"] += revenue

            products[product_id]["sources"][source] = (
                products[product_id]["sources"].get(
                    source,
                    0,
                )
                + revenue
            )

    product_list = list(products.values())

    for product in product_list:
        product["revenue"] = round(
            product["revenue"],
            2,
        )

    product_list.sort(
        key=lambda product: product["revenue"],
        reverse=True,
    )

    return {
        "success": True,
        "total_revenue": round(
            total_revenue,
            2,
        ),
        "paid_orders": len(paid_orders),
        "attribution": list(
            breakdown.values()
        ),
        "top_products": product_list[:5],
    }


# ==========================================
# Recent Activity
# ==========================================

@router.get("/activity")
def get_recent_activity():
    orders = list(
        reversed(get_all_orders())
    )

    activity = []

    for order in orders:
        items = order.get("items", [])

        item_summary = ", ".join(
            f"{item.get('name', 'Product')} × "
            f"{item.get('quantity', 0)}"
            for item in items
        )

        status = str(
            order.get(
                "status",
                "unknown",
            )
        )

        if status == "paid":
            display_status = "Paid"
        elif status == "created":
            display_status = "Pending"
        elif status == "payment_verification_failed":
            display_status = "Failed"
        else:
            display_status = status.replace(
                "_",
                " ",
            ).title()

        activity.append({
            "customer": display_status,
            "action": item_summary
            or "Checkout activity",
            "amount": float(
                order.get("amount", 0)
            ),
            "status": display_status,
            "order_id": order.get("id"),
            "attribution_source": order.get(
                "attribution_source",
                "direct_checkout",
            ),
        })

    return activity

# ==========================================
# AI Merchant Insights
# ==========================================

@router.get("/merchant-insights")
def get_merchant_insights():

    orders = get_all_orders()

    paid_orders = [
        order
        for order in orders
        if order.get("status") == "paid"
    ]

    total_revenue = sum(
        order.get("amount", 0)
        for order in paid_orders
    )

    insights = []

    # ------------------------------------------
    # No sales yet
    # ------------------------------------------

    if not paid_orders:
        return {
            "success": True,
            "generated_by": "FlowPay Merchant Intelligence",
            "summary": "No confirmed sales are available yet.",
            "insights": [
                {
                    "type": "opportunity",
                    "title": "Start generating commerce data",
                    "message": (
                        "Complete a checkout to give FlowPay "
                        "real transaction data to analyze."
                    ),
                    "action": (
                        "Run an AI recommendation or cross-sell "
                        "checkout."
                    ),
                }
            ],
        }

    # ------------------------------------------
    # Attribution analysis
    # ------------------------------------------

    attribution_revenue = {}

    for order in paid_orders:

        source = order.get(
            "attribution_source",
            "direct_checkout",
        )

        attribution_revenue[source] = (
            attribution_revenue.get(source, 0)
            + order.get("amount", 0)
        )

    strongest_source = max(
        attribution_revenue,
        key=attribution_revenue.get,
    )

    strongest_revenue = attribution_revenue[
        strongest_source
    ]

    percentage = (
        strongest_revenue / total_revenue * 100
        if total_revenue > 0
        else 0
    )

    source_names = {
        "ai_recommendation": "AI Recommendation",
        "cross_sell": "Cross-sell",
        "recovery": "Recovery",
        "direct_checkout": "Direct Checkout",
    }

    source_label = source_names.get(
        strongest_source,
        strongest_source.replace("_", " ").title(),
    )

    # ------------------------------------------
    # Growth insight
    # ------------------------------------------

    insights.append(
        {
            "type": "growth",
            "title": (
                f"{source_label} is your strongest "
                "revenue channel"
            ),
            "message": (
                f"{source_label} generated "
                f"₹{strongest_revenue:,.0f}, "
                f"representing {percentage:.1f}% "
                "of confirmed revenue."
            ),
            "action": (
                f"Continue optimizing the "
                f"{source_label.lower()} journey "
                "and test it with more customers."
            ),
        }
    )

    # ------------------------------------------
    # Product performance
    # ------------------------------------------

    product_stats = {}

    for order in paid_orders:

        for item in order.get("items", []):

            product_id = item.get("product_id")
            name = item.get("name", "Unknown Product")
            quantity = item.get("quantity", 0)
            price = item.get("price", 0)

            if product_id not in product_stats:

                product_stats[product_id] = {
                    "name": name,
                    "units": 0,
                    "revenue": 0,
                }

            product_stats[product_id]["units"] += quantity

            product_stats[product_id]["revenue"] += (
                price * quantity
            )

    if product_stats:

        top_product = max(
            product_stats.items(),
            key=lambda item: item[1]["revenue"],
        )

        top_product_id = top_product[0]
        top_product_data = top_product[1]

        insights.append(
            {
                "type": "product",
                "title": (
                    f"{top_product_data['name']} "
                    "is your top product"
                ),
                "message": (
                    f"It generated "
                    f"₹{top_product_data['revenue']:,.0f} "
                    f"from "
                    f"{top_product_data['units']} "
                    "unit(s) in confirmed orders."
                ),
                "action": (
                    "Use this product as an anchor "
                    "for complementary recommendations "
                    "and bundles."
                ),
            }
        )

    # ------------------------------------------
    # Cross-sell insight
    # ------------------------------------------

    cross_sell_revenue = attribution_revenue.get(
        "cross_sell",
        0,
    )

    if cross_sell_revenue > 0:

        insights.append(
            {
                "type": "cross_sell",
                "title": (
                    "Cross-sell is creating "
                    "measurable basket value"
                ),
                "message": (
                    f"Cross-sell has contributed "
                    f"₹{cross_sell_revenue:,.0f} "
                    "in confirmed revenue."
                ),
                "action": (
                    "Continue presenting relevant "
                    "complementary products before checkout."
                ),
            }
        )

    # ------------------------------------------
    # Recovery insight
    # ------------------------------------------

    recovery_revenue = attribution_revenue.get(
        "recovery",
        0,
    )

    if recovery_revenue > 0:

        insights.append(
            {
                "type": "recovery",
                "title": (
                    "Recovered carts are contributing "
                    "to revenue"
                ),
                "message": (
                    f"Recovery generated "
                    f"₹{recovery_revenue:,.0f} "
                    "in confirmed revenue."
                ),
                "action": (
                    "Continue targeting pending "
                    "checkouts with recovery actions."
                ),
            }
        )

    return {
        "success": True,
        "generated_by": "FlowPay Merchant Intelligence",
        "summary": (
            f"FlowPay analyzed "
            f"{len(paid_orders)} paid order(s) "
            f"and ₹{total_revenue:,.0f} "
            "in confirmed revenue."
        ),
        "insights": insights,
    }