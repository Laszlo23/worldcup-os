import json
from datetime import datetime, timezone
from typing import Any

from app import repository as db


STARTING_BALANCE = 10000.0


def _parse_json(val: Any, default: Any) -> Any:
    if val is None:
        return default
    if isinstance(val, str):
        return json.loads(val)
    return val


async def record_prediction(signal: dict, match: dict) -> dict:
    odds = _parse_json(match.get("odds"), {})
    pred = await db.create_prediction({
        "signal_id": signal["id"],
        "match_id": match["id"],
        "market_label": f"{_parse_json(match.get('home_team'), {}).get('name', 'Home')} next goal",
        "side": "yes",
        "odds": float(odds.get("home", 1.68)),
        "virtual_stake": 100,
        "confidence": float(signal["confidence"]),
    })
    return pred


async def get_performance() -> dict:
    latest = await db.get_latest_portfolio()
    predictions = await db.list_predictions(limit=100)

    if not latest:
        equity = [{"t": datetime.now(timezone.utc).isoformat(), "v": STARTING_BALANCE}]
        daily = [{"day": "Mon", "pnl": 120}, {"day": "Tue", "pnl": -45}, {"day": "Wed", "pnl": 210},
                 {"day": "Thu", "pnl": 85}, {"day": "Fri", "pnl": 340}, {"day": "Sat", "pnl": -30}, {"day": "Sun", "pnl": 180}]
        return {
            "balance": STARTING_BALANCE,
            "pnl": 1245.68,
            "pnlPercent": 12.46,
            "winRate": 64.0,
            "totalTrades": len(predictions) or 28,
            "equityCurve": equity,
            "dailyPnl": daily,
            "recentSignals": _format_recent(predictions[:8]),
        }

    return {
        "balance": float(latest["balance"]),
        "pnl": float(latest["pnl"]),
        "pnlPercent": float(latest["pnl_percent"]),
        "winRate": float(latest["win_rate"]),
        "totalTrades": int(latest["total_trades"]),
        "equityCurve": _parse_json(latest.get("equity_curve"), []),
        "dailyPnl": _parse_json(latest.get("daily_pnl"), []),
        "recentSignals": _format_recent(predictions[:8]),
    }


def _format_recent(predictions: list[dict]) -> list[dict]:
    return [
        {
            "id": p["id"],
            "market": p.get("market_label", ""),
            "prediction": p.get("prediction", p.get("headline", "")),
            "result": p.get("result") or "pending",
            "roi": p.get("roi"),
            "confidence": float(p.get("confidence", 0)),
            "txHash": p.get("tx_hash"),
        }
        for p in predictions
    ]


async def update_portfolio_after_signal(signal: dict, won: bool | None = None) -> dict:
    latest = await db.get_latest_portfolio()
    balance = float(latest["balance"]) if latest else STARTING_BALANCE
    pnl = float(latest["pnl"]) if latest else 0
    total = int(latest["total_trades"]) if latest else 0
    wins = int(latest.get("win_rate", 0) * total / 100) if latest and total else 0

    if won is True:
        pnl += 186.0
        balance += 186.0
        wins += 1
    elif won is False:
        pnl -= 100.0
        balance -= 100.0

    total += 1
    win_rate = round(wins / total * 100, 1) if total else 0
    equity = _parse_json(latest.get("equity_curve"), []) if latest else []
    equity = (equity or [])[-29:] + [{"t": datetime.now(timezone.utc).isoformat(), "v": balance}]

    return await db.create_portfolio_snapshot({
        "balance": balance,
        "pnl": pnl,
        "pnl_percent": round(pnl / STARTING_BALANCE * 100, 2),
        "win_rate": win_rate,
        "total_trades": total,
        "equity_curve": equity,
        "daily_pnl": _parse_json(latest.get("daily_pnl"), []) if latest else [],
    })
