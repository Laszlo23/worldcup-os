"""In-memory demo store when PostgreSQL is unavailable."""
import json
import uuid
from datetime import datetime, timezone
from copy import deepcopy

from app.ingestion.demo_feed import DEMO_MATCHES

_store: dict = {
    "matches": [],
    "signals": [],
    "predictions": [],
    "certificates": [],
    "agents": [
        {"id": "a1", "name": "Alpha", "strategy": "conservative", "strategy_config": {"min_confidence": 75, "stake_pct": 0.02}, "balance": 10250, "total_trades": 14, "wins": 9, "losses": 5, "roi": 2.5, "risk_score": 2},
        {"id": "a2", "name": "Beta", "strategy": "aggressive", "strategy_config": {"min_confidence": 60, "stake_pct": 0.05}, "balance": 10890, "total_trades": 22, "wins": 14, "losses": 8, "roi": 8.9, "risk_score": 5},
    ],
    "portfolio": {
        "balance": 11245.68,
        "pnl": 1245.68,
        "pnl_percent": 12.46,
        "win_rate": 64,
        "total_trades": 28,
        "equity_curve": [{"t": datetime.now(timezone.utc).isoformat(), "v": 11245.68}],
        "daily_pnl": [
            {"day": "Mon", "pnl": 120}, {"day": "Tue", "pnl": -45}, {"day": "Wed", "pnl": 210},
            {"day": "Thu", "pnl": 85}, {"day": "Fri", "pnl": 340}, {"day": "Sat", "pnl": -30}, {"day": "Sun", "pnl": 180},
        ],
    },
    "initialized": False,
}


def _now():
    return datetime.now(timezone.utc)


def init_demo_store():
    if _store["initialized"]:
        return
    _store["matches"] = []
    for m in DEMO_MATCHES:
        row = deepcopy(m)
        row["id"] = str(uuid.uuid4())
        row["home_team"] = row["home_team"]
        row["away_team"] = row["away_team"]
        row["score_home"] = row["score_home"]
        row["score_away"] = row["score_away"]
        row["odds_history"] = row["odds_history"]
        row["win_probability"] = row["win_probability"]
        _store["matches"].append(row)

    match = _store["matches"][0]
    sig_id = str(uuid.uuid4())
    _store["signals"].append({
        "id": sig_id,
        "match_id": match["id"],
        "type": "bullish",
        "headline": "Brazil likely to score next",
        "prediction": "Brazil next goal within 15 minutes",
        "confidence": 82.0,
        "impact": "high",
        "reasoning": [
            {"type": "odds_shift", "label": "Odds shortened 12.4% in last 60s", "impact": "positive"},
            {"type": "possession", "label": "Brazil possession increased to 63%", "impact": "positive"},
            {"type": "pressure", "label": "Attack pressure rated HIGH", "impact": "positive"},
            {"type": "pattern", "label": "Historical model probability increased", "impact": "positive"},
        ],
        "metrics": {"momentum": 78, "xg_next_15m": 1.45, "attack_pressure": "HIGH", "odds_home": 1.68},
        "expected_value": 18.6,
        "status": "active",
        "created_at": _now(),
        "home_team": match["home_team"],
        "away_team": match["away_team"],
        "score_home": match["score_home"],
        "score_away": match["score_away"],
    })

    pred_id = str(uuid.uuid4())
    _store["predictions"].append({
        "id": pred_id,
        "signal_id": sig_id,
        "match_id": match["id"],
        "market_label": "Brazil next goal",
        "side": "yes",
        "odds": 1.68,
        "virtual_stake": 100,
        "confidence": 82,
        "result": "win",
        "roi": 68,
        "headline": "Brazil likely to score next",
        "prediction": "Brazil next goal within 15 minutes",
        "tx_hash": "5xY9kLm...demo",
        "explorer_url": "https://explorer.solana.com/tx/demo?cluster=devnet",
        "cert_status": "anchored",
        "home_team": match["home_team"],
        "away_team": match["away_team"],
    })
    _store["initialized"] = True


def list_matches(status=None):
    init_demo_store()
    if status:
        return [m for m in _store["matches"] if m["status"] == status]
    return _store["matches"]


def get_match(match_id):
    init_demo_store()
    return next((m for m in _store["matches"] if m["id"] == match_id), None)


def list_signals(limit=50, match_id=None):
    init_demo_store()
    sigs = _store["signals"]
    if match_id:
        sigs = [s for s in sigs if s["match_id"] == match_id]
    return sigs[:limit]


def get_signal(signal_id):
    init_demo_store()
    return next((s for s in _store["signals"] if s["id"] == signal_id), None)


def list_predictions(limit=50):
    init_demo_store()
    return _store["predictions"][:limit]


def get_prediction(prediction_id):
    init_demo_store()
    return next((p for p in _store["predictions"] if p["id"] == prediction_id), None)


def get_agents():
    init_demo_store()
    return _store["agents"]


def get_performance():
    init_demo_store()
    p = _store["portfolio"]
    return {
        "balance": p["balance"],
        "pnl": p["pnl"],
        "pnl_percent": p["pnl_percent"],
        "win_rate": p["win_rate"],
        "total_trades": p["total_trades"],
        "equity_curve": p["equity_curve"],
        "daily_pnl": p["daily_pnl"],
    }


def get_recent_signals():
    init_demo_store()
    return [
        {"id": pr["id"], "market_label": pr["market_label"], "prediction": pr["prediction"], "result": pr.get("result", "win"), "roi": pr.get("roi"), "confidence": pr["confidence"], "tx_hash": pr.get("tx_hash")}
        for pr in _store["predictions"]
    ]
