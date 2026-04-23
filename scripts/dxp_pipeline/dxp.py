"""DXP Intelligence Service.

Provides wiki scraping, calendar sync, and per-item score computation
for Double XP Weekend events.
"""
from __future__ import annotations

import json
import re
import sqlite3
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Optional

import httpx

WIKI_API_URL = (
    "https://runescape.wiki/api.php"
    "?action=parse&page=Double_XP&prop=wikitext&format=json&redirects=1"
)
_USER_AGENT = "RunescapeDashboard/1.0 (personal project)"

# Minimum / maximum valid DXP weekend duration in days (inclusive)
_MIN_DURATION = 3
_MAX_DURATION = 7

# Wikitext date format: [[14 November]] [[2025]] (optionally followed by time)
_WIKI_DATE_PAT = re.compile(
    r"\[\[(\d{1,2}) "
    r"(January|February|March|April|May|June|July|August|"
    r"September|October|November|December)\]\]\s*\[\[(\d{4})\]\]"
)
_MONTH_NUM = {
    "January": 1, "February": 2, "March": 3, "April": 4,
    "May": 5, "June": 6, "July": 7, "August": 8,
    "September": 9, "October": 10, "November": 11, "December": 12,
}


# ── Exceptions ────────────────────────────────────────────────────────────────


class DXPScrapeError(Exception):
    """Raised when the wiki scrape fails for any reason."""

    def __init__(self, message: str, cause: Optional[Exception] = None):
        super().__init__(message)
        self.cause = cause


# ── Data types ────────────────────────────────────────────────────────────────


@dataclass
class DXPEvent:
    start_date: str   # YYYY-MM-DD
    end_date: str     # YYYY-MM-DD
    source: str       # 'wiki' | 'manual'
    status: str       # 'confirmed' | 'estimated'
    wiki_url: Optional[str] = None


# ── Scraper ───────────────────────────────────────────────────────────────────


def scrape_dxp_wiki() -> list[DXPEvent]:
    """Fetch and parse the RS Wiki DXP Weekend page.

    Returns a list of DXPEvent objects for ALL events found (past and upcoming).
    Raises DXPScrapeError on any failure (HTTP error, parse failure, zero events).
    """
    try:
        with httpx.Client(headers={"User-Agent": _USER_AGENT}, timeout=15.0) as client:
            response = client.get(WIKI_API_URL)
            response.raise_for_status()
            data = response.json()
    except DXPScrapeError:
        raise
    except Exception as exc:
        raise DXPScrapeError(f"Wiki HTTP request failed: {exc}", exc) from exc

    try:
        wikitext: str = data["parse"]["wikitext"]["*"]
    except (KeyError, TypeError) as exc:
        raise DXPScrapeError(f"Unexpected wiki API response structure: {exc}", exc) from exc

    def _parse_date(text: str) -> Optional[str]:
        """Extract the first [[Day Month]] [[Year]] date from a cell string."""
        m = _WIKI_DATE_PAT.search(text)
        if not m:
            return None
        day, month, year = m.group(1), m.group(2), m.group(3)
        return f"{year}-{_MONTH_NUM[month]:02d}-{int(day):02d}"

    events: list[DXPEvent] = []
    seen_starts: set[str] = set()

    # Split into row blocks and parse each row as: announcement | start | end | notes
    for block in re.split(r"\|-", wikitext):
        # Collect cells: lines starting with | but not |-, |+, or ||
        cells = re.findall(r"^\|(?![-+|])([^\n]*)", block, re.MULTILINE)
        if len(cells) < 3:
            continue

        start_str = _parse_date(cells[1])  # 2nd cell = start date
        end_str = _parse_date(cells[2])    # 3rd cell = end date
        if not start_str or not end_str:
            continue

        try:
            start_d = date.fromisoformat(start_str)
            end_d = date.fromisoformat(end_str)
        except ValueError:
            continue

        duration = (end_d - start_d).days
        # Modern DXP events range 3–14 days
        if end_d <= start_d or not (_MIN_DURATION <= duration <= 14):
            continue

        if start_str in seen_starts:
            continue
        seen_starts.add(start_str)

        events.append(
            DXPEvent(
                start_date=start_str,
                end_date=end_str,
                source="wiki",
                status="confirmed",
                wiki_url=WIKI_API_URL,
            )
        )

    if not events:
        raise DXPScrapeError(
            "No valid DXP events found in wiki response. "
            "The wikitext format may have changed."
        )

    return events


# ── Calendar sync ─────────────────────────────────────────────────────────────


def refresh_dxp_calendar(conn: sqlite3.Connection) -> dict:
    """Sync DXP events from the RS Wiki into dxp_events.

    On success: upserts all events and updates dxp_last_sync / clears dxp_last_error.
    On DXPScrapeError: writes error to dxp_last_error; existing events are preserved.

    Returns {"events_upserted": N, "error": null | "message string"}.
    """
    try:
        events = scrape_dxp_wiki()
    except DXPScrapeError as exc:
        error_msg = f"{datetime.now(timezone.utc).isoformat()} — {exc}"
        conn.execute(
            "UPDATE app_config SET value=? WHERE key='dxp_last_error'",
            (error_msg,),
        )
        conn.commit()
        print(f"[dxp] refresh_dxp_calendar failed: {exc}")
        return {"events_upserted": 0, "error": str(exc)}

    now = datetime.now(timezone.utc).isoformat()

    for event in events:
        # Two-step upsert: INSERT OR IGNORE preserves created_at for existing rows;
        # UPDATE then keeps mutable fields (end_date, status, wiki_url) current.
        # The AND source='wiki' guard on UPDATE ensures manual entries are never modified.
        conn.execute(
            "INSERT OR IGNORE INTO dxp_events "
            "(start_date, end_date, source, status, wiki_url, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (event.start_date, event.end_date, event.source, event.status, event.wiki_url, now, now),
        )
        conn.execute(
            "UPDATE dxp_events SET end_date=?, status=?, wiki_url=?, updated_at=? "
            "WHERE start_date=? AND source='wiki'",
            (event.end_date, event.status, event.wiki_url, now, event.start_date),
        )

    conn.execute("UPDATE app_config SET value=? WHERE key='dxp_last_sync'", (now,))
    conn.execute("UPDATE app_config SET value='' WHERE key='dxp_last_error'")
    conn.commit()

    return {"events_upserted": len(events), "error": None}


# ── Score engine ──────────────────────────────────────────────────────────────

_MIN_SAMPLES = 5  # Minimum price samples across a full event window to be scored


def compute_dxp_scores(
    conn: sqlite3.Connection,
    triggering_event_end_date: Optional[str] = None,
) -> int:
    """Compute per-item DXP response scores from price_cache data.

    For each item in item_catalog, calculates weighted average lift percentages
    (pre-event, during, post-event) across all DXP events in dxp_events.
    Weights decay exponentially, favouring more recent events.

    Always runs via asyncio.to_thread() from async callers — never call directly
    in an async function.

    Returns count of items written (or updated) in dxp_item_scores.
    """
    events = conn.execute(
        "SELECT id, start_date, end_date FROM dxp_events ORDER BY start_date ASC"
    ).fetchall()
    if not events:
        return 0

    # Read config
    decay_cfg = conn.execute(
        "SELECT value FROM app_config WHERE key='dxp_decay_factor'"
    ).fetchone()
    decay = float(decay_cfg["value"]) if decay_cfg else 0.75

    # Snapshot existing scores for delta reporting
    existing_scores: dict[int, dict] = {
        row["item_id"]: dict(row)
        for row in conn.execute("SELECT * FROM dxp_item_scores").fetchall()
    }

    item_ids = [
        r["item_id"]
        for r in conn.execute("SELECT item_id FROM item_catalog").fetchall()
    ]

    now = datetime.now(timezone.utc).isoformat()

    if not item_ids:
        conn.execute(
            "INSERT INTO dxp_score_reports "
            "(computed_at, triggering_event_end_date, items_updated, items_unchanged, items_new, report_json) "
            "VALUES (?, ?, 0, 0, 0, '[]')",
            (now, triggering_event_end_date),
        )
        conn.commit()
        return 0

    # Per-item score data collected for batch write
    score_rows: list[tuple] = []

    for item_id in item_ids:
        # Per-event lift data, collected newest-first for decay weighting
        pre_lifts: list[float] = []
        during_lifts: list[float] = []
        post_lifts: list[float] = []
        # Track whether this item passed the sample threshold for at least one event
        passed_threshold = False

        for event in reversed(events):  # newest-first → i=0 = most recent
            start_d = date.fromisoformat(event["start_date"])
            end_d = date.fromisoformat(event["end_date"])

            # Fetch all daily prices for this item covering the full window
            window_start = (start_d - timedelta(days=14)).isoformat()
            window_end = (end_d + timedelta(days=14)).isoformat()

            price_rows = conn.execute(
                """
                SELECT DATE(sampled_at) AS day, AVG(price) AS price
                FROM price_cache
                WHERE item_id = ?
                  AND DATE(sampled_at) BETWEEN ? AND ?
                GROUP BY DATE(sampled_at)
                ORDER BY day ASC
                """,
                (item_id, window_start, window_end),
            ).fetchall()

            if len(price_rows) < _MIN_SAMPLES:
                continue

            # Item has enough data for this event window
            passed_threshold = True

            prices_by_day: dict[str, float] = {r["day"]: r["price"] for r in price_rows}

            def _window_avg(start: date, end: date) -> Optional[float]:
                prices = [
                    prices_by_day[d.isoformat()]
                    for i in range((end - start).days + 1)
                    if (d := start + timedelta(days=i)) and d.isoformat() in prices_by_day
                ]
                return sum(prices) / len(prices) if prices else None

            baseline_avg = _window_avg(start_d - timedelta(days=14), start_d - timedelta(days=8))
            pre_avg = _window_avg(start_d - timedelta(days=7), start_d - timedelta(days=1))
            during_avg = _window_avg(start_d, end_d)
            post_avg = _window_avg(end_d + timedelta(days=1), end_d + timedelta(days=14))

            if baseline_avg is None or baseline_avg == 0:
                continue
            if pre_avg is None or during_avg is None or post_avg is None:
                continue

            pre_lifts.append((pre_avg - baseline_avg) / baseline_avg * 100)
            during_lifts.append((during_avg - baseline_avg) / baseline_avg * 100)
            post_lifts.append((post_avg - baseline_avg) / baseline_avg * 100)

        # Skip items that never passed the sample threshold for any event
        if not passed_threshold:
            continue

        if not pre_lifts:
            # Passed threshold but couldn't compute lifts — write row with None values
            score_rows.append((item_id, None, None, None, 0, now, decay))
            continue

        # Exponential decay weighting (i=0 → most recent event → weight=1.0)
        weights = [decay ** i for i in range(len(pre_lifts))]
        total_w = sum(weights)

        def _weighted_avg(lifts: list[float]) -> float:
            return sum(l * w for l, w in zip(lifts, weights)) / total_w

        pre_lift_pct = _weighted_avg(pre_lifts)
        during_lift_pct = _weighted_avg(during_lifts)
        post_lift_pct = _weighted_avg(post_lifts)
        events_observed = len(pre_lifts)

        score_rows.append(
            (item_id, pre_lift_pct, during_lift_pct, post_lift_pct, events_observed, now, decay)
        )

    if not score_rows:
        # Write empty report if nothing was scored
        conn.execute(
            "INSERT INTO dxp_score_reports "
            "(computed_at, triggering_event_end_date, items_updated, items_unchanged, items_new, report_json) "
            "VALUES (?, ?, 0, 0, 0, '[]')",
            (now, triggering_event_end_date),
        )
        conn.commit()
        return 0

    # Write scores and build delta report in one transaction
    changes: list[dict] = []
    items_new = 0
    items_updated = 0
    items_unchanged = 0

    for row in score_rows:
        item_id, pre_lift, during_lift, post_lift, events_obs, _, _ = row
        conn.execute(
            """
            INSERT INTO dxp_item_scores
                (item_id, pre_lift_pct, during_lift_pct, post_lift_pct, events_observed, last_computed, decay_factor)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(item_id) DO UPDATE SET
                pre_lift_pct=excluded.pre_lift_pct,
                during_lift_pct=excluded.during_lift_pct,
                post_lift_pct=excluded.post_lift_pct,
                events_observed=excluded.events_observed,
                last_computed=excluded.last_computed,
                decay_factor=excluded.decay_factor
            """,
            row,
        )

        def _safe_round(v) -> Optional[float]:
            return round(v, 4) if v is not None else None

        old = existing_scores.get(item_id)
        if old is None:
            items_new += 1
            changes.append({
                "item_id": item_id,
                "pre_lift_pct":    {"old": None, "new": _safe_round(pre_lift), "delta": None},
                "during_lift_pct": {"old": None, "new": _safe_round(during_lift), "delta": None},
                "post_lift_pct":   {"old": None, "new": _safe_round(post_lift), "delta": None},
                "events_observed": {"old": None, "new": events_obs},
            })
        else:
            def _changed(old_val, new_val) -> bool:
                if old_val is None and new_val is None:
                    return False
                if old_val is None or new_val is None:
                    return True
                return abs(new_val - old_val) > 0.1

            any_change = (
                _changed(old.get("pre_lift_pct"), pre_lift)
                or _changed(old.get("during_lift_pct"), during_lift)
                or _changed(old.get("post_lift_pct"), post_lift)
                or old.get("events_observed") != events_obs
            )
            if any_change:
                items_updated += 1

                def _safe_delta(new_val, old_val) -> Optional[float]:
                    if new_val is None or old_val is None:
                        return None
                    return round(new_val - old_val, 4)

                changes.append({
                    "item_id": item_id,
                    "pre_lift_pct":    {"old": old.get("pre_lift_pct"), "new": _safe_round(pre_lift), "delta": _safe_delta(pre_lift, old.get("pre_lift_pct"))},
                    "during_lift_pct": {"old": old.get("during_lift_pct"), "new": _safe_round(during_lift), "delta": _safe_delta(during_lift, old.get("during_lift_pct"))},
                    "post_lift_pct":   {"old": old.get("post_lift_pct"), "new": _safe_round(post_lift), "delta": _safe_delta(post_lift, old.get("post_lift_pct"))},
                    "events_observed": {"old": old.get("events_observed"), "new": events_obs},
                })
            else:
                items_unchanged += 1

    updated_count = len(score_rows)

    conn.execute(
        "INSERT INTO dxp_score_reports "
        "(computed_at, triggering_event_end_date, items_updated, items_unchanged, items_new, report_json) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (
            now,
            triggering_event_end_date,
            items_updated,
            items_unchanged,
            items_new,
            json.dumps(changes),
        ),
    )
    conn.commit()
    return updated_count
