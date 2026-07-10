import json
from typing import Any

from app import repository as db
from app.blockchain.treasury import TREASURY_MIN_USDC, get_treasury_balance, address_explorer


def _parse_json(val: Any, default: Any) -> Any:
    if val is None:
        return default
    if isinstance(val, str):
        return json.loads(val)
    return val


def _agent_action(agent_name: str, signal: dict) -> tuple[str, float]:
    """Alpha backs home momentum; Beta fades it (away/draw bias)."""
    metrics = _parse_json(signal.get("metrics"), {})
    odds_home = float(metrics.get("odds_home") or 1.68)
    odds_away = float(metrics.get("odds_away") or 2.5)
    if agent_name.lower() == "beta":
        return ("buy_away", odds_away)
    return ("buy_home", odds_home)


async def process_signal_for_agents(signal: dict, broadcast=None) -> list[dict]:
    agents = await db.ensure_agents()
    decisions = []
    confidence = float(signal["confidence"])

    for agent in agents:
        config = _parse_json(agent.get("strategy_config"), {})
        min_conf = float(config.get("min_confidence", 70))
        stake_pct = float(config.get("stake_pct", 0.02))
        if confidence < min_conf:
            continue

        treasury_balance = float(agent.get("treasury_balance") or 0)
        if treasury_balance < TREASURY_MIN_USDC:
            treasury_balance = await get_treasury_balance(agent["name"])
            pubkey = agent.get("treasury_pubkey") or ""
            if pubkey:
                await db.update_agent_treasury(agent["name"], str(pubkey), treasury_balance)

        if treasury_balance < TREASURY_MIN_USDC:
            continue

        action, odds = _agent_action(agent["name"], signal)
        stake = min(round(treasury_balance * stake_pct, 2), treasury_balance * 0.1)
        if stake < 1:
            continue

        decision = await db.create_agent_decision({
            "agent_id": agent["id"],
            "signal_id": signal["id"],
            "action": action,
            "stake": stake,
            "odds": odds,
        })
        decisions.append(decision)
        total = int(agent["total_trades"]) + 1
        await db.update_agent_stats(
            agent["id"],
            balance=float(agent["balance"]) - stake,
            wins=int(agent["wins"]),
            losses=int(agent["losses"]),
            total_trades=total,
            roi=float(agent["roi"]),
            risk_score=stake_pct * 100,
        )
        if broadcast:
            await broadcast("portfolio", {"type": "agent_decision", "agent": agent["name"], "stake": stake})
    return decisions


async def get_agents_leaderboard() -> list[dict]:
    from app.blockchain.treasury import get_treasury_keypair

    agents = await db.ensure_agents()
    result = []
    for agent in agents:
        recent = await db.list_agent_decisions(agent["id"], limit=5)
        total = int(agent.get("total_trades", agent.get("totalTrades", 0)))
        wins = int(agent.get("wins", 0))
        treasury_balance = await get_treasury_balance(agent["name"])
        treasury_pubkey = agent.get("treasury_pubkey") or str(get_treasury_keypair(agent["name"]).pubkey())
        await db.update_agent_treasury(agent["name"], treasury_pubkey, treasury_balance)
        active = treasury_balance >= TREASURY_MIN_USDC
        result.append({
            "id": agent["id"],
            "name": agent["name"],
            "strategy": agent["strategy"],
            "balance": float(agent["balance"]),
            "totalTrades": total,
            "wins": wins,
            "losses": int(agent.get("losses", 0)),
            "roi": float(agent.get("roi", 0)),
            "riskScore": float(agent.get("risk_score", agent.get("riskScore", 0))),
            "winRate": round(wins / max(1, total) * 100, 1),
            "treasuryPubkey": treasury_pubkey,
            "treasuryBalance": treasury_balance,
            "treasuryExplorer": address_explorer(treasury_pubkey),
            "active": active,
            "minTreasury": TREASURY_MIN_USDC,
            "recentDecisions": [
                {
                    "id": d.get("id", ""),
                    "action": d.get("action", "buy"),
                    "stake": float(d.get("stake", 0)),
                    "outcome": d.get("outcome"),
                    "headline": d.get("headline"),
                    "createdAt": str(d.get("created_at", "")),
                }
                for d in recent
            ],
        })
    result.sort(key=lambda a: a["roi"], reverse=True)
    for i, a in enumerate(result):
        a["rank"] = i + 1
    return result
