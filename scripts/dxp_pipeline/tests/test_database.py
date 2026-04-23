"""Tests for database.py — schema init and catalog refresh."""
import sqlite3
from datetime import datetime, timezone

import pytest

from database import create_connection, init_db, refresh_catalog


@pytest.fixture
def db():
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    init_db(conn)
    yield conn
    conn.close()


# ── init_db ───────────────────────────────────────────────────────────────────

def test_init_db_creates_all_tables(db):
    tables = {
        r[0] for r in db.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
    }
    for expected in ("app_config", "item_catalog", "price_cache", "dxp_events",
                     "dxp_item_scores", "dxp_score_reports"):
        assert expected in tables, f"Missing table: {expected}"


def test_init_db_seeds_app_config_defaults(db):
    keys = {
        r[0]: r[1]
        for r in db.execute("SELECT key, value FROM app_config").fetchall()
    }
    assert keys["dxp_decay_factor"] == "0.75"
    assert keys["dxp_post_event_delay_days"] == "14"
    assert keys["dxp_last_error"] == ""
    assert keys["dxp_last_sync"] == ""


def test_init_db_is_idempotent(db):
    """Calling init_db twice must not raise or create duplicate rows."""
    init_db(db)
    count = db.execute("SELECT COUNT(*) FROM app_config").fetchone()[0]
    assert count == 4  # exactly the 4 seeded keys, no duplicates


def test_init_db_creates_unique_index_on_price_cache(db):
    """Inserting two rows for the same item on the same day must silently fail."""
    db.execute(
        "INSERT INTO item_catalog(item_id, item_name, buy_limit, members, last_seen_at) "
        "VALUES(1, 'TestItem', 100, 0, '2026-01-01T00:00:00+00:00')"
    )
    db.execute(
        "INSERT INTO price_cache(item_id, price, sampled_at) "
        "VALUES(1, 100, '2026-01-01T10:00:00+00:00')"
    )
    db.commit()
    # Second insert same calendar day → OR IGNORE should skip it
    db.execute(
        "INSERT OR IGNORE INTO price_cache(item_id, price, sampled_at) "
        "VALUES(1, 200, '2026-01-01T20:00:00+00:00')"
    )
    db.commit()
    count = db.execute(
        "SELECT COUNT(*) FROM price_cache WHERE item_id=1"
    ).fetchone()[0]
    assert count == 1


# ── refresh_catalog ───────────────────────────────────────────────────────────

def test_refresh_catalog_inserts_new_items(db):
    dump = {
        2942: {"name": "Snapdragon", "price": 5000, "volume": 1000, "buy_limit": 100, "members": True},
        1515: {"name": "Magic logs",  "price": 1200, "volume": 5000, "buy_limit": 25000, "members": False},
    }
    n = refresh_catalog(db, dump)
    assert n == 2

    row = db.execute("SELECT * FROM item_catalog WHERE item_id=2942").fetchone()
    assert row["item_name"] == "Snapdragon"
    assert row["buy_limit"] == 100
    assert row["members"] == 1


def test_refresh_catalog_updates_existing_items(db):
    dump_v1 = {1: {"name": "Old Name", "price": 100, "volume": 10, "buy_limit": 100, "members": False}}
    refresh_catalog(db, dump_v1)

    dump_v2 = {1: {"name": "New Name", "price": 200, "volume": 20, "buy_limit": 50, "members": True}}
    refresh_catalog(db, dump_v2)

    row = db.execute("SELECT * FROM item_catalog WHERE item_id=1").fetchone()
    assert row["item_name"] == "New Name"
    assert row["buy_limit"] == 50
    assert row["members"] == 1


def test_refresh_catalog_is_idempotent(db):
    """Running twice with the same dump must not create duplicate rows."""
    dump = {1: {"name": "Item", "price": 100, "volume": 10, "buy_limit": 100, "members": False}}
    refresh_catalog(db, dump)
    refresh_catalog(db, dump)

    count = db.execute("SELECT COUNT(*) FROM item_catalog").fetchone()[0]
    assert count == 1
