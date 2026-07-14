# TxLINE AI Trader — Hackathon Submission Pack

**Track:** Trading Tools and Agents ($16,000)  
**Live URL:** https://agentx.buildingcultureid.space

---

## Project Title

```
TxLINE AI Trader — Autonomous Agent Arena
```

## Briefly explain your Project

```
TxLINE AI Trader is a fully autonomous sports intelligence platform for the World Cup hackathon. It ingests TxLINE live scores and odds SSE, generates AI trading signals every 60 seconds, and runs two competing agents — Alpha (home momentum) and Beta (contrarian away) — without manual intervention.

Stack: TxLINE SSE → FastAPI engine → Postgres → WebSocket → Next.js UI. Solana devnet treasuries fund agents; high-confidence signals anchor on-chain Memo certificates.

Try it: Home → Matches → Signals → Arena (Alpha vs Beta) → Proof (Solana cert).

Demo video: REPLACE_WITH_YOUTUBE_URL

Superteam Earn: External agents discover opportunities via GET /api/earn/opportunities, submit decisions with API key auth, and link Earn agent IDs for payout claim. See ../EARN_AGENTS.md.
```

## Link to live MVP

```
https://agentx.buildingcultureid.space
```

Judge path: Home → `/matches` → `/signals` → `/arena` → `/proof/[id]`

## Demo Video

```
REPLACE_WITH_YOUTUBE_URL
```

Record using [DEMO_VIDEO_SCRIPT.md](./DEMO_VIDEO_SCRIPT.md). **Required for screening.**

## Public Repository

```
https://github.com/Laszlo23/txline-ai-trader
```

## Technical Documentation

```
https://github.com/Laszlo23/txline-ai-trader/blob/main/README.md
https://github.com/Laszlo23/txline-ai-trader/blob/main/ARCHITECTURE.md
https://github.com/Laszlo23/txline-ai-trader/blob/main/TXLINE.md
https://github.com/Laszlo23/txline-ai-trader/blob/main/HACKATHON_DEMO.md
```

## TxLINE API feedback

```
What we liked most:
- Normalized odds + scores schema lets one worker feed both signal math and agent decisions
- 60-second odds deltas are granular enough for sharp-movement detection
- Fixture snapshot gives agents context before SSE attaches

Where we hit friction:
- SSE requires both Bearer JWT and X-Api-Token — document both in quickstart
- txline-dev vs production origin caused 401 until we standardized on txline.txodds.com
- Judges reviewing after tournament need demo video — live SSE may be quiet
```

## Pre-submission checklist

- [ ] `curl -s https://agentx.buildingcultureid.space/api/health` → `liveIngestion: true`
- [ ] Demo video uploaded (≤5 min)
- [ ] Repo public at github.com/Laszlo23/txline-ai-trader
- [ ] `npm run test:hackathon-readiness` passes
- [ ] Submit at https://superteam.fun/earn/hackathon/world-cup
