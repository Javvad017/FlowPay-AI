from fastapi import APIRouter, HTTPException

from app.services.recovery_service import (
    get_recovery_opportunities,
    initiate_recovery,
)
from app.services.upsell_service import get_upsell_recommendations
from app.services.attribution_service import get_attribution

from app.services.growth_intelligence_service import (
    get_growth_intelligence,
)


router = APIRouter(
    prefix="/api/growth",
    tags=["Growth Agents"],
)


@router.get("/recovery")
def recovery_opportunities():
    opportunities = get_recovery_opportunities()

    return {
        "success": True,
        "count": len(opportunities),
        "opportunities": opportunities,
    }


@router.post("/recovery/{order_id}")
def recover_cart(order_id: str):
    try:
        return initiate_recovery(order_id)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


@router.get("/upsell")
def upsell():
    return {
        "success": True,
        **get_upsell_recommendations(),
    }


@router.get("/attribution")
def attribution():
    return {
        "success": True,
        **get_attribution(),
    }

    # ==========================================
# Growth Intelligence
# ==========================================

@router.get("/intelligence")
def growth_intelligence():
    return get_growth_intelligence()
