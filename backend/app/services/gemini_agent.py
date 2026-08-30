import json
import os
import re
from typing import Any

from dotenv import load_dotenv
from google import genai

from app.services.catalog_service import search_catalog
from google.genai import errors


load_dotenv()


# ==========================================
# Gemini Client
# ==========================================

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError(
        "GEMINI_API_KEY is missing from backend/.env"
    )

client = genai.Client(api_key=api_key)

MODEL = "gemini-3.6-flash"


# ==========================================
# Search Products Tool
# ==========================================

SEARCH_PRODUCTS_TOOL = {
    "type": "function",
    "name": "search_products",
    "description": (
        "Search the merchant product catalog using "
        "customer requirements."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "product_type": {
                "type": ["string", "null"],
                "description": (
                    "Exact product type explicitly requested "
                    "by the customer, such as earbuds, mouse, "
                    "keyboard, laptop, smartwatch or charger. "
                    "If the customer only describes a use case "
                    "such as 'something for gaming', return null "
                    "instead of guessing a product type."
                ),
            },
            "category": {
                "type": ["string", "null"],
                "description": (
                    "Product category such as Audio, "
                    "Computers or Wearables."
                ),
            },
            "use_case": {
                "type": ["string", "null"],
                "description": (
                    "Primary intended use such as gaming, "
                    "programming, coding, fitness, gym, "
                    "travel, study or work. "
                    "If the customer says 'for gaming', "
                    "set this to 'gaming'."
                ),
            },
            "max_price": {
                "type": ["integer", "null"],
                "description": (
                    "Maximum customer budget in INR."
                ),
            },
            "preferences": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "description": (
                    "Additional customer preferences."
                ),
            },
        },
        "required": [
            "product_type",
            "category",
            "use_case",
            "max_price",
            "preferences",
        ],
    },
}


# ==========================================
# Agent Instructions
# ==========================================

SYSTEM_INSTRUCTIONS = """
You are FlowPay Commerce Agent.

You are an autonomous commerce assistant.

Your job is to understand customer requests,
search the merchant catalog and provide useful
product recommendations.

RULES:

1. Use search_products when the customer is looking
   for products or recommendations.

2. The merchant catalog is the ONLY source of truth
   for product information.

3. Never invent:
   - products
   - prices
   - inventory
   - features
   - specifications
   - discounts
   - delivery information
   - warranties
   - payment status

4. Only mention product features that appear in the
   search_products result.

5. Respect the customer's maximum budget.

6. Prefer exact product-type matches.

7. If there are no suitable products, say so clearly.

8. Keep the final recommendation concise and useful.

9. Payment and checkout are separate capabilities.
   Never claim a payment or order was completed.

10. Do not invent attributes such as "secure fit",
    "sweat proof", "premium build", etc. unless the
    catalog explicitly contains that information.
"""


# ==========================================
# Helpers
# ==========================================

def _extract_budget(text: str) -> int | None:
    """
    Fallback budget extraction.

    This is NOT used to replace Gemini reasoning.
    It only protects the API response when Gemini
    doesn't expose the budget separately.
    """

    patterns = [
        r"₹\s?([\d,]+)",
        r"rs\.?\s?([\d,]+)",
        r"rupees?\s?([\d,]+)",
        r"under\s?₹?\s?([\d,]+)",
        r"below\s?₹?\s?([\d,]+)",
        r"within\s?₹?\s?([\d,]+)",
    ]

    text_lower = text.lower()

    for pattern in patterns:
        match = re.search(
            pattern,
            text_lower,
        )

        if match:
            try:
                return int(
                    match.group(1).replace(
                        ",",
                        "",
                    )
                )
            except ValueError:
                pass

    return None


def _clean_products(
    products: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Remove duplicate products.
    """

    unique_products: dict[str, dict[str, Any]] = {}

    for product in products:

        product_id = product.get("id")

        if product_id:
            unique_products[product_id] = product

    return list(
        unique_products.values()
    )[:3]


# ==========================================
# Main Gemini Commerce Agent
# ==========================================

def run_gemini_agent(
    customer_message: str,
) -> dict[str, Any]:

    try:
        interaction = client.interactions.create(
            model=MODEL,
            input=customer_message,
            tools=[SEARCH_PRODUCTS_TOOL],
        )

    except Exception as exc:
        print(f"Gemini request failed: {exc}")

        return {
            "agent": "FlowPay Commerce Agent",
            "message": (
                "The AI service is temporarily unavailable "
                "or rate-limited. Please try again shortly."
            ),
            "tool_called": None,
            "products_found": 0,
            "recommendations": [],
        }

    function_results = []

    recommendations: list[dict[str, Any]] = []

    # --------------------------------------
    # Extract tool calls
    # --------------------------------------

    for step in interaction.steps:

        if step.type != "function_call":
            continue

        if step.name != "search_products":
            continue

        arguments = step.arguments

        print(
            "\n=============================="
        )
        print(
            "Gemini tool call:"
        )
        print(
            "search_products"
        )
        print(
            arguments
        )
        print(
            "=============================="
        )

        # ----------------------------------
        # Search real merchant catalog
        # ----------------------------------

        products = search_catalog(
            query=customer_message,
            max_price=arguments.get(
                "max_price"
            ),
            product_type=arguments.get(
                "product_type"
            ),
            category=arguments.get(
                "category"
            ),
            use_case=arguments.get(
                "use_case"
            ),
            preferences=arguments.get(
                "preferences",
                [],
         ),
        )

        recommendations.extend(
            products[:5]
        )

        # ----------------------------------
        # Return catalog data to Gemini
        # ----------------------------------

        function_results.append(
            {
                "type": "function_result",
                "name": step.name,
                "call_id": step.id,
                "result": [
                    {
                        "type": "text",
                        "text": json.dumps(
                            {
                                "products": products[:5]
                            }
                        ),
                    }
                ],
            }
        )

    # ======================================
    # No tool call
    # ======================================

    if not function_results:

        return {
            "agent": "FlowPay Commerce Agent",
            "message": interaction.output_text,
            "intent": "general_conversation",
            "tool_called": None,
            "query": customer_message,
            "product_type": None,
            "category": None,
            "use_case": None,
            "max_price": _extract_budget(
                customer_message
            ),
            "products_found": 0,
            "recommendations": [],
        }

    # ======================================
    # Get actual tool arguments
    # ======================================

    first_tool_step = next(
        step
        for step in interaction.steps
        if (
            step.type == "function_call"
            and step.name == "search_products"
        )
    )

    tool_arguments = first_tool_step.arguments

    product_type = tool_arguments.get(
        "product_type"
    )

    category = tool_arguments.get(
        "category"
    )

    use_case = tool_arguments.get(
        "use_case"
    )

    max_price = tool_arguments.get(
        "max_price"
    )

    preferences = tool_arguments.get(
        "preferences",
        [],
    )

    # --------------------------------------
    # Fallback budget
    # --------------------------------------

    if max_price is None:
        max_price = _extract_budget(
            customer_message
        )

    # ======================================
    # Build query for frontend
    # ======================================

    query_parts = []

    if product_type:
        query_parts.append(
            str(product_type)
        )

    if use_case:
        query_parts.append(
            str(use_case)
        )

    query = " ".join(
        query_parts
    ).strip()

    # ======================================
    # Second Gemini interaction
    # ======================================

    final_interaction = client.interactions.create(
        model=MODEL,
        previous_interaction_id=interaction.id,
        input=function_results,
        tools=[
            SEARCH_PRODUCTS_TOOL
        ],
    )

    # ======================================
    # Clean recommendation list
    # ======================================

    final_products = _clean_products(
        recommendations
    )

    # ======================================
    # Final response
    # ======================================

    return {
        "agent": "FlowPay Commerce Agent",

        "message": final_interaction.output_text,

        "intent": "product_discovery",

        "tool_called": "search_products",

        "query": query,

        "product_type": product_type,

        "category": category,

        "use_case": use_case,

        "max_price": max_price,

        "preferences": preferences,

        "products_found": len(final_products),

        "recommendations": final_products,
    }