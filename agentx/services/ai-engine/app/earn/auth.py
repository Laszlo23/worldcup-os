"""Inbound auth for external Superteam Earn / agent API callers."""

import hmac

from fastapi import Request

from app.config import settings


def _safe_compare(provided: str, expected: str) -> bool:
    if not expected:
        return False
    return hmac.compare_digest(provided.encode(), expected.encode())


def verify_agent_api_key(request: Request) -> bool:
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        return False
    token = auth[7:].strip()
    if _safe_compare(token, settings.agentx_api_key):
        return True
    if _safe_compare(token, settings.worker_secret):
        return True
    return False
