"""Tests for compute_dxp_scores in dxp.py.

Fixture design — two DXP events, one item with full price coverage:

  Event 1 (older):  start=2025-01-10, end=2025-01-12
  Event 2 (newer):  start=2025-06-06, end=2025-06-08

  Item 1 (Snapdragon):
    Event 1 windows:
      Baseline (T-14 to T-8): 2024-12-27 to 2025-01-02  price=1000
      Pre-event (T-7 to T-1): 2025-01-03 to 2025-01-09  price=1100  (+10%)
      During:                  2025-01-10 to 2025-01-12  price=950   (-5%)
      Post (end+1 to end+14): 2025-01-13 to 2025-01-26  price=920   (-8%)
    Event 2 windows:
      Baseline (T-14 to T-8): 2025-05-23 to 2025-05-29  price=2000
      Pre-event (T-7 to T-1): 2025-05-30 to 2025-06-05  price=2400  (+20%)
      During:                  2025-06-06 to 2025-06-08  price=1900  (-5%)
      Post (end+1 to end+14): 2025-06-09 to 2025-06-22  price=1840  (-8%)

  Expected decay-weighted lifts (decay=0.75, i=0=newest):
    total_weight = 1.0 + 0.75 = 1.75
    pre_lift_pct   = (20*1.0 + 10*0.75) / 1.75 = 27.5 / 1.75 ≈ 15.714
    during_lift_pct = (-5*1.0 + -5*0.75) / 1.75 = -8.75 / 1.75 = -5.0
    post_lift_pct   = (-8*1.0 + -8*0.75) / 1.75 = -14.0 / 1.75 = -8.0
"""
import json
import sqlite3
from datetime import date, timedelta

import pytest

from database import init_db
from dxp import compute_dxp_scores


# ── Helpers & fixtures ────────────────────────────────────────────────────────

def _insert_daily_prices(conn, item_id: int, start: str, num_days: int, price: int):
    start_d = date.fromisoformat(start)
    rows = [
        (item_id, price, None, f"{(start_d + timedelta(days=i)).isoformat()}T12:00:00+00:00")
        for i in range(num_days)
    ]
    conn.executemany(
        "INSERT OR IGNORE INTO price_cache(item_id, price, volume, sampled_at) VALUES(?, ?, ?, ?)",
        rows,
    )
    conn.commit()


@pytest.fixture
def db():
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    init_db(conn)
    yield conn
    conn.close()


@pytest.fixture
def scored_db(db):
    """DB pre-seeded with 2 DXP events and full price coverage for item 1."""
    now = "2026-03-22T00:00:00+00:00"
    db.execute(
        "INSERT OR IGNORE INTO item_catalog(item_id, item_name, buy_limit, members) "
        "VALUES(1, 'Snapdragon', 100, 1)"
    )
    db.execute(
        "INSERT INTO dxp_events(start_date, end_date, source, status, created_at, updated_at) "
        "VALUES('2025-01-10', '2025-01-12', 'wiki', 'confirmed', ?, ?)", (now, now),
    )
    db.execute(
        "INSERT INTO dxp_events(start_date, end_date, source, status, created_at, updated_at) "
        "VALUES('2025-06-06', '2025-06-08', 'wiki', 'confirmed', ?, ?)", (now, now),
    )
    db.commit()

    # Event 1
    _insert_daily_prices(db, 1, "2024-12-27", 7, 1000)
    _insert_daily_prices(db, 1, "2025-01-03", 7, 1100)
    _insert_daily_prices(db, 1, "2025-01-10", 3, 950)
    _insert_daily_prices(db, 1, "2025-01-13", 14, 920)
    # Event 2
    _insert_daily_prices(db, 1, "2025-05-23", 7, 2000)
    _insert_daily_prices(db, 1, "2025-05-30", 7, 2400)
    _insert_daily_prices(db, 1, "2025-06-06", 3, 1900)
    _insert_daily_prices(db, 1, "2025-06-09", 14, 1840)
    return db


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_returns_item_count(scored_db):
    assert compute_dxp_scores(scored_db) == 1


def test_correct_decay_weighted_lifts(scored_db):
    compute_dxp_scores(scored_db)
    row = scored_db.execute("SELECT * FROM dxp_item_scores WHERE item_id=1").fetchone()
    assert row is not None
    assert row["events_observed"] == 2
    assert abs(row["pre_lift_pct"]    - 15.714) < 0.5
    assert abs(row["during_lift_pct"] - (-5.0)) < 0.5
    assert abs(row["post_lift_pct"]   - (-8.0)) < 0.5


def test_stores_decay_factor_snapshot(scored_db):
    compute_dxp_scores(scored_db)
    row = scored_db.execute("SELECT decay_factor FROM dxp_item_scores WHERE item_id=1").fetchone()
    assert row["decay_factor"] == pytest.approx(0.75)


def test_returns_zero_when_no_events(db):
    db.execute(
        "INSERT OR IGNORE INTO item_catalog(item_id, item_name, buy_limit, members) "
        "VALUES(1, 'Snapdragon', 100, 1)"
    )
    db.commit()
    assert compute_dxp_scores(db) == 0


def test_skips_items_with_insufficient_data(db):
    now = "2026-03-22T00:00:00+00:00"
    db.execute(
        "INSERT OR IGNORE INTO item_catalog(item_id, item_name, buy_limit, members) "
        "VALUES(99, 'Rare item', 10, 1)"
    )
    db.execute(
        "INSERT INTO dxp_events(start_date, end_date, source, status, created_at, updated_at) "
        "VALUES('2025-01-10', '2025-01-12', 'wiki', 'confirmed', ?, ?)", (now, now),
    )
    db.commit()
    _insert_daily_prices(db, 99, "2024-12-27", 2, 5000)  # below 5-row threshold

    assert compute_dxp_scores(db) == 0
    assert db.execute("SELECT * FROM dxp_item_scores WHERE item_id=99").fetchone() is None


def test_threshold_boundary(db):
    """4 samples → skipped; 5 samples → scored (even if lifts are None)."""
    now = "2026-03-22T00:00:00+00:00"
    for item_id, name in [(10, "Just below"), (11, "Exactly at")]:
        db.execute(
            "INSERT OR IGNORE INTO item_catalog(item_id, item_name, buy_limit, members) "
            "VALUES(?, ?, 100, 1)", (item_id, name),
        )
    db.execute(
        "INSERT INTO dxp_events(start_date, end_date, source, status, created_at, updated_at) "
        "VALUES('2025-01-10', '2025-01-12', 'wiki', 'confirmed', ?, ?)", (now, now),
    )
    db.commit()
    _insert_daily_prices(db, 10, "2024-12-27", 4, 500)
    _insert_daily_prices(db, 11, "2024-12-27", 5, 600)

    compute_dxp_scores(db)
    assert db.execute("SELECT * FROM dxp_item_scores WHERE item_id=10").fetchone() is None
    assert db.execute("SELECT * FROM dxp_item_scores WHERE item_id=11").fetchone() is not None


def test_writes_score_report_with_triggering_date(scored_db):
    compute_dxp_scores(scored_db, triggering_event_end_date="2025-06-08")
    report = scored_db.execute(
        "SELECT * FROM dxp_score_reports ORDER BY id DESC LIMIT 1"
    ).fetchone()
    assert report is not None
    assert report["triggering_event_end_date"] == "2025-06-08"
    assert report["items_new"] == 1
    assert report["items_updated"] == 0
    assert report["items_unchanged"] == 0


def test_second_run_marks_unchanged(scored_db):
    compute_dxp_scores(scored_db)
    compute_dxp_scores(scored_db)
    report = scored_db.execute(
        "SELECT * FROM dxp_score_reports ORDER BY id DESC LIMIT 1"
    ).fetchone()
    assert report["items_unchanged"] == 1
    assert report["items_updated"] == 0
    assert report["items_new"] == 0


def test_detects_changed_scores_after_price_update(scored_db):
    compute_dxp_scores(scored_db)

    # Shift Event 2 pre-event prices up significantly
    scored_db.execute(
        "UPDATE price_cache SET price=2600 "
        "WHERE item_id=1 AND DATE(sampled_at) BETWEEN '2025-05-30' AND '2025-06-05'"
    )
    scored_db.commit()

    compute_dxp_scores(scored_db)
    report = scored_db.execute(
        "SELECT * FROM dxp_score_reports ORDER BY id DESC LIMIT 1"
    ).fetchone()
    assert report["items_updated"] == 1
    changes = json.loads(report["report_json"])
    assert len(changes) == 1
    assert changes[0]["item_id"] == 1
    assert changes[0]["pre_lift_pct"]["delta"] is not None


def test_empty_report_written_when_no_items_scored(db):
    """A dxp_score_reports row is written even when zero items pass the threshold."""
    now = "2026-03-22T00:00:00+00:00"
    db.execute(
        "INSERT OR IGNORE INTO item_catalog(item_id, item_name, buy_limit, members) "
        "VALUES(99, 'Sparse', 10, 1)"
    )
    db.execute(
        "INSERT INTO dxp_events(start_date, end_date, source, status, created_at, updated_at) "
        "VALUES('2025-01-10', '2025-01-12', 'wiki', 'confirmed', ?, ?)", (now, now),
    )
    db.commit()
    _insert_daily_prices(db, 99, "2024-12-27", 2, 5000)

    compute_dxp_scores(db)
    report = db.execute(
        "SELECT * FROM dxp_score_reports ORDER BY id DESC LIMIT 1"
    ).fetchone()
    assert report is not None
    assert report["items_new"] == 0
    assert report["items_updated"] == 0
    assert report["items_unchanged"] == 0
