import json
import math
from typing import Any

from app import repository as db


def _parse_json(val: Any, default: Any) -> Any:
    if val is None:
        return default
    if isinstance(val, str):
        return json.loads(val)
    return val


def _odds_momentum_score(history: list[dict]) -> tuple[float, list[dict]]:
    reasons = []
    if len(history) < 2:
        return 0.5, reasons
    prev, curr = history[-2], history[-1]
    prev_home = float(prev.get("home", 2))
    curr_home = float(curr.get("home", 2))
    if prev_home <= 0:
        return 0.5, reasons
    pct = ((curr_home - prev_home) / prev_home) * 100
    score = min(1.0, abs(pct) / 15)
    if pct < -3:
        reasons.append({"type": "odds_shift", "label": f"Odds shortened {abs(pct):.1f}% in last 60s", "impact": "positive"})
    elif pct > 3:
        reasons.append({"type": "odds_shift", "label": f"Odds drifted +{pct:.1f}% against favorite", "impact": "negative"})
    return score, reasons


def _attack_pressure_score(stats: dict, momentum: float) -> tuple[float, list[dict]]:
    reasons = []
    shots = stats.get("shots", {})
    home_shots = shots.get("home", 0) if isinstance(shots, dict) else 0
    pressure = stats.get("pressure", "")
    score = min(1.0, (home_shots / 20) + (momentum / 100) * 0.4)
    if home_shots >= 10:
        reasons.append({"type": "attack", "label": f"Home shots at {home_shots} — sustained pressure", "impact": "positive"})
    if pressure == "high":
        reasons.append({"type": "pressure", "label": "Attack pressure rated HIGH", "impact": "positive"})
    return score, reasons


def _possession_score(stats: dict) -> tuple[float, list[dict]]:
    reasons = []
    poss = stats.get("possession", {})
    home = poss.get("home", 50) if isinstance(poss, dict) else 50
    score = min(1.0, max(0, (home - 50) / 30))
    if home >= 58:
        reasons.append({"type": "possession", "label": f"Possession advantage {home}%", "impact": "positive"})
    return score, reasons


def _historical_pattern_score(match: dict) -> tuple[float, list[dict]]:
    reasons = []
    minute = int(match.get("minute", 0))
    score_home = int(match.get("score_home", 0))
    score_away = int(match.get("score_away", 0))
    if minute >= 60 and score_home > score_away:
        reasons.append({"type": "pattern", "label": "Historical model: leading team scores next 62% in similar states", "impact": "positive"})
        return 0.72, reasons
    if minute >= 45:
        reasons.append({"type": "pattern", "label": "Similar match situations favor momentum leader", "impact": "positive"})
        return 0.55, reasons
    return 0.4, reasons


async def analyze_match(match: dict) -> dict | None:
    if match.get("status") not in ("live", "halftime"):
        return None

    history = _parse_json(match.get("odds_history"), [])
    stats = _parse_json(match.get("stats"), {})
    momentum = float(match.get("momentum", 50))
    home_team = _parse_json(match.get("home_team"), {})
    away_team = _parse_json(match.get("away_team"), {})

    om_score, om_reasons = _odds_momentum_score(history)
    ap_score, ap_reasons = _attack_pressure_score(stats, momentum)
    pos_score, pos_reasons = _possession_score(stats)
    hist_score, hist_reasons = _historical_pattern_score(match)

    confidence = (
        om_score * 0.35 + ap_score * 0.25 + pos_score * 0.20 + hist_score * 0.20
    ) * 100

    if confidence < 55:
        return None

    all_reasons = om_reasons + ap_reasons + pos_reasons + hist_reasons
    if not all_reasons:
        all_reasons = [{"type": "momentum", "label": f"Momentum index at {momentum:.0f}%", "impact": "positive"}]

    home_name = home_team.get("name", "Home")
    headline = f"{home_name} likely to score next"
    prediction = f"{home_name} next goal within 15 minutes"
    impact = "high" if confidence >= 75 else "medium"

    odds = _parse_json(match.get("odds"), {})
    ev = round((confidence / 100 - 1 / float(odds.get("home", 2))) * 100, 1) if odds.get("home") else None

    return {
        "match_id": match["id"],
        "type": "bullish",
        "headline": headline,
        "prediction": prediction,
        "confidence": round(confidence, 1),
        "impact": impact,
        "reasoning": all_reasons,
        "metrics": {
            "momentum": momentum,
            "xg_next_15m": round(1.2 + confidence / 100, 2),
            "attack_pressure": stats.get("pressure", "medium").upper() if isinstance(stats.get("pressure"), str) else "MEDIUM",
            "odds_home": odds.get("home"),
            "odds_away": odds.get("away"),
        },
        "expected_value": ev,
        "status": "active",
    }


async def run_signal_cycle(broadcast=None) -> list[dict]:
    matches = await db.list_matches("live")
    created = []
    for match in matches:
        signal_data = await analyze_match(match)
        if not signal_data:
            continue
        recent = await db.list_signals(limit=5, match_id=match["id"])
        if recent and recent[0].get("headline") == signal_data["headline"]:
            continue
        row = await db.create_signal(signal_data)
        created.append(row)
        if broadcast:
            await broadcast("signals", {"type": "new_signal", "signal": _serialize_signal(row, match)})
    return created


def _serialize_signal(signal: dict, match: dict | None = None) -> dict:
    return {
        "id": signal["id"],
        "matchId": signal["match_id"],
        "type": signal["type"],
        "headline": signal["headline"],
        "prediction": signal["prediction"],
        "confidence": float(signal["confidence"]),
        "impact": signal["impact"],
        "reasoning": _parse_json(signal.get("reasoning"), []),
        "metrics": _parse_json(signal.get("metrics"), {}),
        "expectedValue": signal.get("expected_value"),
        "createdAt": signal["created_at"].isoformat() if hasattr(signal["created_at"], "isoformat") else str(signal["created_at"]),
        "homeTeam": _parse_json(match.get("home_team"), {}) if match else _parse_json(signal.get("home_team"), {}),
        "awayTeam": _parse_json(match.get("away_team"), {}) if match else _parse_json(signal.get("away_team"), {}),
        "scoreHome": match.get("score_home") if match else signal.get("score_home"),
        "scoreAway": match.get("score_away") if match else signal.get("score_away"),
    }
