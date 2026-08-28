from typing import Any
import re


class CommerceAgent:
    """
    FlowPay Commerce Agent.

    Converts a natural-language customer request into
    structured commerce intent.
    """

    def __init__(self):
        self.name = "FlowPay Commerce Agent"

    def process_message(self, message: str) -> dict[str, Any]:
        message_lower = message.lower()

        max_price = self._extract_budget(message_lower)

        product_type = self._extract_product_type(message_lower)

        use_case = self._extract_use_case(message_lower)

        category = self._extract_category(message_lower)

        query_parts = []

        if product_type:
            query_parts.append(product_type)

        if use_case:
            query_parts.append(use_case)

        query = " ".join(query_parts)

        if not query:
            query = message_lower

        return {
            "agent": self.name,
            "intent": "product_discovery",
            "product_type": product_type,
            "category": category,
            "use_case": use_case,
            "query": query,
            "max_price": max_price,
            "next_action": "search_products",
            "message": self._build_message(
                product_type=product_type,
                use_case=use_case,
                max_price=max_price,
            ),
        }

    # -----------------------------------------
    # Budget extraction
    # -----------------------------------------

    def _extract_budget(
        self,
        message: str,
    ) -> int | None:

        patterns = [
            r"under\s*₹?\s*([\d,]+)",
            r"below\s*₹?\s*([\d,]+)",
            r"within\s*₹?\s*([\d,]+)",
            r"budget\s*(?:of|is)?\s*₹?\s*([\d,]+)",
            r"₹\s*([\d,]+)",
        ]

        for pattern in patterns:
            match = re.search(pattern, message)

            if match:
                return int(
                    match.group(1).replace(",", "")
                )

        return None

    # -----------------------------------------
    # Product type
    # -----------------------------------------

    def _extract_product_type(
        self,
        message: str,
    ) -> str | None:

        product_types = [
            "earbuds",
            "headphones",
            "laptop",
            "smartwatch",
            "watch",
            "charger",
            "phone",
        ]

        for product_type in product_types:
            if product_type in message:
                return product_type

        return None

    # -----------------------------------------
    # Use case
    # -----------------------------------------

    def _extract_use_case(
        self,
        message: str,
    ) -> str | None:

        use_cases = [
            "gym",
            "fitness",
            "programming",
            "coding",
            "developer",
            "student",
            "work",
            "travel",
            "gaming",
        ]

        for use_case in use_cases:
            if use_case in message:
                return use_case

        return None

    # -----------------------------------------
    # Category
    # -----------------------------------------

    def _extract_category(
        self,
        message: str,
    ) -> str | None:

        category_map = {
            "earbuds": "Audio",
            "headphones": "Audio",
            "laptop": "Computers",
            "smartwatch": "Wearables",
            "watch": "Wearables",
            "charger": "Accessories",
            "phone": "Mobile",
        }

        product_type = self._extract_product_type(message)

        if product_type:
            return category_map.get(product_type)

        return None

    # -----------------------------------------
    # Human-readable agent response
    # -----------------------------------------

    def _build_message(
        self,
        product_type: str | None,
        use_case: str | None,
        max_price: int | None,
    ) -> str:

        parts = []

        if product_type:
            parts.append(product_type)

        if use_case:
            parts.append(f"for {use_case}")

        if max_price:
            parts.append(
                f"within ₹{max_price:,}"
            )

        if parts:
            return (
                "I understood that you're looking for "
                + " ".join(parts)
                + "."
            )

        return (
            "I understood that you're looking for "
            "a suitable product."
        )