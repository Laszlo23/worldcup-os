# TxLINE AI Trader — Architecture

## Overview

```
TxLINE (fixtures + scores SSE + odds SSE)
        │
        ▼
FastAPI ai-engine (:8041)
  ├── stream_runner.py   persistent SSE with reconnect
  ├── worker.py          normalize → Postgres matches
  ├── signals/engine.py  60s autonomous signal cycle
  ├── agents/strategies  Alpha (buy_home) vs Beta (buy_away)
  ├── agents/settlement  resolve decisions at full time
  └── blockchain/memo    Solana prediction certificates
        │
        ├── Postgres (matches, signals, agents, decisions)
        └── WebSocket /ws → Next.js UI (:3041)
```

## Autonomous loops (no manual input)

| Loop | Interval | File |
|------|----------|------|
| Score/odds SSE | continuous | `ingestion/stream_runner.py` |
| Demo fallback | 10s (if SSE down + DEMO_MODE) | `main.py` demo_ingest_loop |
| Signal generation | 60s | `main.py` signal_loop |
| Agent decisions | per signal | `agents/strategies.py` |
| Outcome settlement | 60s | `agents/settlement.py` |
| Fixture sync | 60s | `ingestion/worker.sync_fixtures` |

## Agent arena

| Agent | Strategy | Action | Threshold |
|-------|----------|--------|-----------|
| Alpha | Conservative momentum | `buy_home` | confidence ≥ 75% |
| Beta | Contrarian fade | `buy_away` | confidence ≥ 60% |

Treasury: per-agent SPL USDC ATA on devnet. Min 10 USDC to trade.

## Database (Prisma)

Key models: `Match`, `Signal`, `Prediction`, `Agent`, `AgentDecision`, `OnChainCertificate`, `PortfolioSnapshot`.

## Deployment

PM2 `ecosystem.config.cjs`:
- `agentx-web` → port 3041
- `agentx-engine` → port 8041

nginx routes `/api/` and `/ws` to engine, `/` to web.

See `scripts/deploy-prod.sh`.
