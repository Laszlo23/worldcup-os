"""Live in-play market rotator (shared Postgres with World Cup OS)."""
from __future__ import annotations

import time
import uuid

from app import db as pgdb

LIVE_WINDOW_SEC = 7 * 60
MAX_OPEN = 3

TEMPLATES = [
    ("live_goal_7min", "Will there be a goal in the next 7 minutes?", "goal"),
    ("live_penalty_7min", "Will there be a penalty in the next 7 minutes?", "penalty"),
    ("live_card_7min", "Will there be a card in the next 7 minutes?", "card"),
]


async def _count_open(match_id: str) -> int:
    row = await pgdb.fetch_one(
        """
        select count(*)::int as count
        from markets
        where match_id = $1
          and type like 'live_%'
          and closed = false
          and (closes_at is null or closes_at > now())
        """,
        match_id,
    )
    return int(row["count"]) if row else 0


async def _create_market(match_id: str, match_external_id: str, slot: int) -> None:
    market_type, title, resolution_kind = TEMPLATES[slot % len(TEMPLATES)]
    now_ms = int(time.time() * 1000)
    external_id = f"{market_type}_{match_external_id}_{now_ms}"
    row = await pgdb.fetch_one(
        """
        insert into markets (
          external_id, match_id, type, title, closes_at, closed, total_liquidity,
          window_opens_at, resolution_kind
        ) values ($1, $2, $3, $4, now() + interval '7 minutes', false, 0, now(), $5)
        returning id
        """,
        external_id,
        match_id,
        market_type,
        title,
        resolution_kind,
    )
    if not row:
        return
    market_id = row["id"]
    for label, price in (("Yes", 1.85), ("No", 1.85)):
        await pgdb.execute(
            """
            insert into market_options (external_id, market_id, label, price, liquidity, participants)
            values ($1, $2, $3, $4, 0, 0)
            on conflict (market_id, external_id) do nothing
            """,
            label.lower(),
            market_id,
            label,
            price,
        )


async def sync_live_markets_for_match(match_id: str, match_external_id: str, status: str) -> int:
    normalized = (status or "").lower()
    if normalized not in ("live", "halftime"):
        return 0
    created = 0
    open_count = await _count_open(match_id)
    slot_row = await pgdb.fetch_one(
        "select count(*)::int as count from markets where match_id = $1 and type like 'live_%'",
        match_id,
    )
    slot = int(slot_row["count"]) if slot_row else 0
    while open_count < MAX_OPEN:
        await _create_market(match_id, match_external_id, slot)
        created += 1
        open_count += 1
        slot += 1
    return created
