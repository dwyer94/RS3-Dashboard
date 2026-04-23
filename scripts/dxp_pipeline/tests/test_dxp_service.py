"""Tests for dxp.py — wiki scraping and calendar sync."""
import sqlite3
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest

from database import init_db
from dxp import WIKI_API_URL, DXPEvent, DXPScrapeError, refresh_dxp_calendar, scrape_dxp_wiki

# ── Wikitext fixtures ─────────────────────────────────────────────────────────

VALID_WIKITEXT = """\
== Double XP Weekend events ==
{| class="wikitable"
|-
! Announcement !! Start date !! End date !! Notes
|-
| [[1 January]] [[2025]]
| [[10 January]] [[2025]] (12:00)
| [[13 January]] [[2025]] (12:00)
| Some notes here.
|-
| [[1 May]] [[2026]]
| [[16 May]] [[2026]] (12:00)
| [[19 May]] [[2026]] (12:00)
| Some notes here.
|}
"""

# Duration > 14 days — should be rejected
IMPLAUSIBLE_WIKITEXT = """\
== Events ==
{| class="wikitable"
|-
| [[1 May]] [[2026]]
| [[16 May]] [[2026]] (12:00)
| [[5 June]] [[2026]] (12:00)
| Notes.
|}
"""

EMPTY_WIKITEXT = "No dates here at all."


def _make_wiki_response(wikitext: str, status: int = 200):
    mock = MagicMock()
    mock.status_code = status
    mock.raise_for_status = MagicMock()
    if status != 200:
        mock.raise_for_status.side_effect = Exception(f"HTTP {status}")
    mock.json.return_value = {"parse": {"wikitext": {"*": wikitext}}}
    return mock


@pytest.fixture
def db():
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    init_db(conn)
    yield conn
    conn.close()


def _mock_scrape(events):
    return patch("dxp.scrape_dxp_wiki", return_value=events)


# ── scrape_dxp_wiki ───────────────────────────────────────────────────────────

def test_scrape_returns_events_on_valid_response():
    with patch("dxp.httpx.Client") as mock_cls:
        mock_client = MagicMock()
        mock_cls.return_value.__enter__.return_value = mock_client
        mock_client.get.return_value = _make_wiki_response(VALID_WIKITEXT)

        events = scrape_dxp_wiki()

    assert len(events) == 2
    starts = {e.start_date for e in events}
    assert "2025-01-10" in starts
    assert "2026-05-16" in starts
    for e in events:
        assert e.source == "wiki"
        assert e.status == "confirmed"
        assert e.wiki_url is not None


def test_scrape_raises_on_http_error():
    with patch("dxp.httpx.Client") as mock_cls:
        mock_client = MagicMock()
        mock_cls.return_value.__enter__.return_value = mock_client
        mock_client.get.return_value = _make_wiki_response("", status=404)

        with pytest.raises(DXPScrapeError):
            scrape_dxp_wiki()


def test_scrape_raises_on_zero_events():
    with patch("dxp.httpx.Client") as mock_cls:
        mock_client = MagicMock()
        mock_cls.return_value.__enter__.return_value = mock_client
        mock_client.get.return_value = _make_wiki_response(EMPTY_WIKITEXT)

        with pytest.raises(DXPScrapeError, match="No valid DXP events"):
            scrape_dxp_wiki()


def test_scrape_raises_on_implausible_dates():
    with patch("dxp.httpx.Client") as mock_cls:
        mock_client = MagicMock()
        mock_cls.return_value.__enter__.return_value = mock_client
        mock_client.get.return_value = _make_wiki_response(IMPLAUSIBLE_WIKITEXT)

        with pytest.raises(DXPScrapeError, match="No valid DXP events"):
            scrape_dxp_wiki()


def test_scrape_raises_on_network_error():
    with patch("dxp.httpx.Client") as mock_cls:
        mock_client = MagicMock()
        mock_cls.return_value.__enter__.return_value = mock_client
        mock_client.get.side_effect = Exception("Connection refused")

        with pytest.raises(DXPScrapeError):
            scrape_dxp_wiki()


def test_scrape_deduplicates_same_start_date():
    """If the same start_date appears twice in wikitext, only one event is returned."""
    doubled = VALID_WIKITEXT + """\
|-
| [[1 January]] [[2025]]
| [[10 January]] [[2025]] (12:00)
| [[13 January]] [[2025]] (12:00)
| Duplicate row.
|}
"""
    with patch("dxp.httpx.Client") as mock_cls:
        mock_client = MagicMock()
        mock_cls.return_value.__enter__.return_value = mock_client
        mock_client.get.return_value = _make_wiki_response(doubled)

        events = scrape_dxp_wiki()

    starts = [e.start_date for e in events]
    assert starts.count("2025-01-10") == 1


# ── refresh_dxp_calendar ──────────────────────────────────────────────────────

def test_refresh_inserts_new_events(db):
    events = [
        DXPEvent("2026-05-16", "2026-05-19", "wiki", "confirmed", WIKI_API_URL),
        DXPEvent("2025-11-21", "2025-11-24", "wiki", "confirmed", WIKI_API_URL),
    ]
    with _mock_scrape(events):
        result = refresh_dxp_calendar(db)

    assert result["events_upserted"] == 2
    assert result["error"] is None
    rows = db.execute("SELECT * FROM dxp_events ORDER BY start_date").fetchall()
    assert len(rows) == 2
    assert rows[0]["start_date"] == "2025-11-21"
    assert rows[1]["start_date"] == "2026-05-16"


def test_refresh_is_idempotent(db):
    events = [DXPEvent("2026-05-16", "2026-05-19", "wiki", "confirmed", WIKI_API_URL)]
    with _mock_scrape(events):
        refresh_dxp_calendar(db)
    with _mock_scrape(events):
        refresh_dxp_calendar(db)

    count = db.execute("SELECT COUNT(*) FROM dxp_events").fetchone()[0]
    assert count == 1


def test_refresh_preserves_created_at_on_update(db):
    """Two-step upsert must keep created_at from the first insert."""
    event_v1 = DXPEvent("2026-05-16", "2026-05-19", "wiki", "confirmed", WIKI_API_URL)
    with _mock_scrape([event_v1]):
        refresh_dxp_calendar(db)

    created_at_first = db.execute(
        "SELECT created_at FROM dxp_events WHERE start_date='2026-05-16'"
    ).fetchone()["created_at"]

    event_v2 = DXPEvent("2026-05-16", "2026-05-20", "wiki", "confirmed", WIKI_API_URL)
    with _mock_scrape([event_v2]):
        refresh_dxp_calendar(db)

    row = db.execute("SELECT * FROM dxp_events WHERE start_date='2026-05-16'").fetchone()
    assert row["end_date"] == "2026-05-20"
    assert row["created_at"] == created_at_first
    assert row["updated_at"] != row["created_at"]


def test_refresh_writes_last_sync_on_success(db):
    events = [DXPEvent("2026-05-16", "2026-05-19", "wiki", "confirmed", WIKI_API_URL)]
    with _mock_scrape(events):
        refresh_dxp_calendar(db)

    last_sync = db.execute(
        "SELECT value FROM app_config WHERE key='dxp_last_sync'"
    ).fetchone()["value"]
    assert last_sync != ""
    datetime.fromisoformat(last_sync)  # valid ISO 8601


def test_refresh_clears_last_error_on_success(db):
    db.execute("UPDATE app_config SET value='previous error' WHERE key='dxp_last_error'")
    db.commit()

    events = [DXPEvent("2026-05-16", "2026-05-19", "wiki", "confirmed", WIKI_API_URL)]
    with _mock_scrape(events):
        refresh_dxp_calendar(db)

    error = db.execute(
        "SELECT value FROM app_config WHERE key='dxp_last_error'"
    ).fetchone()["value"]
    assert error == ""


def test_refresh_writes_error_on_scrape_failure(db):
    with patch("dxp.scrape_dxp_wiki", side_effect=DXPScrapeError("Wiki down")):
        result = refresh_dxp_calendar(db)

    assert result["error"] is not None
    assert "Wiki down" in result["error"]
    stored = db.execute(
        "SELECT value FROM app_config WHERE key='dxp_last_error'"
    ).fetchone()["value"]
    assert "Wiki down" in stored


def test_refresh_preserves_existing_events_on_scrape_failure(db):
    existing = DXPEvent("2026-05-16", "2026-05-19", "wiki", "confirmed", WIKI_API_URL)
    with _mock_scrape([existing]):
        refresh_dxp_calendar(db)

    with patch("dxp.scrape_dxp_wiki", side_effect=DXPScrapeError("Wiki down")):
        refresh_dxp_calendar(db)

    count = db.execute("SELECT COUNT(*) FROM dxp_events").fetchone()[0]
    assert count == 1


def test_refresh_does_not_touch_manual_events(db):
    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "INSERT INTO dxp_events(start_date, end_date, source, status, created_at, updated_at) "
        "VALUES('2026-06-01', '2026-06-04', 'manual', 'confirmed', ?, ?)",
        (now, now),
    )
    db.commit()

    wiki_event = DXPEvent("2026-05-16", "2026-05-19", "wiki", "confirmed", WIKI_API_URL)
    with _mock_scrape([wiki_event]):
        refresh_dxp_calendar(db)

    manual = db.execute(
        "SELECT * FROM dxp_events WHERE start_date='2026-06-01'"
    ).fetchone()
    assert manual is not None
    assert manual["source"] == "manual"


def test_refresh_does_not_overwrite_manual_event_on_same_start_date(db):
    """Wiki event must not clobber a manual event with the same start_date."""
    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "INSERT INTO dxp_events(start_date, end_date, source, status, created_at, updated_at) "
        "VALUES('2026-05-16', '2026-05-20', 'manual', 'confirmed', ?, ?)",
        (now, now),
    )
    db.commit()

    wiki_event = DXPEvent("2026-05-16", "2026-05-19", "wiki", "confirmed", WIKI_API_URL)
    with _mock_scrape([wiki_event]):
        refresh_dxp_calendar(db)

    row = db.execute("SELECT * FROM dxp_events WHERE start_date='2026-05-16'").fetchone()
    assert row["source"] == "manual"
    assert row["end_date"] == "2026-05-20"
    assert db.execute("SELECT COUNT(*) FROM dxp_events").fetchone()[0] == 1
