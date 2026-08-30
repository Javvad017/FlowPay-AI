from __future__ import annotations

from typing import Any

from app.api.catalog import PRODUCTS
from app.services.cart_service import get_cart


def _score(source: dict[str, Any], candidate: dict[str, Any]) -> tuple[int, list[str]]:
    reasons: list[str] = []
    score = 0

    source_tags = set(source.get("tags", []))
    candidate_tags = set(candidate.get("tags", []))

    shared_tags = source_tags & candidate_tags
    if shared_tags:
        score += 4
        reasons.append("shares relevant use-case tags")

    if source.get("category") == candidate.get("category"):
        score += 2
        reasons.append("same product category")

    source_features = {str(x).lower() for x in source.get("features", [])}
    candidate_features = {str(x).lower() for x in candidate.get("features", [])}
    if source_features & candidate_features:
        score += 1
        reasons.append("matches product features")

    return score, reasons


def get_upsell_recommendations() -> dict[str, Any]:
    cart = get_cart()

    if not cart["items"]:
        return {
            "source": "cart",
            "message": "Add a product to your cart to unlock personalized cross-sell suggestions.",
            "recommendations": [],
        }

    cart_ids = {item["product_id"] for item in cart["items"]}
    source_products = [
        product for product in PRODUCTS if product["id"] in cart_ids
    ]

    ranked: list[tuple[int, dict[str, Any], list[str]]] = []

    for candidate in PRODUCTS:
        if candidate["id"] in cart_ids or candidate.get("inventory", 0) <= 0:
            continue

        best_score = 0
        best_reasons: list[str] = []

        for source in source_products:
            score, reasons = _score(source, candidate)
            if score > best_score:
                best_score = score
                best_reasons = reasons

        if best_score > 0:
            ranked.append((best_score, candidate, best_reasons))

    ranked.sort(key=lambda row: (-row[0], row[1]["price"]))

    recommendations = []
    for score, product, reasons in ranked[:3]:
        recommendations.append(
            {
                "product": product,
                "score": score,
                "reason": (
                    "Recommended because it "
                    + ", ".join(reasons)
                    + "."
                ),
            }
        )

    return {
        "source": "cart",
        "message": "FlowPay Growth Agent found complementary products from the live catalog.",
        "recommendations": recommendations,
    }
