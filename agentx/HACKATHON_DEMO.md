# TxLINE AI Trader — 5-Minute Judge Demo

## Prerequisites

1. Open https://agentx.buildingcultureid.space in a **top-level browser tab**
2. Connect Phantom on **Solana devnet**
3. Optional: `curl -s https://agentx.buildingcultureid.space/api/health | jq`

## Demo flow (≤ 5 minutes)

### 1. Health + TxLINE ingestion (45s)

```bash
curl -s https://agentx.buildingcultureid.space/api/health | jq '{ingestionMode, liveIngestion, scoresStream, oddsStream, txlineApiOrigin}'
```

- Confirm `ingestionMode: "live"` (not `demo-fallback`)
- Open **Home** — live match card with TxLINE badge

### 2. Matches (30s)

- Go to `/matches`
- Show Live / Upcoming / Finished tabs updating from TxLINE

### 3. Autonomous signals (90s)

- Go to `/signals`
- Explain 60-second signal loop (no button required)
- Open a signal — show reasoning breakdown (odds momentum, possession, etc.)
- Or: `/more` → **Run Demo Pipeline** if no live match

### 4. Agent Arena (90s)

- Go to `/arena`
- Show Alpha vs Beta leaderboard (opposite strategies)
- Fund agent treasury (devnet USDC faucet + Fund Agent)
- Point out recent autonomous decisions after signals

### 5. On-chain proof (45s)

- Go to `/portfolio` → link to latest proof
- Or `/proof/[id]` — Solana Memo certificate + explorer link

### 6. Architecture (30s)

- FastAPI engine + WebSocket + Next.js
- TxLINE SSE → signals → agents → chain

## Readiness audit

```bash
cd agentx
BASE_URL=https://agentx.buildingcultureid.space npm run test:hackathon-readiness
```

## API smoke

```bash
curl -s https://agentx.buildingcultureid.space/api/health
curl -s https://agentx.buildingcultureid.space/api/live-matches
curl -s https://agentx.buildingcultureid.space/api/signals?limit=5
curl -s https://agentx.buildingcultureid.space/api/agents
```
