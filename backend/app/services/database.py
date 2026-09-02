import sqlite3
from pathlib import Path
from typing import Any


# ==========================================
# Database configuration
# ==========================================

BASE_DIR = Path(__file__).resolve().parents[2]
DATABASE_PATH = BASE_DIR / "flowpay.db"


# ==========================================
# Database connection
# ==========================================

def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(
        DATABASE_PATH,
        check_same_thread=False,
    )

    connection.row_factory = sqlite3.Row

    return connection


# ==========================================
# Initialize database
# ==========================================

def init_database() -> None:

    # Import here to avoid circular imports at module load time
    from app.api.catalog import PRODUCTS

    connection = get_connection()

    cursor = connection.cursor()

    # ------------------------------------------
    # Orders
    # ------------------------------------------

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            razorpay_order_id TEXT UNIQUE NOT NULL,
            amount REAL NOT NULL,
            amount_paise INTEGER NOT NULL,
            currency TEXT NOT NULL,
            status TEXT NOT NULL,
            razorpay_payment_id TEXT,
            attribution_source TEXT NOT NULL,
            created_at TEXT NOT NULL,
            paid_at TEXT
        )
        """
    )

    # ------------------------------------------
    # Order items
    # ------------------------------------------

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            quantity INTEGER NOT NULL,

            FOREIGN KEY (order_id)
                REFERENCES orders(id)
                ON DELETE CASCADE
        )
        """
    )

    # ------------------------------------------
    # Recovery attempts
    # ------------------------------------------

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS recovery_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT NOT NULL,
            attempted_at TEXT NOT NULL,

            FOREIGN KEY (order_id)
                REFERENCES orders(id)
                ON DELETE CASCADE
        )
        """
    )

    # ------------------------------------------
    # Cart items
    # ------------------------------------------

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS cart_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            quantity INTEGER NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    # ------------------------------------------
    # Inventory
    # ------------------------------------------
    # quantity        = live stock (decrements on payment)
    # initial_quantity = original stock (used by Reset Demo)
    # INSERT OR IGNORE ensures we never overwrite live stock
    # when the backend restarts.
    # ------------------------------------------

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS inventory (
            product_id       TEXT PRIMARY KEY,
            quantity         INTEGER NOT NULL,
            initial_quantity INTEGER NOT NULL
        )
        """
    )

    for product in PRODUCTS:
        cursor.execute(
            """
            INSERT OR IGNORE INTO inventory (
                product_id,
                quantity,
                initial_quantity
            )
            VALUES (?, ?, ?)
            """,
            (
                product["id"],
                product["inventory"],
                product["inventory"],
            ),
        )

    connection.commit()
    connection.close()

    # ==========================================
# Reset demo data
# ==========================================

def reset_demo_data() -> None:

    connection = get_connection()

    cursor = connection.cursor()

    # Delete dependent records first
    cursor.execute(
        "DELETE FROM recovery_attempts"
    )

    cursor.execute(
        "DELETE FROM order_items"
    )

    # Delete all orders
    cursor.execute(
        "DELETE FROM orders"
    )

    cursor.execute(
    "DELETE FROM cart_items"
    )

    # Reset SQLite auto-increment counters
    cursor.execute(
        "DELETE FROM sqlite_sequence WHERE name = 'order_items'"
    )

    cursor.execute(
        "DELETE FROM sqlite_sequence WHERE name = 'recovery_attempts'"
    )

    cursor.execute(
        "DELETE FROM sqlite_sequence WHERE name = 'cart_items'"
    )

    # Restore inventory to original quantities
    cursor.execute(
        """
        UPDATE inventory
        SET quantity = initial_quantity
        """
    )

    connection.commit()
    connection.close()


# ==========================================
# Utility
# ==========================================

def row_to_dict(
    row: sqlite3.Row | None,
) -> dict[str, Any] | None:

    if row is None:
        return None

    return dict(row)
