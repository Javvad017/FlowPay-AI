from typing import Any

from app.api.catalog import PRODUCTS
from app.services.inventory_service import get_all_inventory


def search_catalog(
    query: str | None = None,
    max_price: int | None = None,
    product_type: str | None = None,
    category: str | None = None,
    use_case: str | None = None,
    preferences: list[str] | None = None,
) -> list[dict[str, Any]]:
    """
    Search and deterministically rank products
    from the merchant catalog.

    Ranking priority:
    1. Hard constraints
    2. Product type
    3. Use case
    4. Preferences
    5. Query relevance
    6. Inventory
    """

    # Fetch live inventory once for the whole call
    live_inv = {
        row["product_id"]: row["quantity"]
        for row in get_all_inventory()
    }

    # Make product copies with live inventory
    candidates = [
        {**p, "inventory": live_inv.get(p["id"], p.get("inventory", 0))}
        for p in PRODUCTS
    ]

    # ==========================================
    # 1. HARD PRICE FILTER
    # ==========================================

    if max_price is not None:
        candidates = [
            product
            for product in candidates
            if product.get("price", 0) <= max_price
        ]

    # ==========================================
    # 2. HARD PRODUCT TYPE FILTER
    # ==========================================

    if product_type:
        product_type_lower = product_type.lower()

        typed_candidates = []

        for product in candidates:
            name = product.get("name", "").lower()
            description = product.get(
                "description", ""
            ).lower()

            tags = [
                str(tag).lower()
                for tag in product.get("tags", [])
            ]

            if (
                product_type_lower in name
                or product_type_lower in description
                or product_type_lower in tags
            ):
                typed_candidates.append(product)

        # Only hard-filter if actual matches exist.
        # This protects against Gemini returning a
        # generic or unsupported product type.
        if typed_candidates:
            candidates = typed_candidates

    # ==========================================
    # 3. HARD CATEGORY FILTER
    # ==========================================

    if category:
        category_lower = category.lower()

        category_candidates = [
            product
            for product in candidates
            if product.get(
                "category", ""
            ).lower() == category_lower
        ]

        # Same defensive behavior as product type.
        if category_candidates:
            candidates = category_candidates

    # ==========================================
    # 4. PREPARE SEARCH SIGNALS
    # ==========================================

    query_terms: list[str] = []

    if query:
        query_terms = [
            term.lower()
            for term in query.split()
            if len(term) > 1
        ]

    normalized_preferences = [
        str(preference).lower().strip()
        for preference in (preferences or [])
        if str(preference).strip()
    ]

    # ==========================================
    # 5. SCORE PRODUCTS
    # ==========================================

    scored_products: list[
        dict[str, Any]
    ] = []

    for product in candidates:

        score = 0

        name = product.get(
            "name", ""
        ).lower()

        description = product.get(
            "description", ""
        ).lower()

        product_category = product.get(
            "category", ""
        ).lower()

        tags = [
            str(tag).lower()
            for tag in product.get("tags", [])
        ]

        features = [
            str(feature).lower()
            for feature in product.get(
                "features", []
            )
        ]

        # ======================================
        # PRODUCT TYPE
        # ======================================

        if product_type:
            signal = product_type.lower()

            if signal in name:
                score += 30

            if signal in tags:
                score += 25

            if signal in description:
                score += 15

        # ======================================
        # CATEGORY
        # ======================================

        if category:
            if (
                product_category
                == category.lower()
            ):
                score += 15

        # ======================================
        # USE CASE
        # ======================================

        if use_case:
            signal = use_case.lower()

            # Tags are strongest because merchant
            # explicitly classified the product.
            if signal in tags:
                score += 30

            # Feature match is also strong.
            if any(
                signal in feature
                for feature in features
            ):
                score += 20

            if signal in description:
                score += 15

            if signal in name:
                score += 10

        # ======================================
        # CUSTOMER PREFERENCES
        # ======================================

        for preference in normalized_preferences:

            if preference in tags:
                score += 12

            if any(
                preference in feature
                for feature in features
            ):
                score += 10

            if preference in description:
                score += 6

            if preference in name:
                score += 5

        # ======================================
        # QUERY TERMS
        # ======================================

        for term in query_terms:

            if term in name:
                score += 8

            elif term in tags:
                score += 7

            elif any(
                term in feature
                for feature in features
            ):
                score += 5

            elif term in description:
                score += 3

            elif term == product_category:
                score += 3

        # ======================================
        # INVENTORY
        # ======================================

        if product.get("inventory", 0) > 0:
            score += 1
        else:
            # Never recommend unavailable products.
            continue

        # ======================================
        # RELEVANCE GATE
        # ======================================

        has_search_intent = bool(
            product_type
            or category
            or use_case
            or query_terms
            or normalized_preferences
        )

        if has_search_intent:
            if score > 1:
                scored_products.append(
                    {
                        "product": product,
                        "score": score,
                    }
                )
        else:
            scored_products.append(
                {
                    "product": product,
                    "score": score,
                }
            )

    # ==========================================
    # 6. DETERMINISTIC RANKING
    # ==========================================

    scored_products.sort(
        key=lambda item: (
            -item["score"],
            item["product"].get(
                "price", 0
            ),
            item["product"].get(
                "name", ""
            ).lower(),
        )
    )

    return [
        item["product"]
        for item in scored_products
    ]