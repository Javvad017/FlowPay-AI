import json
import os
import re
from typing import Any

from dotenv import load_dotenv
from google import genai

from app.services.catalog_service import search_catalog
from app.services.cart_service import add_to_cart, get_cart


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
                    "travel, study or work."
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
# Add To Cart Tool
# ==========================================

ADD_TO_CART_TOOL = {
    "type": "function",
    "name": "add_to_cart",
    "description": (
        "Add an exact product from the merchant catalog "
        "to the customer's cart."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "product_id": {
                "type": "string",
                "description": (
                    "The exact product ID returned by "
                    "search_products."
                ),
            },
            "quantity": {
                "type": "integer",
                "description": (
                    "Quantity to add to the cart."
                ),
            },
        },
        "required": [
            "product_id",
            "quantity",
        ],
    },
}


# ==========================================
# All Commerce Tools
# ==========================================

COMMERCE_TOOLS = [
    SEARCH_PRODUCTS_TOOL,
    ADD_TO_CART_TOOL,
]


# ==========================================
# Agent Instructions
# ==========================================

SYSTEM_INSTRUCTIONS = """
You are FlowPay Commerce Agent.

You are an autonomous commerce assistant.

Your job is to understand customer requests,
search the merchant catalog, recommend products,
and add products to the customer's cart when
explicitly requested.

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

11. If the customer explicitly asks to add a product
    to the cart, first use search_products to identify
    the exact merchant product.

12. Only use add_to_cart with a product_id that was
    actually returned by search_products.

13. Never invent a product_id.

14. Use add_to_cart only when the customer explicitly
    asks to add a product to the cart.

15. If the customer says something like:
    "add FlowBuds Pro",
    "put FlowBuds Pro in my cart",
    "buy FlowBuds Pro",
    or "add that to cart",
    treat it as an explicit cart action.

16. After add_to_cart succeeds, confirm that the
    product was added.

17. Never claim a product was added unless the
    add_to_cart tool actually succeeds.

18. If the customer says "add that" or similar,
    use the product that was most recently returned
    by search_products.

19. When adding a product, use quantity 1 unless
    the customer explicitly requests another quantity.

20. When presenting product recommendations from search_products,
    format each recommendation using clean Markdown exactly like this:

    1. **Exact Product Name** — **₹Exact Price**

       **Description:**
       Exact product description from the search results.

       **Features:**
       - Exact feature 1 from the search results.
       - Exact feature 2 from the search results.
       - Exact feature 3 from the search results.
       - Exact feature 4 from the search results.

    IMPORTANT:
    - Use a real Markdown numbered list for products.
    - Use "-" for feature bullets.
    - Put EVERY feature on its own line.
    - Do NOT put multiple features on one line.
    - Do NOT use the "•" character for features.
    - Do NOT join features with "•", commas, or " | ".
    - Preserve the exact feature text returned by search_products.

21. Never output empty product entries such as:

    1. —
    2. —

    Never omit the product name or price.

    Always use the exact product name and exact price returned
    by search_products.

    Never invent or modify product information.

22. The final response must be valid Markdown and should be
    easy for the FlowPay frontend Markdown renderer to display.

    Example:

    1. **FlowMouse M1** — **₹1,299**

       **Description:**
       Ergonomic wireless mouse designed for productivity, study, and gaming.

       **Features:**
       - Wireless
       - Ergonomic Design
       - Adjustable DPI
       - Long Battery Life

    2. **FlowKeyboard K1** — **₹2,499**

       **Description:**
       Compact mechanical keyboard built for developers, students, and gamers.

       **Features:**
       - Mechanical Switches
       - RGB Backlight
       - Low Latency
       - Compact Layout
       
       """


# ==========================================
# Helpers
# ==========================================

def _extract_budget(text: str) -> int | None:
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
        match = re.search(pattern, text_lower)

        if match:
            try:
                return int(
                    match.group(1).replace(",", "")
                )
            except ValueError:
                pass

    return None


def _clean_products(
    products: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    unique_products: dict[str, dict[str, Any]] = {}

    for product in products:
        product_id = product.get("id")

        if product_id:
            unique_products[product_id] = product

    return list(
        unique_products.values()
    )[:3]


def _function_result(
    name: str,
    call_id: str,
    result: Any,
) -> dict[str, Any]:
    return {
        "type": "function_result",
        "name": name,
        "call_id": call_id,
        "result": [
            {
                "type": "text",
                "text": json.dumps(result),
            }
        ],
    }


def _build_fallback_recommendations_message(products: list[dict[str, Any]]) -> str:
    if not products:
        return "No products found matching your criteria."
    lines = ["Here are the products matching your request:\n"]
    for idx, p in enumerate(products, 1):
        price_val = p.get("price")
        price_str = f"₹{price_val:,}" if isinstance(price_val, (int, float)) else f"₹{price_val}" if price_val else ""
        lines.append(f"{idx}. {p.get('name', 'Product')} — {price_str}\n")
        if p.get("description"):
            lines.append(f"   {p['description']}\n")
        if p.get("features"):
            for feat in p["features"]:
                lines.append(f"   • {feat}")
            lines.append("")
    lines.append("Let me know if you would like to add any of these to your cart.")
    return "\n".join(lines)


def _fix_missing_product_names(message: str | None, products: list[dict[str, Any]]) -> str:
    if not message:
        message = ""
    if not products:
        return message

    def replace_numbered_dash(match):
        idx = int(match.group(1)) - 1
        if 0 <= idx < len(products):
            prod = products[idx]
            name = prod.get("name", "")
            price = prod.get("price")
            price_str = f"₹{price:,}" if isinstance(price, (int, float)) else f"₹{price}" if price else ""
            if name and price_str:
                return f"{match.group(1)}. {name} — {price_str}"
            elif name:
                return f"{match.group(1)}. {name}"
        return match.group(0)

    # Match lines like "1. —" or "1. - " or "1. — ₹1,299"
    fixed_msg = re.sub(r"(\d+)\.\s*(?:—|–|-)\s*(?:₹[\d,]+)?", replace_numbered_dash, message)

    # Check if at least one product name from search results is present in fixed_msg
    names_present = any(p.get("name") and p.get("name") in fixed_msg for p in products)
    if not names_present and products:
        return _build_fallback_recommendations_message(products)

    return fixed_msg


# ==========================================
# Main Gemini Commerce Agent
# ==========================================

def run_gemini_agent(
    customer_message: str,
) -> dict[str, Any]:

    try:

        # --------------------------------------
        # First Gemini interaction
        # --------------------------------------

        interaction = client.interactions.create(
            model=MODEL,
            system_instruction=SYSTEM_INSTRUCTIONS,
            input=customer_message,
            tools=COMMERCE_TOOLS,
        )

    except Exception as exc:

        print(
            f"Gemini request failed: {exc}"
        )

        return {
            "agent": "FlowPay Commerce Agent",
            "message": (
                "The AI service is temporarily unavailable "
                "or rate-limited. Please try again shortly."
            ),
            "intent": "error",
            "tool_called": None,
            "query": customer_message,
            "product_type": None,
            "category": None,
            "use_case": None,
            "max_price": None,
            "preferences": [],
            "products_found": 0,
            "recommendations": [],
        }


    recommendations: list[dict[str, Any]] = []

    search_arguments: dict[str, Any] = {}

    function_results = []


    # ==========================================
    # Execute first-round tool calls
    # ==========================================

    for step in interaction.steps:

        if step.type != "function_call":
            continue


        # ======================================
        # SEARCH PRODUCTS
        # ======================================

        if step.name == "search_products":

            arguments = step.arguments or {}

            print(
                "\n=============================="
            )

            print(
                "Gemini tool call: search_products"
            )

            print(
                arguments
            )

            print(
                "=============================="
            )


            search_arguments = arguments


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


            function_results.append(
                _function_result(
                    "search_products",
                    step.id,
                    {
                        "products": products[:5]
                    },
                )
            )


        # ======================================
        # ADD TO CART
        # ======================================

        elif step.name == "add_to_cart":

            arguments = step.arguments or {}

            print(
                "\n=============================="
            )

            print(
                "Gemini tool call: add_to_cart"
            )

            print(
                arguments
            )

            print(
                "=============================="
            )


            product_id = arguments.get(
                "product_id"
            )

            quantity = arguments.get(
                "quantity",
                1,
            )


            if not product_id:

                result = {
                    "success": False,
                    "error": (
                        "Missing product_id."
                    ),
                }

            else:

                try:

                    cart = add_to_cart(
                        product_id=product_id,
                        quantity=quantity,
                    )

                    result = {
                        "success": True,
                        "message": (
                            "Product successfully "
                            "added to cart."
                        ),
                        "cart": cart,
                    }

                except Exception as exc:

                    result = {
                        "success": False,
                        "error": str(exc),
                    }


            function_results.append(
                _function_result(
                    "add_to_cart",
                    step.id,
                    result,
                )
            )


    # ==========================================
    # No tool calls
    # ==========================================

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
            "preferences": [],
            "products_found": 0,
            "recommendations": [],
        }


    # ==========================================
    # Extract search metadata
    # ==========================================

    product_type = search_arguments.get(
        "product_type"
    )

    category = search_arguments.get(
        "category"
    )

    use_case = search_arguments.get(
        "use_case"
    )

    max_price = search_arguments.get(
        "max_price"
    )

    preferences = search_arguments.get(
        "preferences",
        [],
    )


    if max_price is None:

        max_price = _extract_budget(
            customer_message
        )


    # ==========================================
    # Detect whether cart action happened
    # ==========================================

    cart_action = False
    cart_success = False

    for result in function_results:

        if result["name"] == "add_to_cart":

            cart_action = True

            try:
                payload = json.loads(
                    result["result"][0]["text"]
                )

                cart_success = bool(
                    payload.get("success")
                )

            except Exception:
                cart_success = False


    # ==========================================
    # Build frontend query
    # ==========================================

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


    # ==========================================
    # Continue Gemini with tool results
    # ==========================================

    try:

        final_interaction = client.interactions.create(
            model=MODEL,
            system_instruction=SYSTEM_INSTRUCTIONS,
            previous_interaction_id=interaction.id,
            input=function_results,
            tools=COMMERCE_TOOLS,
        )

    except Exception as exc:

        print(
            f"Gemini continuation failed: {exc}"
        )

        if cart_success:

            current_cart = get_cart()

            return {
                "agent": "FlowPay Commerce Agent",
                "message": (
                    "Done — the product was added "
                    "to your cart."
                ),
                "intent": "cart_action",
                "tool_called": "add_to_cart",
                "query": query,
                "product_type": product_type,
                "category": category,
                "use_case": use_case,
                "max_price": max_price,
                "preferences": preferences,
                "products_found": len(
                    _clean_products(
                        recommendations
                    )
                ),
                "recommendations": _clean_products(
                    recommendations
                ),
                "cart": current_cart,
            }

        fallback_products = _clean_products(recommendations)
        if fallback_products:
            return {
                "agent": "FlowPay Commerce Agent",
                "message": _build_fallback_recommendations_message(fallback_products),
                "intent": "product_discovery",
                "tool_called": "search_products",
                "query": query,
                "product_type": product_type,
                "category": category,
                "use_case": use_case,
                "max_price": max_price,
                "preferences": preferences,
                "products_found": len(fallback_products),
                "recommendations": fallback_products,
            }

        raise


    # ==========================================
    # If Gemini requests another tool call
    # ==========================================

    followup_results = []

    for step in final_interaction.steps:

        if step.type != "function_call":
            continue


        if step.name != "add_to_cart":
            continue


        arguments = step.arguments or {}

        product_id = arguments.get(
            "product_id"
        )

        quantity = arguments.get(
            "quantity",
            1,
        )


        print(
            "\n=============================="
        )

        print(
            "Gemini follow-up tool call: "
            "add_to_cart"
        )

        print(
            arguments
        )

        print(
            "=============================="
        )


        try:

            cart = add_to_cart(
                product_id=product_id,
                quantity=quantity,
            )

            result = {
                "success": True,
                "message": (
                    "Product successfully "
                    "added to cart."
                ),
                "cart": cart,
            }

        except Exception as exc:

            result = {
                "success": False,
                "error": str(exc),
            }


        followup_results.append(
            _function_result(
                "add_to_cart",
                step.id,
                result,
            )
        )


    # ==========================================
    # Final response after follow-up tool
    # ==========================================

    if followup_results:

        try:

            completed_interaction = (
                client.interactions.create(
                    model=MODEL,
                    system_instruction=SYSTEM_INSTRUCTIONS,
                    previous_interaction_id=(
                        final_interaction.id
                    ),
                    input=followup_results,
                    tools=COMMERCE_TOOLS,
                )
            )

            final_message = (
                completed_interaction.output_text
            )

        except Exception as exc:

            print(
                f"Final Gemini response failed: {exc}"
            )

            final_message = (
                "Done — the product was added "
                "to your cart."
            )

        cart_action = True

        cart_success = True

    else:

        final_message = (
            final_interaction.output_text
        )


    # ==========================================
    # Final response
    # ==========================================

    final_products = _clean_products(
        recommendations
    )

    final_message = _fix_missing_product_names(
        final_message,
        final_products,
    )


    return {
        "agent": "FlowPay Commerce Agent",
        "message": final_message,
        "intent": (
            "cart_action"
            if cart_action
            else "product_discovery"
        ),
        "tool_called": (
            "add_to_cart"
            if cart_action
            else "search_products"
        ),
        "query": query,
        "product_type": product_type,
        "category": category,
        "use_case": use_case,
        "max_price": max_price,
        "preferences": preferences,
        "products_found": len(
            final_products
        ),
        "recommendations": final_products,
    }