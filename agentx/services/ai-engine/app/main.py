import asyncio
import json
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from app import repository as db
from app.config import settings
from app.ingestion.state import ingestion_state, touch_event
from app.ingestion.stream_runner import run_scores_stream, run_odds_stream
from app.ingestion.poll_fallback import run_poll_fallback
from app.ingestion.worker import sync_fixtures, get_demo_tick, upsert_from_payload, purge_demo_data
from app.signals.engine import run_signal_cycle, _serialize_signal
from app.agents.strategies import process_signal_for_agents, get_agents_leaderboard
from app.agents.settlement import resolve_finished_matches
from app.simulation.portfolio import get_performance, record_prediction, update_portfolio_after_signal
from app.blockchain.memo import anchor_prediction, build_memo, build_user_certificate_tx, verify_user_memo_tx
from app.blockchain.faucet import drip_faucet, get_usdc_balance, build_fund_agent_tx, verify_fund_agent_tx
from app.blockchain.predictions import build_place_prediction_tx, verify_place_prediction_tx
from app.market_betting import is_market_bettable
from app.blockchain.treasury import get_treasury_balance, address_explorer, explorer_url as tx_explorer
from app.auth.nonce_store import create_nonce
from app.auth.session import verify_auth, create_session_token, decode_session_token, SESSION_COOKIE
from app.security.solana_pubkey import is_valid_solana_pubkey, extract_domain_from_auth_message, is_allowed_auth_domain
from app.security.webacy import screen_wallet
from app.chat.analyst import chat_response, chat_stream
from app.ws.hub import hub

DEMO_TICK_INTERVAL = 10
SIGNAL_INTERVAL = 60


def _parse_json(val: Any, default: Any) -> Any:
    if val is None:
        return default
    if isinstance(val, str):
        return json.loads(val)
    return val


async def _broadcast(channel: str, payload: dict) -> None:
    await hub.broadcast(channel, payload)


def _serialize_match(m: dict) -> dict:
    return {
        "id": m["id"],
        "externalId": m.get("external_id", m.get("externalId", "")),
        "homeTeam": _parse_json(m.get("home_team"), m.get("homeTeam", {})),
        "awayTeam": _parse_json(m.get("away_team"), m.get("awayTeam", {})),
        "scoreHome": m.get("score_home", m.get("scoreHome", 0)),
        "scoreAway": m.get("score_away", m.get("scoreAway", 0)),
        "status": m["status"],
        "minute": m.get("minute", 0),
        "kickoffAt": m.get("kickoff_at") or m.get("kickoffAt"),
        "stadium": m.get("stadium"),
        "stage": m.get("stage"),
        "stats": _parse_json(m.get("stats"), {}),
        "odds": _parse_json(m.get("odds"), {}),
        "oddsHistory": _parse_json(m.get("odds_history"), m.get("oddsHistory", [])),
        "momentum": float(m.get("momentum", 50)),
        "winProbability": _parse_json(m.get("win_probability"), m.get("winProbability", {})),
    }


async def demo_ingest_loop() -> None:
    """Only runs when DEMO_MODE=true — never injects fake data in production."""
    while True:
        try:
            tick = await get_demo_tick()
            if tick:
                match = await upsert_from_payload(tick, tick.get("_event_type", "score"))
                if match:
                    touch_event()
                    await _broadcast("matches", {"type": "match_update", "match": _serialize_match(match)})
        except Exception as e:
            ingestion_state["last_error"] = str(e)
            print(f"[demo_ingest] error: {e}")
        await asyncio.sleep(DEMO_TICK_INTERVAL)


async def signal_loop() -> None:
    while True:
        try:
            if not settings.demo_mode:
                await sync_fixtures()
            resolved = await resolve_finished_matches()
            if resolved:
                await _broadcast("portfolio", {"type": "agents_settled", "count": resolved})
            from app.blockchain.agent_predictions import auto_claim_agent_winnings

            claimed = await auto_claim_agent_winnings()
            if claimed:
                await _broadcast("portfolio", {"type": "agents_claimed", "count": claimed})
            signals = await run_signal_cycle(broadcast=_broadcast)
            for sig in signals:
                match = await db.get_match_by_id(sig["match_id"])
                if not match:
                    continue
                pred = await record_prediction(sig, match)
                if float(sig["confidence"]) >= 70:
                    await anchor_prediction(pred, sig, match)
                await process_signal_for_agents(sig, broadcast=_broadcast)
                await update_portfolio_after_signal(sig)
                await _broadcast("demo", {"type": "pipeline", "step": "signal_generated", "signal": _serialize_signal(sig, match)})
        except Exception as e:
            ingestion_state["last_error"] = str(e)
            print(f"[signal_loop] error: {e}")
        await asyncio.sleep(SIGNAL_INTERVAL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app import demo_store
    demo_store.init_demo_store()
    tasks: list[asyncio.Task] = []
    try:
        from app.repository import check_db
        if await check_db():
            if not settings.demo_mode:
                removed = await purge_demo_data()
                if removed:
                    print(f"[startup] purged {removed} demo match(es)")
            await sync_fixtures()
            await db.run_agent_migrations()
            await db.ensure_agents()
    except Exception as e:
        print(f"[startup] fixture sync warning: {e}")
    if settings.demo_mode:
        tasks.append(asyncio.create_task(demo_ingest_loop()))
    tasks.append(asyncio.create_task(signal_loop()))
    if not settings.demo_mode:
        tasks.append(asyncio.create_task(run_scores_stream(_broadcast, _serialize_match)))
        tasks.append(asyncio.create_task(run_odds_stream(_broadcast, _serialize_match)))
        tasks.append(asyncio.create_task(run_poll_fallback(_broadcast, _serialize_match)))
    try:
        from app.blockchain.treasury import init_treasuries
        await init_treasuries()
    except Exception:
        pass
    yield
    for t in tasks:
        t.cancel()
    from app.repository import close_pool
    await close_pool()


app = FastAPI(title="TxLINE AI Trader Engine", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    from app.repository import check_db
    db_ok = await check_db()
    live_streams = ingestion_state["scores_connected"] or ingestion_state["odds_connected"]
    poll_active = bool(ingestion_state["last_event_at"]) and not settings.demo_mode
    streams_connected = live_streams or poll_active or settings.demo_mode
    mode = "demo" if settings.demo_mode else ("live" if live_streams else ("live-poll" if poll_active else "demo-fallback"))
    return {
        "status": "ok",
        "database": db_ok,
        "demoMode": settings.demo_mode,
        "ingestionMode": mode,
        "liveIngestion": (live_streams or poll_active) and not settings.demo_mode,
        "streamsConnected": streams_connected,
        "scoresStream": ingestion_state["scores_connected"],
        "oddsStream": ingestion_state["odds_connected"],
        "lastEventAt": ingestion_state["last_event_at"],
        "txlineAuthenticated": bool(settings.txline_api_token or settings.txline_guest_jwt),
        "txlineApiOrigin": settings.txline_api_origin,
        "lastError": ingestion_state["last_error"],
        "webacyConfigured": settings.has_webacy(),
    }


@app.get("/api/live-matches")
async def live_matches(status: str | None = None):
    if status:
        rows = await db.list_matches(status)
    else:
        rows = await db.list_matches()
    return {"matches": [_serialize_match(m) for m in rows]}


@app.get("/api/matches/{match_id}")
async def match_detail(match_id: str):
    match = await db.get_match_by_id(match_id)
    if not match:
        return JSONResponse({"error": "Not found"}, status_code=404)
    return {"match": _serialize_match(match)}


def _serialize_live_market(row: dict) -> dict:
    closes_at = row.get("closes_at")
    countdown = 0
    if closes_at is not None:
        from datetime import datetime, timezone
        if hasattr(closes_at, "timestamp"):
            countdown = max(0, int(closes_at.replace(tzinfo=timezone.utc).timestamp() - datetime.now(timezone.utc).timestamp()))
        else:
            countdown = 420
    return {
        "id": row["id"],
        "externalId": row["external_id"],
        "type": row["type"],
        "title": row["title"],
        "closesAt": closes_at.isoformat() if hasattr(closes_at, "isoformat") else closes_at,
        "windowOpensAt": row.get("window_opens_at"),
        "resolutionKind": row.get("resolution_kind"),
        "closed": row.get("closed", False),
        "countdown": countdown,
        "options": [
            {
                "id": opt["external_id"],
                "externalId": opt["external_id"],
                "label": opt["label"],
                "price": float(opt["price"]),
            }
            for opt in row.get("options", [])
        ],
    }


@app.get("/api/matches/{match_id}/markets")
async def match_live_markets(match_id: str, live: bool = Query(True)):
    match = await db.get_match_by_id(match_id)
    if not match:
        return JSONResponse({"error": "Not found"}, status_code=404)
    if live:
        try:
            from app.services.live_markets import sync_live_markets_for_match
            await sync_live_markets_for_match(match["id"], match["external_id"], match.get("status", ""))
        except Exception:
            pass
        rows = await db.list_live_markets_for_match(match_id)
        return {"markets": [_serialize_live_market(r) for r in rows]}
    return {"markets": []}


@app.post("/api/predictions/build-tx")
async def predictions_build_tx(body: dict, request: Request):
    pubkey = _session_pubkey(request)
    if not pubkey:
        return JSONResponse({"error": "Connect wallet first"}, status_code=401)
    screening = await screen_wallet(pubkey, "deposit")
    if not screening.allowed:
        return JSONResponse({"error": screening.reason}, status_code=403)
    market_external_id = body.get("marketExternalId", "")
    amount = float(body.get("amount", 0))
    if not market_external_id or amount <= 0:
        return JSONResponse({"error": "Invalid request"}, status_code=400)
    market = await db.get_market_by_external_id(market_external_id)
    if not market:
        return JSONResponse({"error": "Market not found"}, status_code=404)
    if not is_market_bettable(
        market.get("type", ""),
        market.get("match_status", ""),
        market.get("closed", False),
        market.get("closes_at"),
        market.get("kickoff_at"),
    ):
        return JSONResponse({"error": "Market closed for predictions"}, status_code=400)
    built = await build_place_prediction_tx(pubkey, amount, market_external_id)
    if not built:
        return JSONResponse({"error": "Failed to build prediction transaction"}, status_code=500)
    return built


@app.post("/api/predictions/place")
async def predictions_place(body: dict, request: Request):
    pubkey = _session_pubkey(request)
    if not pubkey:
        return JSONResponse({"error": "Connect wallet first"}, status_code=401)
    screening = await screen_wallet(pubkey, "deposit")
    if not screening.allowed:
        return JSONResponse({"error": screening.reason}, status_code=403)
    market_external_id = body.get("marketExternalId", "")
    option_external_id = body.get("optionExternalId", "")
    amount = float(body.get("amount", 0))
    tx_signature = body.get("txSignature", "")
    escrow_pda = body.get("escrowPda")
    if not market_external_id or not option_external_id or not tx_signature or amount <= 0:
        return JSONResponse({"error": "Invalid request"}, status_code=400)
    if await db.prediction_tx_exists(tx_signature):
        return JSONResponse({"error": "Transaction signature already used"}, status_code=409)
    market = await db.get_market_by_external_id(market_external_id)
    if not market:
        return JSONResponse({"error": "Market not found"}, status_code=404)
    if not is_market_bettable(
        market.get("type", ""),
        market.get("match_status", ""),
        market.get("closed", False),
        market.get("closes_at"),
        market.get("kickoff_at"),
    ):
        return JSONResponse({"error": "Market closed for predictions"}, status_code=400)
    verification = await verify_place_prediction_tx(tx_signature, pubkey, market_external_id, amount)
    if not verification.get("ok"):
        return JSONResponse(
            {"error": f"Escrow verification failed: {verification.get('reason', 'unknown')}"},
            status_code=400,
        )
    user = await db.ensure_user(pubkey)
    if not user.get("id"):
        return JSONResponse({"error": "User not found"}, status_code=404)
    option = await db.get_market_option(market["id"], option_external_id)
    if not option:
        return JSONResponse({"error": "Outcome not found"}, status_code=404)
    import uuid
    external_id = f"pred_{uuid.uuid4().hex[:8]}"
    locked_amount = verification.get("amount", amount)
    created = await db.insert_usdc_prediction(
        {
            "external_id": external_id,
            "user_id": user["id"],
            "market_id": market["id"],
            "match_id": market["match_id"],
            "option_id": option["id"],
            "outcome_label": option["label"],
            "amount": locked_amount,
            "price": float(option["price"]),
            "escrow_pda": verification.get("escrowPda") or escrow_pda,
            "tx_signature": tx_signature,
        }
    )
    if not created:
        return JSONResponse({"error": "Failed to record prediction"}, status_code=500)
    return {
        "prediction": {
            "id": external_id,
            "marketId": market_external_id,
            "matchId": market.get("match_external_id"),
            "outcomeId": option_external_id,
            "outcomeLabel": option["label"],
            "amount": locked_amount,
            "price": float(option["price"]),
            "status": "open",
        }
    }


@app.get("/api/odds")
async def odds(matchId: str = Query(...)):
    match = await db.get_match_by_id(matchId)
    if not match:
        return JSONResponse({"error": "Not found"}, status_code=404)
    return {
        "matchId": matchId,
        "odds": _parse_json(match.get("odds"), {}),
        "history": _parse_json(match.get("odds_history"), []),
    }


@app.get("/api/signals")
async def signals(limit: int = 50, matchId: str | None = None):
    rows = await db.list_signals(limit=limit, match_id=matchId)
    return {
        "signals": [
            _serialize_signal(r, {"home_team": r.get("home_team"), "away_team": r.get("away_team"), "score_home": r.get("score_home"), "score_away": r.get("score_away")})
            for r in rows
        ]
    }


@app.get("/api/signals/{signal_id}")
async def signal_detail(signal_id: str):
    row = await db.get_signal(signal_id)
    if not row:
        return JSONResponse({"error": "Not found"}, status_code=404)
    return {"signal": _serialize_signal(row, row)}


@app.get("/api/predictions")
async def predictions(limit: int = 50):
    rows = await db.list_predictions(limit=limit)
    return {"predictions": rows}


@app.get("/api/predictions/latest-proof")
async def latest_proof():
    row = await db.get_latest_anchored_prediction()
    if not row:
        return {"predictionId": None}
    return {"predictionId": row.get("id"), "txHash": row.get("tx_hash"), "explorerUrl": row.get("explorer_url")}


@app.get("/api/predictions/{prediction_id}")
async def prediction_detail(prediction_id: str):
    row = await db.get_prediction(prediction_id)
    if not row:
        return JSONResponse({"error": "Not found"}, status_code=404)
    return {"prediction": row}


@app.get("/api/agents")
async def agents():
    return {"agents": await get_agents_leaderboard()}


@app.get("/api/signals/{signal_id}/decisions")
async def signal_decisions(signal_id: str):
    rows = await db.list_decisions_for_signal(signal_id)
    return {
        "decisions": [
            {
                "id": r.get("id"),
                "agentName": r.get("agent_name"),
                "displayName": r.get("display_name") or r.get("agent_name"),
                "ownerWallet": r.get("owner_wallet"),
                "action": r.get("action"),
                "stake": float(r.get("stake", 0)),
                "odds": float(r.get("odds", 0)),
                "outcome": r.get("outcome"),
                "headline": r.get("headline"),
                "createdAt": str(r.get("created_at", "")),
            }
            for r in rows
        ]
    }


@app.get("/api/agents/mine")
async def agents_mine(request: Request):
    pubkey = _session_pubkey(request)
    if not pubkey:
        return JSONResponse({"error": "Connect wallet first"}, status_code=401)
    rows = await db.get_agents_by_owner(pubkey)
    from app.blockchain.treasury import get_treasury_keypair, get_treasury_balance, address_explorer, TREASURY_MIN_USDC
    agents = []
    for agent in rows:
        balance = await get_treasury_balance(agent["name"])
        pubkey_t = str(get_treasury_keypair(agent["name"]).pubkey())
        await db.update_agent_treasury(agent["name"], pubkey_t, balance)
        agents.append({
            "name": agent["name"],
            "displayName": agent.get("display_name") or agent["name"],
            "strategy": agent["strategy"],
            "treasuryPubkey": pubkey_t,
            "treasuryBalance": balance,
            "treasuryExplorer": address_explorer(pubkey_t),
            "active": balance >= TREASURY_MIN_USDC,
            "minTreasury": TREASURY_MIN_USDC,
            "template": "alpha" if agent["name"].endswith("-alpha") else "beta",
        })
    return {"agents": agents}


@app.post("/api/agents/deploy")
async def deploy_agent(body: dict, request: Request):
    pubkey = _session_pubkey(request)
    if not pubkey:
        return JSONResponse({"error": "Connect wallet first"}, status_code=401)
    template = str(body.get("template", "alpha")).lower()
    display_name = body.get("displayName")
    try:
        agent = await db.create_user_agent(pubkey, template, display_name)
    except ValueError as e:
        return JSONResponse({"error": str(e)}, status_code=400)
    from app.blockchain.treasury import get_treasury_keypair, address_explorer
    kp = get_treasury_keypair(agent["name"])
    treasury_pubkey = str(kp.pubkey())
    await db.update_agent_treasury(agent["name"], treasury_pubkey, 0)
    from app.superfan.client import award_agent_deploy
    await award_agent_deploy(pubkey)
    return {
        "agent": {
            "name": agent["name"],
            "displayName": agent.get("display_name") or agent["name"],
            "strategy": agent["strategy"],
            "treasuryPubkey": treasury_pubkey,
            "treasuryExplorer": address_explorer(treasury_pubkey),
            "template": template,
        }
    }


@app.get("/api/agents/head-to-head")
async def agents_head_to_head(signalId: str | None = None):
    resolved_signal_id = signalId
    if not resolved_signal_id:
        rows = await db.list_signals(limit=1)
        if not rows:
            return {"signalId": None, "decisions": []}
        resolved_signal_id = rows[0]["id"]
    decisions = await db.list_decisions_for_signal(resolved_signal_id)
    return {
        "signalId": resolved_signal_id,
        "decisions": [
            {
                "agentName": d.get("agent_name"),
                "displayName": d.get("display_name") or d.get("agent_name"),
                "action": d.get("action"),
                "stake": float(d.get("stake", 0)),
                "odds": float(d.get("odds", 0)),
                "outcome": d.get("outcome"),
            }
            for d in decisions
        ],
    }


@app.get("/api/earn/opportunities")
async def earn_opportunities():
    """Map live matches and signals to agent-readable work opportunities."""
    live = await db.list_matches("live")
    signals = await db.list_signals(limit=10)
    opportunities = []
    for sig in signals:
        match = await db.get_match_by_id(sig["match_id"])
        if not match:
            continue
        opportunities.append({
            "type": "signal",
            "signalId": sig["id"],
            "matchId": sig["match_id"],
            "headline": sig.get("headline"),
            "confidence": float(sig.get("confidence", 0)),
            "prediction": sig.get("prediction"),
            "match": _serialize_match(match),
        })
    return {
        "liveMatches": [_serialize_match(m) for m in live[:10]],
        "opportunities": opportunities,
        "earnAgentId": settings.superteam_earn_agent_id or None,
        "claimUrl": (
            f"{settings.superteam_earn_base_url.rstrip('/')}/earn/claim/{settings.superteam_earn_claim_code}"
            if settings.superteam_earn_claim_code
            else None
        ),
    }


@app.post("/api/earn/link")
async def earn_link(body: dict, request: Request):
    pubkey = _session_pubkey(request)
    if not pubkey:
        return JSONResponse({"error": "Connect wallet first"}, status_code=401)
    agent_name = str(body.get("agentName", "")).strip()
    earn_agent_id = str(body.get("earnAgentId", "")).strip()
    if not agent_name or not earn_agent_id:
        return JSONResponse({"error": "agentName and earnAgentId required"}, status_code=400)
    agent = await db.get_agent_by_name(agent_name)
    if not agent or agent.get("owner_wallet") != pubkey:
        return JSONResponse({"error": "Agent not found or not owned"}, status_code=403)
    linked = await db.link_earn_agent(
        agent_name,
        earn_agent_id=earn_agent_id,
        earn_username=body.get("earnUsername"),
        callback_url=body.get("callbackUrl"),
    )
    return {"agent": {"name": linked["name"], "earnAgentId": linked.get("earn_agent_id"), "earnUsername": linked.get("earn_username")}}


@app.post("/api/agents/{name}/heartbeat")
async def agent_heartbeat(name: str, request: Request):
    from app.earn.auth import verify_agent_api_key

    if not verify_agent_api_key(request):
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    agent = await db.touch_agent_heartbeat(name)
    if not agent:
        return JSONResponse({"error": "Agent not found"}, status_code=404)
    return {
        "ok": True,
        "name": agent["name"],
        "lastHeartbeatAt": str(agent.get("last_heartbeat_at") or ""),
        "earnAgentId": agent.get("earn_agent_id"),
    }


@app.post("/api/agents/{name}/decisions")
async def agent_external_decision(name: str, body: dict, request: Request):
    from app.earn.auth import verify_agent_api_key

    if not verify_agent_api_key(request):
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    agent = await db.get_agent_by_name(name)
    if not agent:
        return JSONResponse({"error": "Agent not found"}, status_code=404)
    signal_id = str(body.get("signalId", "")).strip()
    action = str(body.get("action", "buy_home")).strip()
    stake = float(body.get("stake", 0))
    odds = float(body.get("odds", 1.68))
    if not signal_id or stake <= 0:
        return JSONResponse({"error": "signalId and positive stake required"}, status_code=400)
    signal = await db.get_signal(signal_id)
    if not signal:
        return JSONResponse({"error": "Signal not found"}, status_code=404)
    decision = await db.create_agent_decision({
        "agent_id": agent["id"],
        "signal_id": signal_id,
        "action": action,
        "stake": stake,
        "odds": odds,
    })
    total = int(agent.get("total_trades", 0)) + 1
    await db.update_agent_stats(
        agent["id"],
        balance=float(agent.get("balance", 10000)) - stake,
        wins=int(agent.get("wins", 0)),
        losses=int(agent.get("losses", 0)),
        total_trades=total,
        roi=float(agent.get("roi", 0)),
        risk_score=float(agent.get("risk_score", 0)),
    )
    return {
        "decision": {
            "id": decision.get("id"),
            "agentName": name,
            "signalId": signal_id,
            "action": action,
            "stake": stake,
            "odds": odds,
        }
    }


@app.post("/api/superfan/share")
async def superfan_share(body: dict, request: Request):
    pubkey = _session_pubkey(request)
    if not pubkey:
        return JSONResponse({"error": "Connect wallet first"}, status_code=401)
    from app.superfan.client import record_share
    result = await record_share(
        pubkey,
        str(body.get("channel", "copy")),
        str(body.get("contentType", "page")),
        str(body.get("contentId", "home")),
        str(body.get("url", "")),
    )
    return result


@app.get("/api/performance")
async def performance():
    return await get_performance()


def _session_pubkey(request: Request) -> str | None:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        return None
    return decode_session_token(token)


@app.get("/api/auth/nonce")
async def auth_nonce(pubkey: str = Query(...)):
    if not is_valid_solana_pubkey(pubkey):
        return JSONResponse({"error": "Invalid pubkey"}, status_code=400)
    nonce, message = create_nonce(pubkey)
    return {"nonce": nonce, "message": message}


@app.post("/api/auth/verify")
async def auth_verify(body: dict, response: Response):
    pubkey = body.get("pubkey", "")
    message = body.get("message", "")
    signature = body.get("signature", "")
    if not is_valid_solana_pubkey(pubkey):
        return JSONResponse({"error": "Invalid pubkey"}, status_code=400)
    if pubkey not in message:
        return JSONResponse({"error": "Message mismatch"}, status_code=400)
    message_domain = extract_domain_from_auth_message(message)
    if not is_allowed_auth_domain(message_domain, settings.app_url):
        return JSONResponse({"error": "Invalid auth domain — refresh and sign again"}, status_code=401)
    if not verify_auth(pubkey, message, signature):
        return JSONResponse({"error": "Invalid signature"}, status_code=401)
    screening = await screen_wallet(pubkey, "login")
    if not screening.allowed:
        return JSONResponse({"error": screening.reason}, status_code=403)
    token = create_session_token(pubkey)
    balance = await get_usdc_balance(pubkey)
    response.set_cookie(
        SESSION_COOKIE, token, httponly=True, samesite="lax",
        secure=settings.app_url.startswith("https"),
        max_age=7 * 24 * 3600,
    )
    return {"wallet": pubkey, "balance": balance}


@app.get("/api/auth/session")
async def auth_session(request: Request):
    pubkey = _session_pubkey(request)
    if not pubkey:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    balance = await get_usdc_balance(pubkey)
    return {"wallet": pubkey, "balance": balance}


@app.post("/api/auth/logout")
async def auth_logout(response: Response):
    response.delete_cookie(SESSION_COOKIE)
    return {"ok": True}


@app.post("/api/faucet/usdc")
async def faucet_usdc(request: Request):
    pubkey = _session_pubkey(request)
    if not pubkey:
        return JSONResponse({"error": "Connect wallet first"}, status_code=401)
    screening = await screen_wallet(pubkey, "faucet")
    if not screening.allowed:
        return JSONResponse({"error": screening.reason}, status_code=403)
    try:
        result = await drip_faucet(pubkey)
        return result
    except ValueError as e:
        return JSONResponse({"error": str(e)}, status_code=400)


@app.post("/api/agents/{name}/fund/build")
async def fund_agent_build(name: str, body: dict, request: Request):
    pubkey = _session_pubkey(request)
    if not pubkey:
        return JSONResponse({"error": "Connect wallet first"}, status_code=401)
    screening = await screen_wallet(pubkey, "deposit")
    if not screening.allowed:
        return JSONResponse({"error": screening.reason}, status_code=403)
    agent = await db.get_agent_by_name(name)
    if not agent:
        return JSONResponse({"error": "Agent not found"}, status_code=404)
    amount = float(body.get("amount", 50))
    try:
        return await build_fund_agent_tx(pubkey, name, amount)
    except ValueError as e:
        return JSONResponse({"error": str(e)}, status_code=400)
    except Exception as e:
        return JSONResponse({"error": f"Failed to build fund transaction: {e}"}, status_code=500)


@app.post("/api/agents/{name}/fund/confirm")
async def fund_agent_confirm(name: str, body: dict, request: Request):
    pubkey = _session_pubkey(request)
    if not pubkey:
        return JSONResponse({"error": "Connect wallet first"}, status_code=401)
    tx_sig = body.get("txSignature", "")
    if not tx_sig:
        return JSONResponse({"error": "txSignature required"}, status_code=400)
    amount = float(body.get("amount", 0))
    if amount < 10 or amount > 200:
        return JSONResponse({"error": "amount must be 10–200 USDC"}, status_code=400)
    agent = await db.get_agent_by_name(name)
    if not agent:
        return JSONResponse({"error": "Agent not found"}, status_code=404)
    verification = await verify_fund_agent_tx(tx_sig, pubkey, name, amount)
    if not verification.get("ok"):
        reason = verification.get("reason", "verification_failed")
        if reason == "transaction_not_found_or_failed":
            reason = "Transaction not recognized yet — wait a few seconds and try again"
        return JSONResponse({"error": reason}, status_code=400)
    balance = await get_treasury_balance(name)
    from app.blockchain.treasury import get_treasury_keypair, TREASURY_MIN_USDC
    treasury_pubkey = str(get_treasury_keypair(name).pubkey())
    await db.update_agent_treasury(name, treasury_pubkey, balance)
    return {
        "treasuryBalance": balance,
        "active": balance >= TREASURY_MIN_USDC,
        "explorerUrl": tx_explorer(tx_sig),
    }


@app.post("/api/certificates/{prediction_id}/build")
async def certificate_build(prediction_id: str, request: Request):
    pubkey = _session_pubkey(request)
    if not pubkey:
        return JSONResponse({"error": "Connect wallet first"}, status_code=401)
    pred = await db.get_prediction(prediction_id)
    if not pred:
        return JSONResponse({"error": "Not found"}, status_code=404)
    signal = await db.get_signal(pred["signal_id"])
    match = await db.get_match_by_id(pred["match_id"])
    memo = build_memo(signal or {}, match or {}, prediction_id)
    tx = await build_user_certificate_tx(pubkey, memo)
    return {"transaction": tx, "memo": memo}


@app.post("/api/certificates/{prediction_id}/submit")
async def certificate_submit(prediction_id: str, body: dict, request: Request):
    pubkey = _session_pubkey(request)
    if not pubkey:
        return JSONResponse({"error": "Connect wallet first"}, status_code=401)
    tx_sig = body.get("txSignature", "")
    if not tx_sig:
        return JSONResponse({"error": "txSignature required"}, status_code=400)
    ok = await verify_user_memo_tx(tx_sig, pubkey, "TxLINE AI Trader")
    if not ok:
        return JSONResponse({"error": "Verification failed"}, status_code=400)
    pred = await db.get_prediction(prediction_id)
    signal = await db.get_signal(pred["signal_id"]) if pred else None
    match = await db.get_match_by_id(pred["match_id"]) if pred else None
    memo = build_memo(signal or {}, match or {}, prediction_id)
    cert = await db.create_certificate({
        "prediction_id": prediction_id,
        "memo": memo,
        "tx_hash": tx_sig,
        "explorer_url": tx_explorer(tx_sig),
        "status": "anchored",
        "anchored_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc),
    })
    return {"certificate": cert}


@app.post("/api/chat")
async def chat(body: dict):
    session_id = body.get("sessionId", "default")
    message = body.get("message", "")
    if not message:
        return JSONResponse({"error": "message required"}, status_code=400)
    reply = await chat_response(session_id, message)
    return {"reply": reply, "sessionId": session_id}


@app.post("/api/chat/stream")
async def chat_stream_endpoint(body: dict):
    session_id = body.get("sessionId", "default")
    message = body.get("message", "")

    async def generate():
        async for chunk in chat_stream(session_id, message):
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await hub.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        await hub.disconnect(ws)


@app.post("/api/demo/trigger")
async def demo_trigger():
    await sync_fixtures()
    signals = await run_signal_cycle(broadcast=_broadcast)
    results = []
    for sig in signals:
        match = await db.get_match_by_id(sig["match_id"])
        if match:
            pred = await record_prediction(sig, match)
            cert = await anchor_prediction(pred, sig, match)
            await process_signal_for_agents(sig, broadcast=_broadcast)
            await update_portfolio_after_signal(sig, won=True)
            results.append({"signal": sig["id"], "prediction": pred["id"], "cert": cert.get("tx_hash")})
    return {"triggered": len(results), "results": results}
