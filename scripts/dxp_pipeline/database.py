"""Minimal SQLite schema for the DXP pipeline."""
import sqlite3
from pathlib import Path


def create_connection(db_path: str | Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS app_config (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        INSERT OR IGNORE INTO app_config(key, value) VALUES
            ('dxp_decay_factor', '0.75'),
            ('dxp_post_event_delay_days', '14'),
            ('dxp_last_error', ''),
            ('dxp_last_sync', '');

        CREATE TABLE IF NOT EXISTS item_catalog (
            item_id      INTEGER PRIMARY KEY,
            item_name    TEXT NOT NULL,
            buy_limit    INTEGER NOT NULL DEFAULT 100,
            members      INTEGER NOT NULL DEFAULT 0,
            last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS price_cache (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id    INTEGER NOT NULL,
            price      INTEGER NOT NULL,
            volume     INTEGER,
            sampled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_price_cache_item_time
            ON price_cache(item_id, sampled_at);

        CREATE TABLE IF NOT EXISTS dxp_events (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            start_date  TEXT NOT NULL,
            end_date    TEXT NOT NULL,
            source      TEXT NOT NULL,
            status      TEXT NOT NULL,
            wiki_url    TEXT,
            created_at  TEXT NOT NULL,
            updated_at  TEXT NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS uq_dxp_events_start
            ON dxp_events(start_date);

        CREATE TABLE IF NOT EXISTS dxp_score_reports (
            id                        INTEGER PRIMARY KEY AUTOINCREMENT,
            computed_at               TEXT NOT NULL,
            triggering_event_end_date TEXT,
            items_updated             INTEGER NOT NULL DEFAULT 0,
            items_unchanged           INTEGER NOT NULL DEFAULT 0,
            items_new                 INTEGER NOT NULL DEFAULT 0,
            report_json               TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS dxp_item_scores (
            item_id          INTEGER PRIMARY KEY REFERENCES item_catalog(item_id),
            pre_lift_pct     REAL,
            during_lift_pct  REAL,
            post_lift_pct    REAL,
            events_observed  INTEGER NOT NULL DEFAULT 0,
            last_computed    TEXT,
            decay_factor     REAL
        );
    """)
    conn.commit()

    # Deduplicate price_cache and enforce unique-per-day index (idempotent)
    try:
        conn.execute("""
            DELETE FROM price_cache
            WHERE id NOT IN (
                SELECT MAX(id) FROM price_cache
                GROUP BY item_id, DATE(sampled_at)
            )
        """)
        conn.commit()
    except Exception:
        pass

    try:
        conn.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_price_cache_item_day
            ON price_cache(item_id, DATE(sampled_at))
        """)
        conn.commit()
    except Exception:
        pass


def refresh_catalog(conn: sqlite3.Connection, dump: dict[int, dict]) -> int:
    """Upsert item_catalog from an rs_dump dict. Returns number of items processed."""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    conn.executemany(
        "INSERT INTO item_catalog(item_id, item_name, buy_limit, members, last_seen_at) "
        "VALUES(?, ?, ?, ?, ?) "
        "ON CONFLICT(item_id) DO UPDATE SET "
        "item_name=excluded.item_name, buy_limit=excluded.buy_limit, "
        "members=excluded.members, last_seen_at=excluded.last_seen_at",
        [
            (item_id, d["name"], d["buy_limit"], int(d["members"]), now)
            for item_id, d in dump.items()
        ],
    )
    conn.commit()
    return len(dump)
