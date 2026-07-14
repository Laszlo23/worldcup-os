"""Market betting gate — mirrors src/server/services/live-markets.ts."""
from __future__ import annotations

from datetime import datetime, timezone


def _now_ms() -> int:
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def is_live_market_type(market_type: str) -> bool:
    return market_type.startswith("live_")


def is_market_bettable(
    market_type: str,
    match_status: str,
    closed: bool,
    closes_at,
    kickoff_at,
) -> bool:
    if closed:
        return False
    status = (match_status or "").lower()
    if is_live_market_type(market_type):
        if status not in ("live", "halftime"):
            return False
        if closes_at is not None:
            ts = closes_at.timestamp() * 1000 if hasattr(closes_at, "timestamp") else _now_ms()
            if ts <= _now_ms():
                return False
        return True
    if status != "scheduled":
        return False
    if kickoff_at is not None:
        kickoff_ms = kickoff_at.timestamp() * 1000 if hasattr(kickoff_at, "timestamp") else _now_ms()
        if _now_ms() >= kickoff_ms - 5 * 60_000:
            return False
    return True
