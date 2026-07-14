import json
import logging
import time
from datetime import datetime, timezone
from typing import Any

from app import repository as db
from app.config import settings
from app.ingestion.demo_feed import DEMO_MATCHES, simulate_demo_tick
from app.ingestion.txline_adapters import fixture_to_match_row, normalize_score_payload
from app.ingestion.txline_client import TxLineClient

logger = logging.getLogger(__name__)


def _calc_win_probability(odds: dict, momentum: float) -> dict:
    home = float(odds.get("home") or 2.5)
    draw = float(odds.get("draw") or 3.2)
    away = float(odds.get("away") or 2.8)
    inv = [1 / home, 1 / draw, 1 / away]
    total = sum(inv) or 1
    base = {
        "home": round(inv[0] / total * 100, 1),
        "draw": round(inv[1] / total * 100, 1),
        "away": round(inv[2] / total * 100, 1),
    }
    shift = (momentum - 50) / 100
    base["home"] = min(95, max(5, round(base["home"] + shift * 15, 1)))
    base["away"] = min(95, max(5, round(base["away"] - shift * 15, 1)))
    base["draw"] = round(100 - base["home"] - base["away"], 1)
    return base


def _coerce_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Ensure TxLINE PascalCase score rows become upsert-friendly dicts."""
    normalized = normalize_score_payload(payload)
    if normalized:
        return {**payload, **normalized}
    return payload


async def upsert_from_payload(payload: dict, event_type: str = "score") -> dict | None:
    payload = _coerce_payload(payload)
    fixture_id = payload.get("fixtureId") or payload.get("fixture_id")
    external_id = payload.get("external_id") or (f"fx-{fixture_id}" if fixture_id else None)
    if not external_id or external_id == "unknown" or "None" in external_id:
        return None
    if external_id.startswith("demo-") and not settings.demo_mode:
        return None

    existing = await db.get_match_by_external_id(external_id)

    home_score = int(payload.get("homeScore") or payload.get("scoreHome") or (existing or {}).get("score_home", 0))
    away_score = int(payload.get("awayScore") or payload.get("scoreAway") or (existing or {}).get("score_away", 0))
    minute = int(payload.get("minute") or payload.get("matchMinute") or (existing or {}).get("minute", 0))

    odds = existing.get("odds", {}) if existing else {}
    if isinstance(odds, str):
        odds = json.loads(odds)
    if payload.get("home") or payload.get("draw") or payload.get("away"):
        odds = {
            "home": float(payload.get("home") or odds.get("home", 2.0)),
            "draw": float(payload.get("draw") or odds.get("draw", 3.2)),
            "away": float(payload.get("away") or odds.get("away", 2.5)),
            "updatedAt": int(time.time() * 1000),
        }

    history = existing.get("odds_history", []) if existing else []
    if isinstance(history, str):
        history = json.loads(history)
    if event_type == "odds" and odds:
        history = (history or [])[-29:] + [
            {"t": int(time.time() * 1000), **{k: odds[k] for k in ("home", "draw", "away") if k in odds}}
        ]

    stats = existing.get("stats", {}) if existing else {}
    if isinstance(stats, str):
        stats = json.loads(stats)
    if payload.get("stats"):
        stats = {**stats, **payload["stats"]}

    momentum = float(existing.get("momentum", 50) if existing else 50)
    if event_type == "score" and existing and (home_score != existing.get("score_home", 0) or away_score != existing.get("score_away", 0)):
        momentum = min(95, momentum + 8)
    elif event_type == "odds" and history and len(history) >= 2:
        prev, curr = history[-2], history[-1]
        if curr.get("home", 0) < prev.get("home", 0):
            momentum = min(95, momentum + 5)
        elif curr.get("home", 0) > prev.get("home", 0):
            momentum = max(5, momentum - 5)

    home_team = existing.get("home_team") if existing else payload.get("home_team")
    away_team = existing.get("away_team") if existing else payload.get("away_team")
    if isinstance(home_team, str):
        home_team = json.loads(home_team)
    if isinstance(away_team, str):
        away_team = json.loads(away_team)
    if not home_team:
        home_team = {"name": "Home", "flag": "⚽"}
    if not away_team:
        away_team = {"name": "Away", "flag": "⚽"}

    status = str(payload.get("status") or (existing or {}).get("status", "scheduled")).lower()
    raw_state = str(
        payload.get("gameState")
        or payload.get("GameState")
        or payload.get("game_state")
        or payload.get("matchStatus")
        or payload.get("MatchStatus")
        or ""
    ).lower()
    if raw_state in ("halftime", "half_time", "half-time", "ht"):
        status = "halftime"
    elif status in ("inprogress", "in_progress", "inplay", "in_play"):
        status = "live"
    if minute >= 90 and status == "live":
        status = "finished"

    match_data = {
        "external_id": external_id,
        "txline_fixture_id": int(fixture_id) if fixture_id else (existing or {}).get("txline_fixture_id"),
        "home_team": home_team,
        "away_team": away_team,
        "score_home": home_score,
        "score_away": away_score,
        "status": status,
        "minute": minute,
        "stadium": payload.get("stadium") or (existing or {}).get("stadium"),
        "stage": payload.get("stage") or (existing or {}).get("stage"),
        "kickoff_at": payload.get("kickoff_at") or (existing or {}).get("kickoff_at"),
        "stats": stats,
        "odds": odds,
        "odds_history": history,
        "momentum": momentum,
        "win_probability": _calc_win_probability(odds, momentum),
        "raw_payload": payload,
    }
    row = await db.upsert_match(match_data)

    try:
        from app.services.live_markets import sync_live_markets_for_match
        await sync_live_markets_for_match(row["id"], row["external_id"], str(row.get("status", status)))
    except Exception as exc:
        logger.warning("[upsert] live markets sync: %s", exc)

    if event_type == "score" and existing and (home_score != existing.get("score_home") or away_score != existing.get("score_away")):
        home_name = home_team.get("name", "Home") if isinstance(home_team, dict) else "Home"
        away_name = away_team.get("name", "Away") if isinstance(away_team, dict) else "Away"
        scoring_team = home_name if home_score > existing.get("score_home", 0) else away_name
        await db.insert_match_event(
            {
                "match_id": row["id"],
                "event_type": "goal",
                "minute": minute,
                "team": scoring_team,
                "detail": f"Goal {scoring_team}",
                "txline_seq": payload.get("seq"),
                "payload": payload,
            }
        )
    return row


async def sync_fixtures() -> list[dict]:
    if settings.demo_mode:
        results = []
        for m in DEMO_MATCHES:
            results.append(await db.upsert_match(m))
        return results

    try:
        client = TxLineClient()
        fixtures = await client.get_fixtures_snapshot()
        if not fixtures:
            logger.warning("[sync_fixtures] TxLINE returned zero fixtures")
            return []
        results = []
        for f in fixtures:
            if not isinstance(f, dict):
                continue
            normalized = fixture_to_match_row(f)
            row = await db.upsert_match(normalized)
            results.append(row)
        logger.info("[sync_fixtures] synced %s fixtures from TxLINE", len(results))
        return results
    except Exception as e:
        logger.exception("[sync_fixtures] failed: %s", e)
        return []


async def purge_demo_data() -> int:
    if settings.demo_mode:
        return 0
    return await db.purge_demo_matches()


async def get_demo_tick() -> dict | None:
    """Return raw demo payload only — caller upserts once."""
    return simulate_demo_tick()
