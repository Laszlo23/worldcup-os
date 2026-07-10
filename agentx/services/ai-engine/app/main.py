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
from app.ingestion.worker import sync_fixtures, get_demo_tick, upsert_from_payload
from app.signals.engine import run_signal_cycle, _serialize_signal
from app.agents.strategies import process_signal_for_agents, get_agents_leaderboard
from app.agents.settlement import resolve_finished_matches
from app.simulation.portfolio import get_performance, record_prediction, update_portfolio_after_signal
from app.blockchain.memo import anchor_prediction, build_memo, build_user_certificate_tx, verify_user_memo_tx
from app.blockchain.faucet import drip_faucet, get_usdc_balance, build_fund_agent_tx
from app.blockchain.treasury import get_treasury_balance, address_explorer, explorer_url as tx_explorer
from app.auth.nonce_store import create_nonce
from app.auth.session import verify_auth, create_session_token, decode_session_token, SESSION_COOKIE
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
        "stadium": m.get("stadium"),
        "stage": m.get("stage"),
        "stats": _parse_json(m.get("stats"), {}),
        "odds": _parse_json(m.get("odds"), {}),
        "oddsHistory": _parse_json(m.get("odds_history"), m.get("oddsHistory", [])),
        "momentum": float(m.get("momentum", 50)),
        "winProbability": _parse_json(m.get("win_probability"), m.get("winProbability", {})),
    }


async def demo_ingest_loop() -> None:
    while True:
        try:
            live_ok = ingestion_state["scores_connected"] or ingestion_state["odds_connected"]
            use_demo = settings.demo_mode or not live_ok
            if use_demo:
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
            await sync_fixtures()
            await db.ensure_agents()
    except Exception:
        pass
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
    }


@app.get("/api/live-matches")
async def live_matches(status: str | None = None):
    if status:
        rows = await db.list_matches(status)
    else:
        rows = await db.list_matches()
    return {"matches": [_serialize_match(m) for m in rows]}


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


@app.get("/api/predictions/{prediction_id}")
async def prediction_detail(prediction_id: str):
    row = await db.get_prediction(prediction_id)
    if not row:
        return JSONResponse({"error": "Not found"}, status_code=404)
    return {"prediction": row}


@app.get("/api/agents")
async def agents():
    return {"agents": await get_agents_leaderboard()}


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
    nonce, message = create_nonce(pubkey)
    return {"nonce": nonce, "message": message}


@app.post("/api/auth/verify")
async def auth_verify(body: dict, response: Response):
    pubkey = body.get("pubkey", "")
    message = body.get("message", "")
    signature = body.get("signature", "")
    if not verify_auth(pubkey, message, signature):
        return JSONResponse({"error": "Invalid signature"}, status_code=401)
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
    amount = float(body.get("amount", 50))
    try:
        return await build_fund_agent_tx(pubkey, name, amount)
    except ValueError as e:
        return JSONResponse({"error": str(e)}, status_code=400)


@app.post("/api/agents/{name}/fund/confirm")
async def fund_agent_confirm(name: str, body: dict):
    tx_sig = body.get("txSignature", "")
    if not tx_sig:
        return JSONResponse({"error": "txSignature required"}, status_code=400)
    balance = await get_treasury_balance(name)
    from app.blockchain.treasury import get_treasury_keypair
    pubkey = str(get_treasury_keypair(name).pubkey())
    await db.update_agent_treasury(name.capitalize() if name.lower() in ("alpha", "beta") else name, pubkey, balance)
    return {"treasuryBalance": balance, "explorerUrl": tx_explorer(tx_sig)}


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
