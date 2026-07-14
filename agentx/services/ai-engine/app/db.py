import json
from datetime import datetime, timezone
from typing import Any

import asyncpg

from app.config import settings

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(settings.database_url, min_size=2, max_size=10)
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


def _json(val: Any) -> str:
    return json.dumps(val) if val is not None else "{}"


def _parse_dt(val: Any) -> datetime | None:
    if val is None:
        return None
    if isinstance(val, datetime):
        dt = val
    elif isinstance(val, str):
        dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
    else:
        return None
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


async def fetch_all(query: str, *args: Any) -> list[dict]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *args)
        return [dict(r) for r in rows]


async def fetch_one(query: str, *args: Any) -> dict | None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, *args)
        return dict(row) if row else None


async def execute(query: str, *args: Any) -> str:
    pool = await get_pool()
    async with pool.acquire() as conn:
        return await conn.execute(query, *args)


async def upsert_match(data: dict) -> dict:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO matches (
              id, external_id, txline_fixture_id, home_team, away_team,
              score_home, score_away, status, minute, stadium, stage,
              kickoff_at, stats, odds, odds_history, momentum, win_probability, raw_payload,
              created_at, updated_at
            ) VALUES (
              gen_random_uuid()::text, $1, $2, $3::jsonb, $4::jsonb,
              $5, $6, $7, $8, $9, $10,
              $11, $12::jsonb, $13::jsonb, $14::jsonb, $15, $16::jsonb, $17::jsonb,
              NOW(), NOW()
            )
            ON CONFLICT (external_id) DO UPDATE SET
              txline_fixture_id = EXCLUDED.txline_fixture_id,
              home_team = EXCLUDED.home_team,
              away_team = EXCLUDED.away_team,
              score_home = EXCLUDED.score_home,
              score_away = EXCLUDED.score_away,
              status = EXCLUDED.status,
              minute = EXCLUDED.minute,
              stadium = EXCLUDED.stadium,
              stage = EXCLUDED.stage,
              kickoff_at = EXCLUDED.kickoff_at,
              stats = EXCLUDED.stats,
              odds = EXCLUDED.odds,
              odds_history = EXCLUDED.odds_history,
              momentum = EXCLUDED.momentum,
              win_probability = EXCLUDED.win_probability,
              raw_payload = EXCLUDED.raw_payload,
              updated_at = NOW()
            RETURNING *
            """,
            data["external_id"],
            data.get("txline_fixture_id"),
            _json(data.get("home_team", {})),
            _json(data.get("away_team", {})),
            data.get("score_home", 0),
            data.get("score_away", 0),
            data.get("status", "scheduled"),
            data.get("minute", 0),
            data.get("stadium"),
            data.get("stage"),
            _parse_dt(data.get("kickoff_at")),
            _json(data.get("stats", {})),
            _json(data.get("odds", {})),
            _json(data.get("odds_history", [])),
            data.get("momentum", 50),
            _json(data.get("win_probability", {})),
            _json(data.get("raw_payload")),
        )
        return dict(row)


async def append_odds_history(match_id: str, odds: dict, history: list) -> None:
    await execute(
        "UPDATE matches SET odds = $1::jsonb, odds_history = $2::jsonb, updated_at = NOW() WHERE id = $3",
        _json(odds),
        _json(history),
        match_id,
    )


async def get_match_by_external_id(external_id: str) -> dict | None:
    return await fetch_one("SELECT * FROM matches WHERE external_id = $1", external_id)


async def get_match_by_id(match_id: str) -> dict | None:
    return await fetch_one("SELECT * FROM matches WHERE id = $1", match_id)


async def list_matches(status: str | None = None) -> list[dict]:
    demo_filter = "" if settings.demo_mode else " AND external_id NOT LIKE 'demo-%'"
    junk_filter = " AND external_id NOT IN ('unknown') AND external_id NOT LIKE '%None%' AND external_id NOT LIKE 'txline-%'"
    if status:
        return await fetch_all(
            f"SELECT * FROM matches WHERE status = $1{demo_filter}{junk_filter} ORDER BY kickoff_at DESC NULLS LAST",
            status,
        )
    return await fetch_all(
        f"SELECT * FROM matches WHERE 1=1{demo_filter}{junk_filter} ORDER BY kickoff_at DESC NULLS LAST"
    )


async def purge_demo_matches() -> int:
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            """
            DELETE FROM matches
            WHERE external_id LIKE 'demo-%'
               OR external_id = 'unknown'
               OR external_id LIKE '%None%'
               OR external_id LIKE 'txline-%'
            """
        )
    # asyncpg returns e.g. "DELETE 4"
    try:
        return int(str(result).split()[-1])
    except (ValueError, IndexError):
        return 0


async def insert_match_event(data: dict) -> dict:
    row = await fetch_one(
        """
        INSERT INTO match_events (id, match_id, event_type, minute, team, player, detail, txline_seq, payload, created_at)
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())
        RETURNING *
        """,
        data["match_id"],
        data["event_type"],
        data.get("minute", 0),
        data.get("team"),
        data.get("player"),
        data.get("detail"),
        data.get("txline_seq"),
        _json(data.get("payload")),
    )
    return row or {}


async def create_signal(data: dict) -> dict:
    row = await fetch_one(
        """
        INSERT INTO signals (id, match_id, type, headline, prediction, confidence, impact, reasoning, metrics, expected_value, status, created_at)
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, NOW())
        RETURNING *
        """,
        data["match_id"],
        data.get("type", "bullish"),
        data["headline"],
        data["prediction"],
        data["confidence"],
        data.get("impact", "medium"),
        _json(data.get("reasoning", [])),
        _json(data.get("metrics", {})),
        data.get("expected_value"),
        data.get("status", "active"),
    )
    return row or {}


async def list_signals(limit: int = 50, match_id: str | None = None) -> list[dict]:
    if match_id:
        return await fetch_all(
            """
            SELECT s.*, m.home_team, m.away_team, m.score_home, m.score_away
            FROM signals s JOIN matches m ON m.id = s.match_id
            WHERE s.match_id = $1 ORDER BY s.created_at DESC LIMIT $2
            """,
            match_id,
            limit,
        )
    return await fetch_all(
        """
        SELECT s.*, m.home_team, m.away_team, m.score_home, m.score_away
        FROM signals s JOIN matches m ON m.id = s.match_id
        ORDER BY s.created_at DESC LIMIT $1
        """,
        limit,
    )


async def get_signal(signal_id: str) -> dict | None:
    return await fetch_one(
        """
        SELECT s.*, m.home_team, m.away_team, m.score_home, m.score_away, m.odds, m.odds_history, m.stats, m.minute
        FROM signals s JOIN matches m ON m.id = s.match_id
        WHERE s.id = $1
        """,
        signal_id,
    )


async def create_prediction(data: dict) -> dict:
    row = await fetch_one(
        """
        INSERT INTO predictions (id, signal_id, match_id, market_label, side, odds, virtual_stake, confidence, created_at)
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
        """,
        data["signal_id"],
        data["match_id"],
        data["market_label"],
        data["side"],
        data["odds"],
        data.get("virtual_stake", 100),
        data["confidence"],
    )
    return row or {}


async def list_predictions(limit: int = 50) -> list[dict]:
    return await fetch_all(
        """
        SELECT p.*, s.headline, s.prediction, m.home_team, m.away_team,
               c.tx_hash, c.explorer_url, c.status as cert_status
        FROM predictions p
        JOIN signals s ON s.id = p.signal_id
        JOIN matches m ON m.id = p.match_id
        LEFT JOIN on_chain_certificates c ON c.prediction_id = p.id
        ORDER BY p.created_at DESC LIMIT $1
        """,
        limit,
    )


async def get_prediction(prediction_id: str) -> dict | None:
    return await fetch_one(
        """
        SELECT p.*, s.headline, s.prediction, s.reasoning, s.confidence as signal_confidence,
               m.home_team, m.away_team, m.stage,
               c.id as cert_id, c.memo, c.tx_hash, c.explorer_url, c.status as cert_status, c.anchored_at
        FROM predictions p
        JOIN signals s ON s.id = p.signal_id
        JOIN matches m ON m.id = p.match_id
        LEFT JOIN on_chain_certificates c ON c.prediction_id = p.id
        WHERE p.id = $1
        """,
        prediction_id,
    )


async def run_agent_migrations() -> None:
    await execute("ALTER TABLE agents ADD COLUMN IF NOT EXISTS owner_wallet TEXT")
    await execute("ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false")
    await execute("ALTER TABLE agents ADD COLUMN IF NOT EXISTS display_name TEXT")
    await execute("ALTER TABLE agents ADD COLUMN IF NOT EXISTS earn_agent_id TEXT")
    await execute("ALTER TABLE agents ADD COLUMN IF NOT EXISTS earn_username TEXT")
    await execute("ALTER TABLE agents ADD COLUMN IF NOT EXISTS callback_url TEXT")
    await execute("ALTER TABLE agents ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ")
    await execute(
        """
        UPDATE agents SET is_system = true, strategy_config = '{"min_confidence": 78, "stake_pct": 0.02, "side": "home", "min_ev": 0.05}'::jsonb
        WHERE name = 'Alpha' AND is_system = false
        """
    )
    await execute(
        """
        UPDATE agents SET is_system = true, strategy_config = '{"min_confidence": 78, "stake_pct": 0.03, "side": "away", "min_ev": 0.05}'::jsonb
        WHERE name = 'Beta' AND is_system = false
        """
    )


async def ensure_agents() -> list[dict]:
    await run_agent_migrations()
    agents = await fetch_all("SELECT * FROM agents WHERE is_system = true ORDER BY name")
    if agents:
        return agents
    await execute(
        """
        INSERT INTO agents (id, name, strategy, strategy_config, balance, is_system, created_at, updated_at)
        VALUES
          (gen_random_uuid()::text, 'Alpha', 'conservative', '{"min_confidence": 78, "stake_pct": 0.02, "side": "home", "min_ev": 0.05}'::jsonb, 10000, true, NOW(), NOW()),
          (gen_random_uuid()::text, 'Beta', 'contrarian', '{"min_confidence": 78, "stake_pct": 0.03, "side": "away", "min_ev": 0.05}'::jsonb, 10000, true, NOW(), NOW())
        ON CONFLICT (name) DO NOTHING
        """
    )
    return await fetch_all("SELECT * FROM agents WHERE is_system = true ORDER BY name")


async def list_trading_agents() -> list[dict]:
    await run_agent_migrations()
    return await fetch_all("SELECT * FROM agents ORDER BY roi DESC, name ASC")


async def get_agent_by_name(name: str) -> dict | None:
    return await fetch_one("SELECT * FROM agents WHERE name = $1", name)


async def get_agents_by_owner(owner_wallet: str) -> list[dict]:
    return await fetch_all(
        "SELECT * FROM agents WHERE owner_wallet = $1 ORDER BY created_at DESC",
        owner_wallet,
    )


async def create_user_agent(owner_wallet: str, template: str, display_name: str | None = None) -> dict:
    template_key = template.lower()
    if template_key not in ("alpha", "beta"):
        raise ValueError("template must be alpha or beta")
    slug = f"u-{owner_wallet[:8].lower()}-{template_key}"
    existing = await get_agent_by_name(slug)
    if existing:
        return existing
    template_agent = await get_agent_by_name("Alpha" if template_key == "alpha" else "Beta")
    if not template_agent:
        await ensure_agents()
        template_agent = await get_agent_by_name("Alpha" if template_key == "alpha" else "Beta")
    config = template_agent.get("strategy_config") if template_agent else {}
    row = await fetch_one(
        """
        INSERT INTO agents (id, name, strategy, strategy_config, balance, owner_wallet, is_system, display_name, created_at, updated_at)
        VALUES (gen_random_uuid()::text, $1, $2, $3::jsonb, 10000, $4, false, $5, NOW(), NOW())
        RETURNING *
        """,
        slug,
        template_agent.get("strategy", template_key),
        _json(config if isinstance(config, dict) else {}),
        owner_wallet,
        display_name or f"My {template_key.capitalize()}",
    )
    if not row:
        raise ValueError("Failed to create agent")
    return row


async def list_decisions_for_signal(signal_id: str) -> list[dict]:
    return await fetch_all(
        """
        SELECT d.*, a.name as agent_name, a.display_name, a.owner_wallet, a.is_system, s.headline
        FROM agent_decisions d
        JOIN agents a ON a.id = d.agent_id
        JOIN signals s ON s.id = d.signal_id
        WHERE d.signal_id = $1
        ORDER BY d.created_at ASC
        """,
        signal_id,
    )


async def get_latest_anchored_prediction() -> dict | None:
    return await fetch_one(
        """
        SELECT p.id, p.signal_id, c.tx_hash, c.explorer_url, c.status
        FROM predictions p
        JOIN on_chain_certificates c ON c.prediction_id = p.id
        WHERE c.status = 'anchored' AND c.tx_hash IS NOT NULL
        ORDER BY c.anchored_at DESC NULLS LAST, p.created_at DESC
        LIMIT 1
        """
    )


async def update_agent_treasury(name: str, pubkey: str, balance: float) -> None:
    await execute(
        """
        UPDATE agents SET treasury_pubkey = $1, treasury_balance = $2, last_synced_at = NOW(), updated_at = NOW()
        WHERE name = $3
        """,
        pubkey,
        balance,
        name,
    )


async def link_earn_agent(
    name: str,
    *,
    earn_agent_id: str,
    earn_username: str | None = None,
    callback_url: str | None = None,
) -> dict | None:
    await run_agent_migrations()
    return await fetch_one(
        """
        UPDATE agents
        SET earn_agent_id = $2, earn_username = $3, callback_url = $4, updated_at = NOW()
        WHERE name = $1
        RETURNING *
        """,
        name,
        earn_agent_id,
        earn_username,
        callback_url,
    )


async def touch_agent_heartbeat(name: str) -> dict | None:
    await run_agent_migrations()
    return await fetch_one(
        """
        UPDATE agents SET last_heartbeat_at = NOW(), updated_at = NOW()
        WHERE name = $1
        RETURNING *
        """,
        name,
    )


async def create_agent_decision(data: dict) -> dict:
    row = await fetch_one(
        """
        INSERT INTO agent_decisions (id, agent_id, signal_id, action, stake, odds, created_at)
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW())
        RETURNING *
        """,
        data["agent_id"],
        data["signal_id"],
        data["action"],
        data["stake"],
        data["odds"],
    )
    return row or {}


async def update_agent_stats(agent_id: str, *, balance: float, wins: int, losses: int, total_trades: int, roi: float, risk_score: float) -> None:
    await execute(
        """
        UPDATE agents SET balance = $1, wins = $2, losses = $3, total_trades = $4, roi = $5, risk_score = $6, updated_at = NOW()
        WHERE id = $7
        """,
        balance,
        wins,
        losses,
        total_trades,
        roi,
        risk_score,
        agent_id,
    )


async def list_agent_decisions(agent_id: str, limit: int = 20) -> list[dict]:
    return await fetch_all(
        """
        SELECT d.*, s.headline, s.confidence
        FROM agent_decisions d
        JOIN signals s ON s.id = d.signal_id
        WHERE d.agent_id = $1
        ORDER BY d.created_at DESC LIMIT $2
        """,
        agent_id,
        limit,
    )


async def get_latest_portfolio() -> dict | None:
    return await fetch_one("SELECT * FROM portfolio_snapshots ORDER BY created_at DESC LIMIT 1")


async def create_portfolio_snapshot(data: dict) -> dict:
    row = await fetch_one(
        """
        INSERT INTO portfolio_snapshots (id, balance, pnl, pnl_percent, win_rate, total_trades, equity_curve, daily_pnl, created_at)
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, NOW())
        RETURNING *
        """,
        data["balance"],
        data["pnl"],
        data["pnl_percent"],
        data["win_rate"],
        data["total_trades"],
        _json(data.get("equity_curve", [])),
        _json(data.get("daily_pnl", [])),
    )
    return row or {}


async def create_certificate(data: dict) -> dict:
    row = await fetch_one(
        """
        INSERT INTO on_chain_certificates (id, prediction_id, memo, tx_hash, explorer_url, status, anchored_at, created_at)
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, NOW())
        RETURNING *
        """,
        data["prediction_id"],
        data["memo"],
        data.get("tx_hash"),
        data.get("explorer_url"),
        data.get("status", "pending"),
        data.get("anchored_at") if isinstance(data.get("anchored_at"), datetime) else _parse_dt(data.get("anchored_at")),
    )
    return row or {}


async def update_certificate(cert_id: str, tx_hash: str, explorer_url: str) -> None:
    await execute(
        """
        UPDATE on_chain_certificates SET tx_hash = $1, explorer_url = $2, status = 'anchored', anchored_at = NOW()
        WHERE id = $3
        """,
        tx_hash,
        explorer_url,
        cert_id,
    )


async def save_chat_message(session_id: str, role: str, content: str, context: dict | None = None) -> None:
    await execute(
        """
        INSERT INTO chat_messages (id, session_id, role, content, context, created_at)
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4::jsonb, NOW())
        """,
        session_id,
        role,
        content,
        _json(context),
    )


async def get_chat_history(session_id: str, limit: int = 20) -> list[dict]:
    return await fetch_all(
        "SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC LIMIT $2",
        session_id,
        limit,
    )


async def list_live_markets_for_match(match_id: str) -> list[dict]:
    rows = await fetch_all(
        """
        select m.id, m.external_id, m.type, m.title, m.closes_at, m.window_opens_at,
               m.resolution_kind, m.closed, m.resolved_outcome,
               mt.status as match_status, mt.kickoff_at
        from markets m
        join matches mt on mt.id = m.match_id
        where m.match_id = $1
          and m.type like 'live_%'
          and m.closed = false
          and m.resolved_outcome is null
          and (m.closes_at is null or m.closes_at > now())
        order by m.closes_at asc
        limit 3
        """,
        match_id,
    )
    result = []
    for row in rows:
        options = await fetch_all(
            "select external_id, label, price from market_options where market_id = $1 order by label asc",
            row["id"],
        )
        result.append({**row, "options": options})
    return result


async def get_market_by_external_id(external_id: str) -> dict | None:
    return await fetch_one(
        """
        select m.*, mt.status as match_status, mt.kickoff_at, mt.external_id as match_external_id
        from markets m
        join matches mt on mt.id = m.match_id
        where m.external_id = $1
        """,
        external_id,
    )


async def ensure_user(wallet_pubkey: str) -> dict:
    row = await fetch_one("select id, wallet_pubkey from users where wallet_pubkey = $1", wallet_pubkey)
    if row:
        return row
    return await fetch_one(
        """
        insert into users (wallet_pubkey)
        values ($1)
        returning id, wallet_pubkey
        """,
        wallet_pubkey,
    ) or {}


async def prediction_tx_exists(tx_signature: str) -> bool:
    row = await fetch_one("select id from predictions where tx_signature = $1 limit 1", tx_signature)
    return row is not None


async def insert_usdc_prediction(data: dict) -> dict:
    row = await fetch_one(
        """
        insert into predictions (
          external_id, user_id, market_id, match_id, option_id, outcome_label,
          amount, price, status, escrow_pda, tx_signature, placed_at
        ) values (
          $1, $2, $3, $4, $5, $6,
          $7, $8, 'open', $9, $10, now()
        )
        returning id, external_id
        """,
        data["external_id"],
        data["user_id"],
        data["market_id"],
        data["match_id"],
        data["option_id"],
        data["outcome_label"],
        data["amount"],
        data["price"],
        data["escrow_pda"],
        data["tx_signature"],
    )
    if row:
        await execute(
            "insert into escrows (prediction_id, amount, status) values ($1, $2, 'locked')",
            row["id"],
            data["amount"],
        )
    return row or {}

