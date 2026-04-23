"""Weird Gloop GE API client for the DXP pipeline."""
from datetime import datetime, timedelta, timezone

import httpx

WEIRD_GLOOP_BASE = "https://api.weirdgloop.org"
RS_DUMP_URL = "https://chisel.weirdgloop.org/gazproj/gazbot/rs_dump.json"

_DUMP_META_KEYS = {"%JAGEX_TIMESTAMP%", "%UPDATE_DETECTED%"}


async def fetch_rs_dump() -> dict[int, dict]:
    """Fetch the full RS3 GE item dump from Weird Gloop. One request, all ~7k items."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(RS_DUMP_URL)
        resp.raise_for_status()
        raw = resp.json()
    return {
        int(k): {
            "name": v.get("name", ""),
            "price": v.get("price", 0),
            "volume": v.get("volume"),
            "buy_limit": v.get("limit", 100),
            "members": bool(v.get("members", False)),
        }
        for k, v in raw.items()
        if k not in _DUMP_META_KEYS and isinstance(v, dict)
    }


async def fetch_full_item_history(item_id: int, since_days: int = 365) -> list[dict]:
    """Fetch full price history for one item from Weird Gloop, filtered to since_days."""
    cutoff_ms = int(
        (datetime.now(timezone.utc) - timedelta(days=since_days)).timestamp() * 1000
    )
    url = f"{WEIRD_GLOOP_BASE}/exchange/history/rs3/all?id={item_id}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()
    records = data.get(str(item_id), [])
    return sorted(
        [
            {
                "timestamp_ms": r["timestamp"],
                "price": int(r["price"]),
                "volume": int(r.get("volume") or 0),
            }
            for r in records
            if isinstance(r, dict) and r.get("price", 0) > 0 and r["timestamp"] >= cutoff_ms
        ],
        key=lambda x: x["timestamp_ms"],
    )
