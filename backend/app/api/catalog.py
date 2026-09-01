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
        "image_url": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80",
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
        "image_url": "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=600&q=80",
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
        "image_url": "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=600&q=80",
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
        "image_url": "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80",
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
        "image_url": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80",
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
    {
        "id": "prod_006",
        "name": "FlowMouse M1",
        "description": "Ergonomic wireless mouse designed for productivity, study and gaming.",
        "category": "Accessories",
        "price": 1299,
        "inventory": 74,
        "image_url": "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80",
        "features": [
            "Wireless",
            "Ergonomic Design",
            "Adjustable DPI",
            "Long Battery Life",
        ],
        "tags": [
            "mouse",
            "wireless",
            "gaming",
            "productivity",
            "student",
        ],
    },
    {
        "id": "prod_007",
        "name": "FlowKeyboard K1",
        "description": "Compact mechanical keyboard built for developers, students and gamers.",
        "category": "Accessories",
        "price": 2499,
        "inventory": 38,
        "image_url": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80",
        "features": [
            "Mechanical Switches",
            "RGB Backlight",
            "Low Latency",
            "Compact Layout",
        ],
        "tags": [
            "keyboard",
            "mechanical",
            "gaming",
            "programming",
            "developer",
        ],
    },
    {
        "id": "prod_008",
        "name": "FlowCam Mini",
        "description": "Full HD webcam designed for online meetings, classes and content creation.",
        "category": "Electronics",
        "price": 3499,
        "inventory": 31,
        "image_url": "https://images.unsplash.com/photo-1588702547919-26089e690ecc?auto=format&fit=crop&w=600&q=80",
        "features": [
            "1080p Full HD",
            "Built-in Microphone",
            "Auto Focus",
            "Low Light Correction",
        ],
        "tags": [
            "webcam",
            "camera",
            "meetings",
            "online-class",
            "streaming",
        ],
    },
    {
        "id": "prod_009",
        "name": "FlowSpeaker Go",
        "description": "Portable wireless speaker with rich sound for travel, home and everyday listening.",
        "category": "Audio",
        "price": 1999,
        "inventory": 55,
        "image_url": "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=600&q=80",
        "features": [
            "Wireless",
            "12-hour Battery",
            "Portable Design",
            "Water Resistant",
        ],
        "tags": [
            "speaker",
            "wireless",
            "portable",
            "audio",
            "music",
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