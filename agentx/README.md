# TxLINE AI Trader

Autonomous trading agents powered by **TxLINE** live World Cup odds and scores. Alpha vs Beta arena with Solana devnet treasury vaults and on-chain prediction certificates.

**Track:** Trading Tools and Agents · [Superteam World Cup Hackathon](https://superteam.fun/earn/hackathon/world-cup)

**Live:** https://agentx.buildingcultureid.space · **Repo:** https://github.com/Laszlo23/txline-ai-trader

## What it does

- Ingests TxLINE fixtures + scores/odds SSE every second
- Generates AI signals every 60 seconds (odds momentum, attack pressure, possession)
- **Alpha** backs home momentum; **Beta** takes contrarian away positions
- Auto-settles agent decisions when matches finish
- Anchors high-confidence predictions on Solana Memo program
- Real-time WebSocket feed to mobile-first Next.js UI

## Quick start

```bash
cd agentx
docker compose up -d
cp .env.example .env   # add TXLINE_GUEST_JWT + TXLINE_API_TOKEN
npm ci && cd apps/web && npm ci && cd ../..
cd services/ai-engine && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && cd ../..
npx prisma db push
ALLOW_DEMO_SEED=true npm run db:seed

# Terminal 1
cd services/ai-engine && .venv/bin/uvicorn app.main:app --reload --port 8041
# Terminal 2
cd apps/web && npm run dev -- -p 3041
```

Demo pipeline: `npm run demo:run`

## Stack

| Layer | Tech |
|-------|------|
| Web | Next.js 15, TanStack Query, Solana wallet adapter |
| Engine | FastAPI, asyncio, WebSocket hub |
| DB | Postgres + Prisma |
| Chain | Solana devnet — Memo certs, SPL USDC treasuries |

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — system design
- [TXLINE.md](./TXLINE.md) — endpoints used
- [HACKATHON_DEMO.md](./HACKATHON_DEMO.md) — judge walkthrough
- [SUBMISSION.md](./SUBMISSION.md) — hackathon form fields
- [DEMO_VIDEO_SCRIPT.md](./DEMO_VIDEO_SCRIPT.md) — 5-min recording script

## Deploy

```bash
DEPLOY_HOST=root@your-server npm run deploy:prod
```

## Readiness

```bash
BASE_URL=https://agentx.buildingcultureid.space npm run test:hackathon-readiness
```

## Health check

```bash
curl -s https://agentx.buildingcultureid.space/api/health | jq
```

Expect `ingestionMode: "live"` and `liveIngestion: true` when TxLINE SSE is connected.
