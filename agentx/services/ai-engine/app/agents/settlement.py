"""Resolve agent decisions when matches finish using final TxLINE scores."""

import json
from typing import Any

from app import repository as db


def _parse_json(val: Any, default: Any) -> Any:
    if val is None:
        return default
    if isinstance(val, str):
        return json.loads(val)
    return val


def _match_winner(match: dict) -> str:
    home = int(match.get("score_home", 0))
    away = int(match.get("score_away", 0))
    if home > away:
        return "home"
    if away > home:
        return "away"
    return "draw"


def _decision_won(action: str, winner: str) -> bool:
    if winner == "draw":
        return action in ("buy_draw", "fade")
    if action == "buy_home":
        return winner == "home"
    if action == "buy_away":
        return winner == "away"
    if action == "fade_home":
        return winner != "home"
    if action == "fade_away":
        return winner != "away"
    return action == "buy" and winner == "home"


async def resolve_finished_matches() -> int:
    """Settle pending agent decisions for finished matches."""
    if not await db.check_db():
        return 0

    from app import db as pgdb

    finished = await pgdb.fetch_all(
        """
        SELECT id, score_home, score_away, status
        FROM matches
        WHERE status IN ('finished', 'settled')
        ORDER BY updated_at DESC
        LIMIT 20
        """,
    )
    resolved = 0
    for match in finished:
        winner = _match_winner(match)
        pending = await pgdb.fetch_all(
            """
            SELECT d.*, a.name as agent_name, a.balance, a.wins, a.losses, a.total_trades, a.roi, a.risk_score
            FROM agent_decisions d
            JOIN agents a ON a.id = d.agent_id
            JOIN signals s ON s.id = d.signal_id
            WHERE s.match_id = $1 AND d.outcome IS NULL
            """,
            match["id"],
        )
        for decision in pending:
            action = str(decision.get("action", "buy"))
            stake = float(decision.get("stake", 0))
            odds = float(decision.get("odds", 1.68))
            won = _decision_won(action, winner)
            payout = round(stake * (odds - 1), 2) if won else -stake
            outcome = "won" if won else "lost"
            await pgdb.execute(
                "UPDATE agent_decisions SET outcome = $2, roi = $3 WHERE id = $1",
                decision["id"],
                outcome,
                payout,
            )
            balance = float(decision["balance"]) + payout
            wins = int(decision["wins"]) + (1 if won else 0)
            losses = int(decision["losses"]) + (0 if won else 1)
            total = int(decision["total_trades"])
            roi = round((balance - 10000) / 100, 2)
            await db.update_agent_stats(
                decision["agent_id"],
                balance=balance,
                wins=wins,
                losses=losses,
                total_trades=total,
                roi=roi,
                risk_score=float(decision["risk_score"]),
            )
            resolved += 1
    return resolved
