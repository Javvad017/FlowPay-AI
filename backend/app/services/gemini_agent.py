import json
import os
from typing import Any

from dotenv import load_dotenv
from google import genai

from app.services.catalog_service import search_catalog



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
        "Search the merchant product catalog. "
        "Use this tool whenever the customer is asking "
        "for products or recommendations. "
        "Respect product type, budget, category, use case "
        "and customer preferences."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "product_type": {
                "type": ["string", "null"],
                "description": (
                    "The exact type of product requested, "
                    "such as earbuds, laptop, smartwatch."
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
                    "How the customer intends to use "
                    "the product, such as gym, gaming "
                    "or programming."
                ),
            },
            "max_price": {
                "type": ["integer", "null"],
                "description": (
                    "Maximum customer budget in Indian rupees."
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

You are an autonomous commerce assistant for a merchant.

Your responsibilities:

1. Understand natural-language customer requests.
2. Identify what product the customer wants.
3. Identify budget constraints.
4. Identify use cases and preferences.
5. Call search_products when product discovery is required.
6. Never invent products.
7. Never invent prices or inventory.
8. Only recommend products returned by search_products.
9. Respect the customer's maximum budget.
10. Prefer exact product-type matches over loosely related products.
11. Give concise, useful recommendations.
12. If no suitable product exists, clearly say so.

IMPORTANT:

The merchant catalog is the source of truth.

Do not claim a product exists unless it appears in
the search_products result.

Do not claim a payment was completed.

Payment functionality will be handled by a separate
payment tool later.
"""


# ==========================================
# Run Commerce Agent
# ==========================================

def run_gemini_agent(
    customer_message: str,
) -> dict[str, Any]:

    # --------------------------------------
    # First Gemini interaction
    # --------------------------------------

    interaction = client.interactions.create(
        model=MODEL,
        input=customer_message,
        tools=[SEARCH_PRODUCTS_TOOL],
    )

    function_results = []

    recommendations = []

    # --------------------------------------
    # Process Gemini tool calls
    # --------------------------------------

    for step in interaction.steps:

        if step.type != "function_call":
            continue

        if step.name != "search_products":
            continue

        arguments = step.arguments

        print(
            "\nGemini tool call:"
        )

        print(
            f"search_products({arguments})"
        )

        # ----------------------------------
        # Execute our REAL catalog tool
        # ----------------------------------

        products = search_catalog(
            query=None,
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
        )

        recommendations.extend(
            products[:5]
        )

        # ----------------------------------
        # Send catalog result back to Gemini
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

    # --------------------------------------
    # If Gemini did not call a tool
    # --------------------------------------

    if not function_results:

        return {
            "agent": "FlowPay Commerce Agent",
            "message": interaction.output_text,
            "tool_called": None,
            "products_found": 0,
            "recommendations": [],
        }

    # --------------------------------------
    # Second Gemini interaction
    # --------------------------------------

    final_interaction = client.interactions.create(
        model=MODEL,
        previous_interaction_id=interaction.id,
        input=function_results,
        tools=[SEARCH_PRODUCTS_TOOL],
    )

    # --------------------------------------
    # Remove duplicates
    # --------------------------------------

    unique_products = {}

    for product in recommendations:
        unique_products[
            product["id"]
        ] = product

    final_products = list(
        unique_products.values()
    )[:3]

    # --------------------------------------
    # Final response
    # --------------------------------------

    return {
        "agent": "FlowPay Commerce Agent",

        "message": final_interaction.output_text,

        "tool_called": "search_products",

        "products_found": len(final_products),

        "recommendations": final_products,
    }