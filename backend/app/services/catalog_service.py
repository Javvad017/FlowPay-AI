from typing import Any

from app.api.catalog import PRODUCTS


def search_catalog(
    query: str | None = None,
    max_price: int | None = None,
    product_type: str | None = None,
    category: str | None = None,
    use_case: str | None = None,
) -> list[dict[str, Any]]:
    """
    Search and rank products from the merchant catalog.

    This service is shared by:
    - Catalog API
    - Commerce Agent
    - Gemini Agent
    - Future Recommendation Agent
    """

    candidates = PRODUCTS.copy()

    # =========================================
    # 1. HARD PRICE FILTER
    # =========================================

    if max_price is not None:
        candidates = [
            product
            for product in candidates
            if product["price"] <= max_price
        ]

    # =========================================
    # 2. HARD PRODUCT TYPE FILTER
    # =========================================

    if product_type:
        product_type_lower = product_type.lower()

        candidates = [
            product
            for product in candidates
            if (
                product_type_lower
                in product["name"].lower()
                or product_type_lower
                in product["description"].lower()
                or product_type_lower
                in [
                    tag.lower()
                    for tag in product["tags"]
                ]
            )
        ]

    # =========================================
    # 3. HARD CATEGORY FILTER
    # =========================================

    if category:
        category_lower = category.lower()

        candidates = [
            product
            for product in candidates
            if product["category"].lower()
            == category_lower
        ]

    # =========================================
    # 4. PREPARE QUERY TERMS
    # =========================================

    query_terms: list[str] = []

    if query:
        query_terms = [
            term.lower()
            for term in query.split()
            if len(term) > 1
        ]

    # =========================================
    # 5. SCORE PRODUCTS
    # =========================================

    scored_products = []

    for product in candidates:

        score = 0

        name = product["name"].lower()

        description = (
            product["description"].lower()
        )

        product_category = (
            product["category"].lower()
        )

        tags = [
            tag.lower()
            for tag in product["tags"]
        ]

        features = [
            feature.lower()
            for feature in product["features"]
        ]

        searchable_text = " ".join(
            [
                name,
                description,
                product_category,
                *tags,
                *features,
            ]
        )

        # -----------------------------------------
        # Product type
        # -----------------------------------------

        if product_type:
            product_type_lower = (
                product_type.lower()
            )

            if product_type_lower in name:
                score += 10

            if product_type_lower in tags:
                score += 10

            if product_type_lower in description:
                score += 8

        # -----------------------------------------
        # Category
        # -----------------------------------------

        if category:
            if (
                product_category
                == category.lower()
            ):
                score += 7

        # -----------------------------------------
        # Use case
        # -----------------------------------------

        if use_case:
            use_case_lower = use_case.lower()

            if use_case_lower in searchable_text:
                score += 6

        # -----------------------------------------
        # Query terms
        # -----------------------------------------

        for term in query_terms:

            if term in name:
                score += 5

            elif term in tags:
                score += 4

            elif term in features:
                score += 3

            elif term in description:
                score += 2

        # -----------------------------------------
        # Inventory
        # -----------------------------------------

        if product["inventory"] > 0:
            score += 1

        # -----------------------------------------
        # Keep relevant products
        # -----------------------------------------

        if score > 0:
            scored_products.append(
                {
                    "product": product,
                    "score": score,
                }
            )

    # =========================================
    # 6. RANK PRODUCTS
    # =========================================

    scored_products.sort(
        key=lambda item: item["score"],
        reverse=True,
    )

    return [
        item["product"]
        for item in scored_products
    ]