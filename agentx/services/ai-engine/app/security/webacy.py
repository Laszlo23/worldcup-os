import json
import logging
import time
from dataclasses import dataclass
from typing import Literal

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

WEBACY_BASE = "https://api.webacy.com"
CACHE_TTL_SEC = 600
HIGH_RISK_LOG_THRESHOLD = 50

ScreenContext = Literal["login", "deposit", "withdraw", "faucet", "internal"]

_cache: dict[str, tuple[float, "ScreenResult"]] = {}


@dataclass
class ScreenResult:
    allowed: bool
    reason: str = ""
    sanctioned: bool = False
    risk_score: float | None = None
    skipped: bool = False


def _api_key() -> str:
    return settings.resolved_webacy_api_key


def _enabled() -> bool:
    return settings.has_webacy()


def has_webacy() -> bool:
    return _enabled()


def _log_screen(pubkey: str, context: ScreenContext, payload: dict) -> None:
    logger.info(
        json.dumps(
            {
                "event": "webacy_screen",
                "pubkey": pubkey,
                "context": context,
                **payload,
            }
        )
    )


async def screen_wallet(pubkey: str, context: ScreenContext) -> ScreenResult:
    trimmed = pubkey.strip()
    now = time.time()
    cached = _cache.get(trimmed)
    if cached and cached[0] > now:
        return cached[1]

    if not _enabled():
        result = ScreenResult(allowed=True, skipped=True)
        _log_screen(trimmed, context, {"action": "allow", "skipped": True, "reason": "webacy_unavailable"})
        return result

    headers = {"x-api-key": _api_key()}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            sanctions_res = await client.get(
                f"{WEBACY_BASE}/addresses/sanctioned/{trimmed}",
                params={"chain": "sol"},
                headers=headers,
            )
            sanctions_res.raise_for_status()
            sanctions = sanctions_res.json()
            if sanctions.get("is_sanctioned"):
                result = ScreenResult(
                    allowed=False,
                    reason="Wallet not permitted — sanctions screening failed",
                    sanctioned=True,
                )
                _cache[trimmed] = (now + CACHE_TTL_SEC, result)
                _log_screen(trimmed, context, {"action": "block", "sanctioned": True})
                return result

            risk_score: float | None = None
            try:
                risk_res = await client.get(
                    f"{WEBACY_BASE}/addresses/{trimmed}",
                    params={"chain": "sol"},
                    headers=headers,
                )
                risk_res.raise_for_status()
                risk = risk_res.json()
                raw_score = risk.get("overallRisk")
                if isinstance(raw_score, (int, float)):
                    risk_score = float(raw_score)
                    if risk_score > HIGH_RISK_LOG_THRESHOLD:
                        _log_screen(
                            trimmed,
                            context,
                            {
                                "action": "allow",
                                "sanctioned": False,
                                "overallRisk": risk_score,
                                "warning": "high_risk_wallet",
                            },
                        )
            except Exception as risk_err:
                _log_screen(
                    trimmed,
                    context,
                    {
                        "action": "allow",
                        "sanctioned": False,
                        "skipped": True,
                        "reason": "risk_analysis_failed",
                        "detail": str(risk_err),
                    },
                )

            result = ScreenResult(allowed=True, risk_score=risk_score)
            _cache[trimmed] = (now + CACHE_TTL_SEC, result)
            _log_screen(
                trimmed,
                context,
                {"action": "allow", "sanctioned": False, "overallRisk": risk_score},
            )
            return result
    except Exception as err:
        result = ScreenResult(allowed=True, skipped=True)
        _log_screen(
            trimmed,
            context,
            {"action": "allow", "skipped": True, "reason": "webacy_error", "detail": str(err)},
        )
        return result
