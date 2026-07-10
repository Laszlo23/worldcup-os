import json
import time
from datetime import datetime, timezone
from typing import Any

from app import repository as db
from app.ingestion.demo_feed import DEMO_MATCHES, simulate_demo_tick
from app.ingestion.txline_client import TxLineClient
from app.config import settings


def _team(name: str, flag: str = "") -> dict:
    return {"name": name, "flag": flag}


def _normalize_fixture(f: dict) -> dict:
    fixture_id = f.get("fixtureId") or f.get("id") or f.get("fixture_id")
    home = f.get("homeTeam") or f.get("home") or {}
    away = f.get("awayTeam") or f.get("away") or {}
    home_name = home.get("name") if isinstance(home, dict) else str(home)
    away_name = away.get("name") if isinstance(away, dict) else str(away)
    return {
        "external_id": f"txline-{fixture_id}",
        "txline_fixture_id": int(fixture_id) if fixture_id else None,
        "home_team": _team(home_name, home.get("flag", "") if isinstance(home, dict) else ""),
        "away_team": _team(away_name, away.get("flag", "") if isinstance(away, dict) else ""),
        "score_home": int(f.get("scoreHome") or f.get("homeScore") or 0),
        "score_away": int(f.get("scoreAway") or f.get("awayScore") or 0),
        "status": str(f.get("status") or "scheduled").lower(),
        "minute": int(f.get("minute") or f.get("matchMinute") or 0),
        "stadium": f.get("stadium") or f.get("venue"),
        "stage": f.get("stage") or f.get("competition"),
        "kickoff_at": f.get("kickoffAt") or f.get("startTime"),
        "stats": f.get("stats") or {},
        "odds": f.get("odds") or {},
        "odds_history": [],
        "momentum": 50.0,
        "win_probability": {},
        "raw_payload": f,
    }


def _calc_win_probability(odds: dict, momentum: float) -> dict:
    home = float(odds.get("home") or 2.5)
    draw = float(odds.get("draw") or 3.2)
    away = float(odds.get("away") or 2.8)
    inv = [1 / home, 1 / draw, 1 / away]
    total = sum(inv) or 1
    base = {"home": round(inv[0] / total * 100, 1), "draw": round(inv[1] / total * 100, 1), "away": round(inv[2] / total * 100, 1)}
    shift = (momentum - 50) / 100
    base["home"] = min(95, max(5, round(base["home"] + shift * 15, 1)))
    base["away"] = min(95, max(5, round(base["away"] - shift * 15, 1)))
    base["draw"] = round(100 - base["home"] - base["away"], 1)
    return base


async def upsert_from_payload(payload: dict, event_type: str = "score") -> dict | None:
    fixture_id = payload.get("fixtureId") or payload.get("fixture_id")
    external_id = payload.get("external_id") or (f"txline-{fixture_id}" if fixture_id else "unknown")
    existing = await db.get_match_by_external_id(external_id)

    if existing is None and external_id.startswith("demo-"):
        seed = next((m for m in DEMO_MATCHES if m["external_id"] == external_id), None)
        if seed:
            existing = await db.upsert_match(seed)

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
        history = (history or [])[-29:] + [{"t": int(time.time() * 1000), **{k: odds[k] for k in ("home", "draw", "away") if k in odds}}]

    stats = existing.get("stats", {}) if existing else {}
    if isinstance(stats, str):
        stats = json.loads(stats)
    if payload.get("stats"):
        stats = {**stats, **payload["stats"]}

    momentum = float(existing.get("momentum", 50) if existing else 50)
    if event_type == "score" and home_score != (existing or {}).get("score_home", 0):
        momentum = min(95, momentum + 8)
    elif event_type == "odds" and history and len(history) >= 2:
        prev, curr = history[-2], history[-1]
        if curr.get("home", 0) < prev.get("home", 0):
            momentum = min(95, momentum + 5)
        elif curr.get("home", 0) > prev.get("home", 0):
            momentum = max(5, momentum - 5)

    home_team = existing.get("home_team") if existing else payload.get("home_team", _team("Home"))
    away_team = existing.get("away_team") if existing else payload.get("away_team", _team("Away"))
    if isinstance(home_team, str):
        home_team = json.loads(home_team)
    if isinstance(away_team, str):
        away_team = json.loads(away_team)

    status = str(payload.get("status") or (existing or {}).get("status", "live")).lower()
    if minute >= 90:
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

    if event_type == "score" and existing and (home_score != existing.get("score_home") or away_score != existing.get("score_away")):
        scoring_team = home_team["name"] if home_score > existing.get("score_home", 0) else away_team["name"]
        await db.insert_match_event({
            "match_id": row["id"],
            "event_type": "goal",
            "minute": minute,
            "team": scoring_team,
            "detail": f"Goal {scoring_team}",
            "txline_seq": payload.get("seq"),
            "payload": payload,
        })
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
        results = []
        for f in fixtures:
            normalized = _normalize_fixture(f)
            row = await db.upsert_match(normalized)
            results.append(row)
        return results
    except Exception:
        results = []
        for m in DEMO_MATCHES:
            results.append(await db.upsert_match(m))
        return results


async def get_demo_tick() -> dict | None:
    """Return raw demo payload only — caller upserts once."""
    return simulate_demo_tick()
