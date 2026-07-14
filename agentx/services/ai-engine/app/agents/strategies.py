import json
from typing import Any

from app import repository as db
from datetime import datetime, timezone, timedelta

from app.blockchain.treasury import TREASURY_MIN_USDC, get_treasury_balance, address_explorer


def _parse_json(val: Any, default: Any) -> Any:
    if val is None:
        return default
    if isinstance(val, str):
        return json.loads(val)
    return val


def _signal_passes_filters(signal: dict, config: dict) -> bool:
    confidence = float(signal.get("confidence", 0))
    min_conf = float(config.get("min_confidence", 78))
    if confidence < min_conf:
        return False
    min_ev = float(config.get("min_ev", 0.05))
    ev = signal.get("expected_value")
    if ev is not None and float(ev) < min_ev:
        return False
    metrics = _parse_json(signal.get("metrics"), {})
    momentum = float(metrics.get("momentum") or signal.get("momentum") or 50)
    if config.get("side") == "home" and momentum < 55:
        return False
    if config.get("side") == "away" and momentum > 45:
        return False
    return True


def _agent_action(agent_name: str, signal: dict, config: dict) -> tuple[str, float]:
    """Alpha backs home momentum; Beta fades it (away bias)."""
    metrics = _parse_json(signal.get("metrics"), {})
    odds_home = float(metrics.get("odds_home") or 1.68)
    odds_away = float(metrics.get("odds_away") or 2.5)
    side = str(config.get("side", "home")).lower()
    if side == "away" or agent_name.lower().endswith("-beta") or agent_name.lower() == "beta":
        return ("buy_away", odds_away)
    return ("buy_home", odds_home)


async def process_signal_for_agents(signal: dict, broadcast=None) -> list[dict]:
    agents = await db.list_trading_agents()
    decisions = []
    confidence = float(signal["confidence"])

    for agent in agents:
        config = _parse_json(agent.get("strategy_config"), {})
        if not _signal_passes_filters(signal, config):
            continue

        treasury_balance = float(agent.get("treasury_balance") or 0)
        if treasury_balance < TREASURY_MIN_USDC:
            treasury_balance = await get_treasury_balance(agent["name"])
            pubkey = agent.get("treasury_pubkey") or ""
            if pubkey or treasury_balance >= TREASURY_MIN_USDC:
                from app.blockchain.treasury import get_treasury_keypair
                pubkey = pubkey or str(get_treasury_keypair(agent["name"]).pubkey())
                await db.update_agent_treasury(agent["name"], str(pubkey), treasury_balance)

        if treasury_balance < TREASURY_MIN_USDC:
            continue

        stake_pct = float(config.get("stake_pct", 0.02))
        action, odds = _agent_action(agent["name"], signal, config)
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
        if await db.check_db():
            from app.blockchain.agent_predictions import place_agent_live_bet

            on_chain = await place_agent_live_bet(
                agent["name"],
                signal["match_id"],
                stake,
                action,
            )
            if on_chain and on_chain.get("treasuryBalance") is not None:
                from app.blockchain.treasury import get_treasury_keypair

                pubkey = agent.get("treasury_pubkey") or str(get_treasury_keypair(agent["name"]).pubkey())
                await db.update_agent_treasury(agent["name"], pubkey, float(on_chain["treasuryBalance"]))
        if broadcast:
            await broadcast("portfolio", {
                "type": "agent_decision",
                "agent": agent.get("display_name") or agent["name"],
                "stake": stake,
                "signalId": signal["id"],
                "confidence": confidence,
            })
        callback_url = agent.get("callback_url")
        if callback_url:
            from app.earn.client import notify_callback

            await notify_callback(
                callback_url,
                {
                    "type": "signal_opportunity",
                    "signalId": signal["id"],
                    "confidence": confidence,
                    "action": action,
                    "stake": stake,
                    "agentName": agent["name"],
                },
            )
    return decisions


async def get_agents_leaderboard() -> list[dict]:
    from app.blockchain.treasury import get_treasury_keypair

    agents = await db.list_trading_agents()
    result = []
    for agent in agents:
        recent = await db.list_agent_decisions(agent["id"], limit=5)
        total = int(agent.get("total_trades", agent.get("totalTrades", 0)))
        wins = int(agent.get("wins", 0))
        treasury_balance = await get_treasury_balance(agent["name"])
        treasury_pubkey = agent.get("treasury_pubkey") or str(get_treasury_keypair(agent["name"]).pubkey())
        await db.update_agent_treasury(agent["name"], treasury_pubkey, treasury_balance)
        active = treasury_balance >= TREASURY_MIN_USDC
        heartbeat_at = agent.get("last_heartbeat_at")
        if agent.get("earn_agent_id") and heartbeat_at:
            if isinstance(heartbeat_at, str):
                heartbeat_at = datetime.fromisoformat(heartbeat_at.replace("Z", "+00:00"))
            if heartbeat_at.tzinfo is None:
                heartbeat_at = heartbeat_at.replace(tzinfo=timezone.utc)
            stale = datetime.now(timezone.utc) - heartbeat_at > timedelta(minutes=10)
            if stale:
                active = False
        display = agent.get("display_name") or agent["name"]
        result.append({
            "id": agent["id"],
            "name": agent["name"],
            "displayName": display,
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
            "ownerWallet": agent.get("owner_wallet"),
            "isSystem": bool(agent.get("is_system")),
            "earnAgentId": agent.get("earn_agent_id"),
            "earnUsername": agent.get("earn_username"),
            "lastHeartbeatAt": str(agent.get("last_heartbeat_at") or ""),
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
