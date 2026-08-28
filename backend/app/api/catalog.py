from fastapi import APIRouter, HTTPException
from typing import Optional

router = APIRouter(
    prefix="/api/catalog",
    tags=["Catalog"],
)


PRODUCTS = [
    {
        "id": "prod_001",
        "name": "FlowBuds Pro",
        "description": "Premium wireless earbuds designed for workouts and everyday use.",
        "category": "Audio",
        "price": 2999,
        "inventory": 42,
        "features": [
            "Active Noise Cancellation",
            "IPX5 Water Resistance",
            "30-hour Battery",
            "Low Latency Mode",
        ],
        "tags": [
            "earbuds",
            "wireless",
            "gym",
            "fitness",
            "audio",
        ],
    },
    {
        "id": "prod_002",
        "name": "FlowBuds Lite",
        "description": "Affordable wireless earbuds for everyday listening.",
        "category": "Audio",
        "price": 1499,
        "inventory": 86,
        "features": [
            "Wireless",
            "20-hour Battery",
            "Lightweight",
            "Touch Controls",
        ],
        "tags": [
            "earbuds",
            "wireless",
            "budget",
            "audio",
        ],
    },
    {
        "id": "prod_003",
        "name": "FlowWatch X",
        "description": "Smart fitness watch with health tracking and workout modes.",
        "category": "Wearables",
        "price": 4999,
        "inventory": 27,
        "features": [
            "Heart Rate Tracking",
            "GPS",
            "Workout Tracking",
            "7-day Battery",
        ],
        "tags": [
            "smartwatch",
            "fitness",
            "gym",
            "wearable",
        ],
    },
    {
        "id": "prod_004",
        "name": "FlowCharge 65W",
        "description": "Compact 65W fast charger for laptops, phones and tablets.",
        "category": "Accessories",
        "price": 1799,
        "inventory": 63,
        "features": [
            "65W Fast Charging",
            "USB-C PD",
            "Compact Design",
            "Multi-device Support",
        ],
        "tags": [
            "charger",
            "usb-c",
            "laptop",
            "phone",
        ],
    },
    {
        "id": "prod_005",
        "name": "FlowBook Air",
        "description": "Lightweight performance laptop designed for developers and students.",
        "category": "Computers",
        "price": 58999,
        "inventory": 12,
        "features": [
            "16GB RAM",
            "512GB SSD",
            "Long Battery Life",
            "Developer Friendly",
        ],
        "tags": [
            "laptop",
            "programming",
            "student",
            "developer",
        ],
    },
]


@router.get("/products")
def search_products(
    query: Optional[str] = None,
    category: Optional[str] = None,
    max_price: Optional[int] = None,
):
    results = PRODUCTS

    if query:
        query_lower = query.lower()

        results = [
            product
            for product in results
            if (
                query_lower in product["name"].lower()
                or query_lower in product["description"].lower()
                or any(
                    query_lower in tag.lower()
                    for tag in product["tags"]
                )
                or any(
                    query_lower in feature.lower()
                    for feature in product["features"]
                )
            )
        ]

    if category:
        results = [
            product
            for product in results
            if product["category"].lower() == category.lower()
        ]

    if max_price is not None:
        results = [
            product
            for product in results
            if product["price"] <= max_price
        ]

    return {
        "count": len(results),
        "products": results,
    }


@router.get("/products/{product_id}")
def get_product(product_id: str):
    product = next(
        (
            product
            for product in PRODUCTS
            if product["id"] == product_id
        ),
        None,
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    return product


@router.get("/products/{product_id}/inventory")
def check_inventory(product_id: str):
    product = next(
        (
            product
            for product in PRODUCTS
            if product["id"] == product_id
        ),
        None,
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    return {
        "product_id": product_id,
        "inventory": product["inventory"],
        "available": product["inventory"] > 0,
    }