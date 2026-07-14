"""Proxy Superfan Points awards to World Cup OS API."""

import httpx

from datetime import datetime, timezone

from app.config import settings


async def record_share(wallet: str, channel: str, content_type: str, content_id: str, url: str = "") -> dict:
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return await _award(
        wallet,
        source="share",
        app="agentx",
        points=25,
        channel=channel,
        content_type=content_type,
        content_id=content_id,
        idempotency_key=f"share:{wallet}:{content_type}:{content_id}:{channel}:{day}",
        metadata={"url": url} if url else {},
    )


async def award_agent_deploy(wallet: str) -> dict:
    return await _award(
        wallet,
        source="agent_deploy",
        app="agentx",
        points=100,
        content_type="agent",
        content_id="deploy",
        idempotency_key=f"agent_deploy:{wallet}",
    )


async def award_agent_win(wallet: str, decision_id: str, agent_name: str) -> dict:
    return await _award(
        wallet,
        source="agent_win",
        app="agentx",
        points=50,
        content_type="agent_decision",
        content_id=decision_id,
        idempotency_key=f"agent_win:{decision_id}",
        metadata={"agentName": agent_name},
    )


async def _award(
    wallet: str,
    *,
    source: str,
    app: str,
    points: int,
    channel: str | None = None,
    content_type: str | None = None,
    content_id: str | None = None,
    idempotency_key: str,
    metadata: dict | None = None,
) -> dict:
    if not settings.wmos_api_url or not settings.worker_secret:
        return {"awarded": 0, "total": 0, "skipped": True}
    payload = {
        "walletPubkey": wallet,
        "source": source,
        "app": app,
        "points": points,
        "channel": channel,
        "contentType": content_type,
        "contentId": content_id,
        "idempotencyKey": idempotency_key,
        "metadata": metadata or {},
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.post(
            f"{settings.wmos_api_url.rstrip('/')}/api/superfan/internal/award",
            json=payload,
            headers={"Authorization": f"Bearer {settings.worker_secret}"},
        )
        if res.status_code >= 400:
            return {"awarded": 0, "total": 0, "error": res.text}
        return res.json()
