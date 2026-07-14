"""Outbound Superteam Earn API client."""

import httpx

from app.config import settings


async def list_live_listings(take: int = 20, listing_type: str | None = None) -> list[dict]:
    if not settings.superteam_earn_api_key:
        return []
    params: dict[str, str] = {"take": str(take)}
    if listing_type:
        params["type"] = listing_type
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.get(
            f"{settings.superteam_earn_base_url.rstrip('/')}/api/agents/listings/live",
            params=params,
            headers={"Authorization": f"Bearer {settings.superteam_earn_api_key}"},
        )
        if res.status_code >= 400:
            return []
        data = res.json()
        return data if isinstance(data, list) else []


async def notify_callback(callback_url: str, payload: dict) -> None:
    if not callback_url:
        return
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            await client.post(callback_url, json=payload)
    except Exception:
        pass
