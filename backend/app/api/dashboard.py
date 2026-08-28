from fastapi import APIRouter

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats")
def get_dashboard_stats():
    return {
        "ai_assisted_revenue": 48520,
        "ai_assisted_revenue_change": 18.4,
        "conversations": 327,
        "conversations_change": 24.1,
        "high_intent_customers": 84,
        "high_intent_customers_change": 12.8,
        "conversion_rate": 36.9,
        "conversion_rate_change": 7.2,
        "recommendations": 142,
        "conversions": 31,
        "recovered_carts": 14,
        "upsell_revenue": 7200,
    }


@router.get("/activity")
def get_recent_activity():
    return [
        {
            "customer": "Customer #10482",
            "action": "AI recommendation → Checkout",
            "amount": 2999,
            "status": "Converted",
        },
        {
            "customer": "Customer #10477",
            "action": "Cart recovery agent",
            "amount": 5499,
            "status": "Converted",
        },
        {
            "customer": "AI Buyer #2081",
            "action": "Product discovery",
            "amount": 42000,
            "status": "In progress",
        },
        {
            "customer": "Customer #10461",
            "action": "Payment retry agent",
            "amount": 1899,
            "status": "Recovered",
        },
    ]