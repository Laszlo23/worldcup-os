"""Database access with demo store fallback."""

import json
from typing import Any

from app.config import settings

_db_available: bool | None = None


async def check_db() -> bool:
    global _db_available
    if _db_available is not None:
        return _db_available
    try:
        from app import db as pgdb
        pool = await pgdb.get_pool()
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        _db_available = True
    except Exception:
        _db_available = False
    return _db_available


async def list_matches(status: str | None = None) -> list[dict]:
    if await check_db():
        from app import db as pgdb
        return await pgdb.list_matches(status)
    from app import demo_store
    return demo_store.list_matches(status)


async def get_match_by_id(match_id: str) -> dict | None:
    if await check_db():
        from app import db as pgdb
        return await pgdb.get_match_by_id(match_id)
    from app import demo_store
    return demo_store.get_match(match_id)


async def list_signals(limit: int = 50, match_id: str | None = None) -> list[dict]:
    if await check_db():
        from app import db as pgdb
        return await pgdb.list_signals(limit=limit, match_id=match_id)
    from app import demo_store
    return demo_store.list_signals(limit, match_id)


async def get_signal(signal_id: str) -> dict | None:
    if await check_db():
        from app import db as pgdb
        return await pgdb.get_signal(signal_id)
    from app import demo_store
    return demo_store.get_signal(signal_id)


async def list_predictions(limit: int = 50) -> list[dict]:
    if await check_db():
        from app import db as pgdb
        return await pgdb.list_predictions(limit=limit)
    from app import demo_store
    return demo_store.list_predictions(limit)


async def get_prediction(prediction_id: str) -> dict | None:
    if await check_db():
        from app import db as pgdb
        return await pgdb.get_prediction(prediction_id)
    from app import demo_store
    return demo_store.get_prediction(prediction_id)


async def ensure_agents() -> list[dict]:
    if await check_db():
        from app import db as pgdb
        return await pgdb.ensure_agents()
    from app import demo_store
    return demo_store.get_agents()


async def get_latest_portfolio() -> dict | None:
    if await check_db():
        from app import db as pgdb
        return await pgdb.get_latest_portfolio()
    from app import demo_store
    return demo_store.get_performance()


async def create_signal(data: dict) -> dict:
    if await check_db():
        from app import db as pgdb
        return await pgdb.create_signal(data)
    from app import demo_store
    demo_store.init_demo_store()
    row = {**data, "id": "demo-sig-new", "created_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc)}
    demo_store._store["signals"].insert(0, row)
    return row


async def get_match_by_external_id(external_id: str) -> dict | None:
    if await check_db():
        from app import db as pgdb
        return await pgdb.get_match_by_external_id(external_id)
    from app import demo_store
    return next((m for m in demo_store.list_matches() if m.get("external_id") == external_id), None)


async def upsert_match(data: dict) -> dict:
    if await check_db():
        from app import db as pgdb
        return await pgdb.upsert_match(data)
    from app import demo_store
    demo_store.init_demo_store()
    return demo_store.list_matches()[0]


async def create_prediction(data: dict) -> dict:
    if await check_db():
        from app import db as pgdb
        return await pgdb.create_prediction(data)
    from app import demo_store
    row = {**data, "id": "demo-pred-new"}
    demo_store._store["predictions"].insert(0, row)
    return row


async def create_agent_decision(data: dict) -> dict:
    if await check_db():
        from app import db as pgdb
        return await pgdb.create_agent_decision(data)
    return {**data, "id": "demo-dec"}


async def update_agent_stats(agent_id: str, **kwargs: Any) -> None:
    if await check_db():
        from app import db as pgdb
        await pgdb.update_agent_stats(agent_id, **kwargs)


async def create_portfolio_snapshot(data: dict) -> dict:
    if await check_db():
        from app import db as pgdb
        return await pgdb.create_portfolio_snapshot(data)
    return data


async def create_certificate(data: dict) -> dict:
    if await check_db():
        from app import db as pgdb
        return await pgdb.create_certificate(data)
    return {**data, "id": "demo-cert", "tx_hash": "5xYdemo...9kLm", "explorer_url": "https://explorer.solana.com/tx/demo?cluster=devnet", "status": "anchored"}


async def update_certificate(cert_id: str, tx_hash: str, explorer_url: str) -> None:
    if await check_db():
        from app import db as pgdb
        await pgdb.update_certificate(cert_id, tx_hash, explorer_url)


async def save_chat_message(session_id: str, role: str, content: str, context: dict | None = None) -> None:
    if await check_db():
        from app import db as pgdb
        await pgdb.save_chat_message(session_id, role, content, context)


async def update_agent_treasury(name: str, pubkey: str, balance: float) -> None:
    if await check_db():
        from app import db as pgdb
        await pgdb.update_agent_treasury(name, pubkey, balance)


async def list_agent_decisions(agent_id: str, limit: int = 20) -> list[dict]:
    if await check_db():
        from app import db as pgdb
        return await pgdb.list_agent_decisions(agent_id, limit)
    return []


async def insert_match_event(data: dict) -> dict:
    if await check_db():
        from app import db as pgdb
        return await pgdb.insert_match_event(data)
    return data


async def close_pool() -> None:
    try:
        from app import db as pgdb
        await pgdb.close_pool()
    except Exception:
        pass
