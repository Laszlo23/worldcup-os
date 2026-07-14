# World Cup OS — Architecture

**Track:** Prediction Markets and Settlement · [Superteam World Cup Hackathon](https://superteam.fun/earn/hackathon/world-cup)

**Live:** https://wmos.buildingcultureid.space · **Judge entry:** `/oracle`

## System overview

```
TxLINE API (fixtures, scores SSE, odds SSE, stat-validation)
        │
        ▼
worldcup-worker (scripts/worker.ts) ──► Postgres
        │                                    │
        │                                    ├── matches, markets, predictions
        │                                    ├── match_events, live_events
        │                                    └── verified match certificates
        ▼
Nitro API (server/api/*) ◄──► TanStack Start UI (src/routes/*)
        │
        ▼
Solana devnet — worldcup_os Anchor program
  • initialize_market / place_prediction (USDC escrow)
  • settle_market (CPI to txoracle validate_stat)
  • claim (winner payout)
```

## Components

| Layer | Path | Role |
|-------|------|------|
| Frontend | `src/routes/` | Oracle UI, markets, portfolio, proofs, replay |
| API | `server/api/` | Auth, predictions, proofs, health, cron tick |
| Worker | `scripts/worker.ts` | Persistent TxLINE SSE + settlement jobs |
| TxLINE client | `src/server/services/txline/` | REST + SSE + stat-validation parsing |
| Settlement | `src/server/services/settlement.ts` | Honest gate — certs only after real FT |
| On-chain | `programs/worldcup_os/` | USDC escrow PDAs on devnet |
| Database | `supabase/migrations/` | Postgres schema |

## Data flow — prediction lifecycle

1. **Fixture sync** — worker pulls `GET /api/fixtures/snapshot`, upserts `matches`.
2. **Live updates** — SSE scores/odds update match state; goals create `live_events`.
3. **Market open** — winner markets auto-created per fixture.
4. **User predicts** — wallet signs SPL USDC → escrow PDA; server verifies on-chain.
5. **Final whistle** — TxLINE GameState → worker fetches `GET /api/scores/stat-validation`.
6. **Certificate** — Merkle proof stored; Oracle shows Verified Match Certificate.
7. **Settlement** — markets resolve; winners claim USDC from settlement pool.

## Deployment

| Process | PM2 name | Port |
|---------|----------|------|
| Web + API | `worldcup-os` | 3017 |
| TxLINE worker | `worldcup-worker` | — |

See [DEPLOY.md](./DEPLOY.md) and `ecosystem.config.cjs`.

## Related projects (separate hackathon tracks)

- **TxLINE AI Trader** — `agentx/` → https://agentx.buildingcultureid.space
- **MatchMind AI** — `engagement/` → https://match.buildingcultureid.space

Shared Postgres + `worldcup-worker` for World Cup OS and MatchMind only.

## Superteam Earn agents

See [EARN_AGENTS.md](./EARN_AGENTS.md). Operational agent CLI (`npm run earn:*`) discovers bounties and monitors health. AgentX exposes `/api/earn/opportunities` and external agent routes. Superfan ledger awards `agent_deploy` and `agent_win` points across apps.
