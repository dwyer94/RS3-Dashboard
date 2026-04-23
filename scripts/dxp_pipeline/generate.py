"""DXP pipeline orchestration script.

Runs the full pipeline:
  1. Open/create SQLite DB (cached between CI runs)
  2. Fetch rs_dump → upsert item_catalog + today's prices (1 API call)
  3. Backfill full price history for new items (cold start only)
  4. Refresh DXP calendar from RS Wiki
  5. Compute per-item DXP scores
  6. Export dxp_scores.json

Environment variables:
  DXP_DB_PATH      Path to SQLite DB (default: ./dxp_data.db)
  DXP_OUTPUT_PATH  Path for output JSON (default: ./dxp_scores.json)
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import httpx

# Resolve paths relative to this script so it works from any working directory
_HERE = Path(__file__).parent
DB_PATH = Path(os.environ.get("DXP_DB_PATH", _HERE / "dxp_data.db"))
OUTPUT_PATH = Path(os.environ.get("DXP_OUTPUT_PATH", _HERE / "dxp_scores.json"))

_RETRY_STATUS = {429}
_MAX_RETRIES = 3
_BASE_DELAY = 2.0

# Number of top movers to include in dxp_scores.json.
# Raise this if the widget needs more rows (e.g. for pagination or a wider table).
TOP_MOVERS_LIMIT = 100


async def _fetch_with_retry(fetch_fn, *args, **kwargs):
    for attempt in range(_MAX_RETRIES + 1):
        try:
            return await fetch_fn(*args, **kwargs)
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code in _RETRY_STATUS and attempt < _MAX_RETRIES:
                delay = _BASE_DELAY * (2 ** attempt)
                print(f"  [rate limit] 429 on attempt {attempt + 1}, retrying in {delay}s...")
                await asyncio.sleep(delay)
                continue
            raise
    return []


async def _backfill_full_history(conn, item_ids: list[int]) -> int:
    """Fetch 365-day price history for each item_id. Concurrency limited to 10."""
    from ge_client import fetch_full_item_history

    sem = asyncio.Semaphore(10)

    async def _fetch_one(item_id: int) -> list[tuple]:
        async with sem:
            try:
                records = await _fetch_with_retry(fetch_full_item_history, item_id)
                return [
                    (
                        item_id,
                        r["price"],
                        r["volume"],
                        datetime.fromtimestamp(r["timestamp_ms"] / 1000, tz=timezone.utc).isoformat(),
                    )
                    for r in records
                ]
            except Exception as e:
                print(f"  [backfill] item {item_id} error: {e}")
                return []

    print(f"  Fetching history for {len(item_ids)} items (concurrency=10)...")
    rows_per_item = await asyncio.gather(*(_fetch_one(iid) for iid in item_ids))

    count_before = conn.execute("SELECT COUNT(*) FROM price_cache").fetchone()[0]
    for rows in rows_per_item:
        if rows:
            conn.executemany(
                "INSERT OR IGNORE INTO price_cache(item_id, price, volume, sampled_at) "
                "VALUES(?, ?, ?, ?)",
                rows,
            )
    conn.commit()
    count_after = conn.execute("SELECT COUNT(*) FROM price_cache").fetchone()[0]
    return count_after - count_before


def _build_output(conn) -> dict:
    """Query the DB and build the dxp_scores.json payload."""
    today = datetime.now(timezone.utc).date().isoformat()

    # Upcoming events (end_date >= today), sorted ascending
    all_events = [
        dict(row)
        for row in conn.execute(
            "SELECT id, start_date, end_date, status, source "
            "FROM dxp_events WHERE end_date >= ? ORDER BY start_date ASC",
            (today,),
        ).fetchall()
    ]
    for ev in all_events:
        start = ev["start_date"]
        days_until = max(0, (datetime.fromisoformat(start).date() - datetime.fromisoformat(today).date()).days)
        ev["days_until"] = days_until

    next_event = all_events[0] if all_events else None

    # Top movers: top N by abs(pre_lift_pct), min 2 events observed
    top_movers = [
        dict(row)
        for row in conn.execute(
            """
            SELECT s.item_id, c.item_name,
                   s.pre_lift_pct, s.during_lift_pct, s.post_lift_pct,
                   s.events_observed
            FROM dxp_item_scores s
            LEFT JOIN item_catalog c ON c.item_id = s.item_id
            WHERE s.events_observed >= 2
              AND s.pre_lift_pct IS NOT NULL
            ORDER BY ABS(s.pre_lift_pct) DESC
            LIMIT ?
            """,
            (TOP_MOVERS_LIMIT,),
        ).fetchall()
    ]

    # Aggregate stats across all scored items (min 2 events)
    stats = conn.execute(
        """
        SELECT AVG(pre_lift_pct)    AS avg_pre,
               AVG(during_lift_pct) AS avg_during,
               AVG(post_lift_pct)   AS avg_post,
               COUNT(*)             AS scored
        FROM dxp_item_scores
        WHERE events_observed >= 2
          AND pre_lift_pct IS NOT NULL
        """
    ).fetchone()

    # Sync metadata
    sync_row = conn.execute(
        "SELECT value FROM app_config WHERE key='dxp_last_sync'"
    ).fetchone()
    err_row = conn.execute(
        "SELECT value FROM app_config WHERE key='dxp_last_error'"
    ).fetchone()
    last_sync = sync_row["value"] if sync_row and sync_row["value"] else None
    last_error = err_row["value"] if err_row and err_row["value"] else None

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "next_event": next_event,
        "all_events": all_events,
        "top_movers": top_movers,
        "avg_pre_lift_pct": round(stats["avg_pre"], 2) if stats["avg_pre"] is not None else None,
        "avg_during_lift_pct": round(stats["avg_during"], 2) if stats["avg_during"] is not None else None,
        "avg_post_lift_pct": round(stats["avg_post"], 2) if stats["avg_post"] is not None else None,
        "scored_items": stats["scored"] or 0,
        "sync_status": {
            "ok": last_error is None,
            "last_sync": last_sync,
            "error": last_error,
        },
    }


async def main() -> None:
    # Imports are relative — script must run from its own directory or via python -m
    sys.path.insert(0, str(_HERE))
    from database import create_connection, init_db, refresh_catalog
    from ge_client import fetch_rs_dump
    from dxp import refresh_dxp_calendar, compute_dxp_scores

    print(f"[generate] DB: {DB_PATH}")
    print(f"[generate] Output: {OUTPUT_PATH}")

    conn = create_connection(DB_PATH)
    init_db(conn)

    # Step 1: Fetch rs_dump — populates item_catalog and gives us today's prices
    print("[generate] Fetching rs_dump (all items)...")
    dump = await fetch_rs_dump()
    print(f"  {len(dump)} items received")
    refresh_catalog(conn, dump)

    # Insert today's prices from the dump
    now = datetime.now(timezone.utc).isoformat()
    conn.executemany(
        "INSERT OR IGNORE INTO price_cache(item_id, price, volume, sampled_at) "
        "VALUES(?, ?, ?, ?)",
        [
            (item_id, d["price"], d.get("volume"), now)
            for item_id, d in dump.items()
            if d.get("price", 0) > 0
        ],
    )
    conn.commit()

    # Step 2: Backfill history for items that have none (cold start or new items)
    items_without_history = [
        r[0]
        for r in conn.execute(
            """
            SELECT c.item_id FROM item_catalog c
            WHERE NOT EXISTS (
                SELECT 1 FROM price_cache p
                WHERE p.item_id = c.item_id
                  AND DATE(p.sampled_at) < DATE('now')
            )
            """
        ).fetchall()
    ]

    if items_without_history:
        print(f"[generate] Backfilling {len(items_without_history)} items with no history...")
        inserted = await _backfill_full_history(conn, items_without_history)
        print(f"  Inserted {inserted} new price rows")
    else:
        print("[generate] Price history up to date, skipping backfill")

    # Step 3: Refresh DXP calendar from wiki
    print("[generate] Refreshing DXP calendar from wiki...")
    result = refresh_dxp_calendar(conn)
    print(f"  Events upserted: {result['events_upserted']}, error: {result['error']}")

    # Step 4: Compute DXP scores
    print("[generate] Computing DXP scores...")
    updated = compute_dxp_scores(conn)
    print(f"  Items scored/updated: {updated}")

    # Step 5: Build and write output JSON
    print("[generate] Building output JSON...")
    output = _build_output(conn)
    OUTPUT_PATH.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"[generate] Written: {OUTPUT_PATH}")
    print(f"  next_event: {output['next_event']}")
    print(f"  top_movers: {len(output['top_movers'])} items")
    print(f"  scored_items: {output['scored_items']}")

    conn.close()


if __name__ == "__main__":
    asyncio.run(main())
