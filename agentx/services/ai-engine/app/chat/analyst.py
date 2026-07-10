import json
from typing import AsyncGenerator

from app import repository as db
from app.config import settings


SYSTEM_PROMPT = """You are TxLINE AI Analyst — a professional sports data intelligence assistant.
You provide analytics, market intelligence, and explainable AI insights for research purposes.
You NEVER encourage gambling or betting. Frame all outputs as data research and strategy testing.
Always cite specific data from the provided context. Be concise and institutional in tone."""


async def _build_context() -> str:
    signals = await db.list_signals(limit=5)
    try:
        from app.agents.strategies import get_agents_leaderboard
        agents = await get_agents_leaderboard()
    except Exception:
        agents = []

    ctx = {"topSignals": [], "agents": []}
    for s in signals:
        ht = s.get("home_team", {})
        at = s.get("away_team", {})
        if isinstance(ht, str):
            ht = json.loads(ht)
        if isinstance(at, str):
            at = json.loads(at)
        ctx["topSignals"].append({
            "headline": s.get("headline"),
            "confidence": float(s.get("confidence", 0)),
            "match": f"{ht.get('name', '?')} vs {at.get('name', '?')}",
        })
    for a in agents[:2]:
        ctx["agents"].append({"name": a.get("name"), "roi": a.get("roi"), "winRate": a.get("winRate")})
    return json.dumps(ctx, indent=2)


async def chat_response(session_id: str, message: str) -> str:
    context = await _build_context()
    await db.save_chat_message(session_id, "user", message)

    if settings.openai_api_key:
        reply = await _openai_chat(message, context)
    elif settings.anthropic_api_key:
        reply = await _anthropic_chat(message, context)
    else:
        reply = _fallback_reply(message, context)

    await db.save_chat_message(session_id, "assistant", reply, {"context": context})
    return reply


async def chat_stream(session_id: str, message: str) -> AsyncGenerator[str, None]:
    reply = await chat_response(session_id, message)
    words = reply.split(" ")
    chunk = ""
    for i, word in enumerate(words):
        chunk += word + " "
        if i % 3 == 2 or i == len(words) - 1:
            yield chunk
            chunk = ""


async def _openai_chat(message: str, context: str) -> str:
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    r = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {message}"},
        ],
        max_tokens=500,
    )
    return r.choices[0].message.content or ""


async def _anthropic_chat(message: str, context: str) -> str:
    from anthropic import AsyncAnthropic
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    r = await client.messages.create(
        model="claude-3-5-haiku-latest",
        max_tokens=500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": f"Context:\n{context}\n\nQuestion: {message}"}],
    )
    return r.content[0].text if r.content else ""


def _fallback_reply(message: str, context: str) -> str:
    lower = message.lower()
    if "brazil" in lower or "why" in lower:
        return (
            "The AI selected Brazil based on four converging TxLINE data signals:\n\n"
            "1. Odds shortened 12.4% in the last 60 seconds — indicating sharp market movement\n"
            "2. Possession increased to 63% with 14 shots vs 8\n"
            "3. Attack pressure rated HIGH with momentum at 78%\n"
            "4. Historical model shows 62% next-goal probability in similar match states\n\n"
            "This is a research signal, not betting advice. Confidence: 82%."
        )
    if "strongest" in lower or "signal" in lower:
        return (
            "Today's strongest signals from TxLINE data:\n\n"
            "• Brazil to score next — 82% confidence (BULLISH, HIGH IMPACT)\n"
            "• Argentina match — elevated volatility, 68% draw probability shift\n"
            "• Spain vs Germany — pre-match odds divergence detected\n\n"
            "All signals include full explainable reasoning in the Signals tab."
        )
    if "unusual" in lower or "movement" in lower:
        return (
            "Unusual market movements detected:\n\n"
            "• Brazil home odds: 1.92 → 1.68 (-12.4%) in 5 minutes — above 2σ threshold\n"
            "• France away odds drifted +26% — defensive fatigue pattern\n\n"
            "These movements triggered the autonomous signal engine at 71'."
        )
    return (
        f"Based on live TxLINE data: {context[:200]}...\n\n"
        "Ask me to explain any signal, show strongest picks, or analyze market movements."
    )
