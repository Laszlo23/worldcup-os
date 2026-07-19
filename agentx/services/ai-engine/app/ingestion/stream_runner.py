import asyncio
from typing import Callable, Awaitable

from app.config import settings
from app.ingestion.state import ingestion_state, touch_event
from app.ingestion.txline_client import TxLineClient
from app.ingestion.worker import upsert_from_payload


async def run_scores_stream(broadcast: Callable[[str, dict], Awaitable[None]] | None, serialize_match) -> None:
    if settings.demo_mode:
        return
    client = TxLineClient()
    while True:
        try:
            ingestion_state["scores_connected"] = False
            async for payload in client.stream_scores():
                ingestion_state["scores_connected"] = True
                if not isinstance(payload, dict):
                    continue
                match = await upsert_from_payload(payload, "score")
                if match:
                    touch_event()
                    if broadcast:
                        try:
                            await broadcast("matches", {"type": "match_update", "match": serialize_match(match)})
                        except Exception as broadcast_err:
                            ingestion_state["last_error"] = str(broadcast_err)
        except Exception as e:
            ingestion_state["scores_connected"] = False
            ingestion_state["last_error"] = str(e)
            await asyncio.sleep(5)


async def run_odds_stream(broadcast: Callable[[str, dict], Awaitable[None]] | None, serialize_match) -> None:
    if settings.demo_mode:
        return
    client = TxLineClient()
    while True:
        try:
            ingestion_state["odds_connected"] = False
            async for payload in client.stream_odds():
                ingestion_state["odds_connected"] = True
                if not isinstance(payload, dict):
                    continue
                match = await upsert_from_payload(payload, "odds")
                if match:
                    touch_event()
                    if broadcast:
                        try:
                            await broadcast("matches", {"type": "odds_update", "match": serialize_match(match)})
                        except Exception as broadcast_err:
                            ingestion_state["last_error"] = str(broadcast_err)
        except Exception as e:
            ingestion_state["odds_connected"] = False
            ingestion_state["last_error"] = str(e)
            await asyncio.sleep(5)
