import json
import re
from typing import AsyncGenerator

import httpx

from app.config import settings


def parse_sse_block(block: str) -> dict | None:
    message: dict = {"data": ""}
    for raw_line in block.split("\n"):
        if not raw_line or raw_line.startswith(":"):
            continue
        sep = raw_line.find(":")
        field = raw_line[:sep] if sep != -1 else raw_line
        value = raw_line[sep + 1 :].lstrip() if sep != -1 else ""
        if field == "data":
            message["data"] += value + "\n"
        elif field == "event":
            message["event"] = value
        elif field == "id":
            message["id"] = value
    message["data"] = message["data"].rstrip("\n")
    return message if message.get("data") or message.get("event") else None


async def read_sse(url: str, headers: dict) -> AsyncGenerator[dict, None]:
    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream("GET", url, headers=headers) as response:
            response.raise_for_status()
            buffer = ""
            async for chunk in response.aiter_text():
                buffer += chunk
                while True:
                    match = re.search(r"\r?\n\r?\n", buffer)
                    if not match:
                        break
                    block = buffer[: match.start()]
                    buffer = buffer[match.end() :]
                    msg = parse_sse_block(block)
                    if msg:
                        yield msg


class TxLineClient:
    def __init__(self) -> None:
        self.origin = settings.txline_api_origin.rstrip("/")
        self.token = settings.txline_api_token
        self.guest_jwt = settings.txline_guest_jwt

    def _headers(self, *, sse: bool = False) -> dict | None:
        """TxLINE SL12 requires Bearer guest JWT plus X-Api-Token when both are configured."""
        if not self.guest_jwt and not self.token:
            return None
        h: dict[str, str] = {
            "Accept": "text/event-stream" if sse else "application/json",
        }
        if self.guest_jwt:
            h["Authorization"] = f"Bearer {self.guest_jwt}"
        elif self.token:
            h["Authorization"] = f"Bearer {self.token}"
        if self.token:
            h["X-Api-Token"] = self.token
        if sse:
            h["Cache-Control"] = "no-cache"
        return h

    async def get_fixtures_snapshot(self) -> list[dict]:
        headers = self._headers()
        if not headers:
            return []
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(f"{self.origin}/api/fixtures/snapshot", headers=headers)
            r.raise_for_status()
            data = r.json()
            if isinstance(data, list):
                return data
            return data.get("fixtures", data.get("data", []))

    async def get_score_snapshot(self, fixture_id: int) -> dict:
        headers = self._headers()
        if not headers:
            return {}
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(
                f"{self.origin}/api/scores/snapshot/{fixture_id}",
                headers=headers,
            )
            r.raise_for_status()
            return r.json()

    async def stream_scores(self) -> AsyncGenerator[dict, None]:
        headers = self._headers(sse=True)
        if not headers:
            return
        url = f"{self.origin}/api/scores/stream"
        async for msg in read_sse(url, headers):
            try:
                yield json.loads(msg["data"])
            except json.JSONDecodeError:
                continue

    async def stream_odds(self) -> AsyncGenerator[dict, None]:
        headers = self._headers(sse=True)
        if not headers:
            return
        url = f"{self.origin}/api/odds/stream"
        async for msg in read_sse(url, headers):
            try:
                yield json.loads(msg["data"])
            except json.JSONDecodeError:
                continue
