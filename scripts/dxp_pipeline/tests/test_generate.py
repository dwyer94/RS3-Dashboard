"""Tests for generate.py — _build_output query logic."""
import json
import sqlite3
from datetime import datetime, timezone

import pytest

from database import init_db
from generate import _build_output


@pytest.fixture
def db():
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    init_db(conn)
    yield conn
    conn.close()


def _seed_event(conn, start: str, end: str, source: str = "wiki"):
    now = datetime.now(timezone.utc).isoformat()
    conn.execute(
        "INSERT INTO dxp_events(start_date, end_date, source, status, created_at, updated_at) "
        "VALUES(?, ?, ?, 'confirmed', ?, ?)",
        (start, end, source, now, now),
    )
    conn.commit()


def _seed_score(conn, item_id: int, name: str, pre: float, during: float, post: float, events: int = 3):
    conn.execute(
        "INSERT OR IGNORE INTO item_catalog(item_id, item_name, buy_limit, members) "
        "VALUES(?, ?, 100, 0)", (item_id, name),
    )
    conn.execute(
        "INSERT INTO dxp_item_scores(item_id, pre_lift_pct, during_lift_pct, post_lift_pct, "
        "events_observed, last_computed, decay_factor) VALUES(?, ?, ?, ?, ?, '2026-01-01', 0.75)",
        (item_id, pre, during, post, events),
    )
    conn.commit()


# ── next_event / all_events ───────────────────────────────────────────────────

def test_next_event_is_earliest_upcoming(db):
    _seed_event(db, "2026-06-01", "2026-06-04")
    _seed_event(db, "2026-09-01", "2026-09-04")
    out = _build_output(db)
    assert out["next_event"]["start_date"] == "2026-06-01"
    assert len(out["all_events"]) == 2


def test_next_event_is_none_when_no_events(db):
    out = _build_output(db)
    assert out["next_event"] is None
    assert out["all_events"] == []


def test_past_events_excluded_from_all_events(db):
    _seed_event(db, "2020-01-10", "2020-01-13")   # past
    _seed_event(db, "2026-06-01", "2026-06-04")   # future
    out = _build_output(db)
    assert len(out["all_events"]) == 1
    assert out["all_events"][0]["start_date"] == "2026-06-01"


def test_days_until_is_non_negative(db):
    _seed_event(db, "2026-05-16", "2026-05-19")
    out = _build_output(db)
    assert out["next_event"]["days_until"] >= 0


# ── top_movers ────────────────────────────────────────────────────────────────

def test_top_movers_sorted_by_abs_pre_lift(db):
    _seed_score(db, 1, "Item A", pre=5.0,  during=-1.0, post=-2.0)
    _seed_score(db, 2, "Item B", pre=20.0, during=-3.0, post=-5.0)
    _seed_score(db, 3, "Item C", pre=10.0, during=-2.0, post=-3.0)
    out = _build_output(db)
    pcts = [m["pre_lift_pct"] for m in out["top_movers"]]
    assert pcts == sorted(pcts, key=abs, reverse=True)


def test_top_movers_requires_min_2_events(db):
    _seed_score(db, 1, "Enough",     pre=15.0, during=-2.0, post=-4.0, events=2)
    _seed_score(db, 2, "Not enough", pre=99.0, during=-9.0, post=-9.0, events=1)
    out = _build_output(db)
    ids = [m["item_id"] for m in out["top_movers"]]
    assert 1 in ids
    assert 2 not in ids


def test_top_movers_capped_at_20(db):
    for i in range(25):
        _seed_score(db, i + 1, f"Item {i}", pre=float(i), during=-1.0, post=-1.0)
    out = _build_output(db)
    assert len(out["top_movers"]) == 20


def test_top_movers_empty_when_no_scores(db):
    out = _build_output(db)
    assert out["top_movers"] == []


# ── aggregate stats ───────────────────────────────────────────────────────────

def test_avg_stats_computed_correctly(db):
    _seed_score(db, 1, "A", pre=10.0, during=-4.0, post=-8.0)
    _seed_score(db, 2, "B", pre=20.0, during=-6.0, post=-10.0)
    out = _build_output(db)
    assert out["avg_pre_lift_pct"]    == pytest.approx(15.0, abs=0.1)
    assert out["avg_during_lift_pct"] == pytest.approx(-5.0, abs=0.1)
    assert out["avg_post_lift_pct"]   == pytest.approx(-9.0, abs=0.1)


def test_avg_stats_none_when_no_scored_items(db):
    out = _build_output(db)
    assert out["avg_pre_lift_pct"] is None
    assert out["avg_during_lift_pct"] is None
    assert out["avg_post_lift_pct"] is None


def test_scored_items_count(db):
    _seed_score(db, 1, "A", pre=5.0,  during=-1.0, post=-2.0)
    _seed_score(db, 2, "B", pre=10.0, during=-2.0, post=-4.0)
    out = _build_output(db)
    assert out["scored_items"] == 2


# ── sync_status ───────────────────────────────────────────────────────────────

def test_sync_status_ok_when_no_error(db):
    db.execute("UPDATE app_config SET value='2026-04-22T03:00:00+00:00' WHERE key='dxp_last_sync'")
    db.commit()
    out = _build_output(db)
    assert out["sync_status"]["ok"] is True
    assert out["sync_status"]["error"] is None
    assert out["sync_status"]["last_sync"] == "2026-04-22T03:00:00+00:00"


def test_sync_status_not_ok_when_error_present(db):
    db.execute("UPDATE app_config SET value='2026-04-22T03:00:00+00:00 — Wiki down' WHERE key='dxp_last_error'")
    db.commit()
    out = _build_output(db)
    assert out["sync_status"]["ok"] is False
    assert out["sync_status"]["error"] is not None


def test_generated_at_is_valid_iso(db):
    out = _build_output(db)
    datetime.fromisoformat(out["generated_at"])  # raises if invalid
