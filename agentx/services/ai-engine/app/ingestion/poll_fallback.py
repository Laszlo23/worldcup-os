"""REST polling fallback when TxLINE SSE is unavailable."""

import asyncio
from typing import Callable, Awaitable

from app.config import settings
from app.ingestion.state import ingestion_state, touch_event
from app.ingestion.txline_client import TxLineClient
from app.ingestion.worker import sync_fixtures, upsert_from_payload


async def run_poll_fallback(
    broadcast: Callable[[str, dict], Awaitable[None]] | None,
    serialize_match,
) -> None:
    """Poll fixtures + score snapshots when SSE streams fail."""
    if settings.demo_mode:
        return
    client = TxLineClient()
    while True:
        try:
            if ingestion_state["scores_connected"] or ingestion_state["odds_connected"]:
                await asyncio.sleep(30)
                continue
            await sync_fixtures()
            fixtures = await client.get_fixtures_snapshot()
            for f in fixtures[:20]:
                fixture_id = f.get("fixtureId") or f.get("id")
                if not fixture_id:
                    continue
                status = str(f.get("status") or "").lower()
                if status not in ("live", "halftime", "inprogress", "in_progress"):
                    continue
                snap = await client.get_score_snapshot(int(fixture_id))
                if isinstance(snap, list) and snap:
                    payload = snap[-1] if isinstance(snap[-1], dict) else snap[0]
                elif isinstance(snap, dict):
                    payload = snap
                else:
                    continue
                if isinstance(payload, dict):
                    payload = {**payload, "fixtureId": fixture_id}
                    match = await upsert_from_payload(payload, "score")
                    if match:
                        touch_event()
                        if broadcast:
                            try:
                                await broadcast("matches", {"type": "match_update", "match": serialize_match(match)})
                            except Exception as broadcast_err:
                                ingestion_state["last_error"] = str(broadcast_err)
            ingestion_state["last_error"] = None
        except Exception as e:
            ingestion_state["last_error"] = str(e)
        await asyncio.sleep(30)
