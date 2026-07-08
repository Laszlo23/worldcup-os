# World Cup OS — 5-Minute Judge Demo Script

Follow this script to verify the hackathon submission end-to-end.

## Prerequisites

1. Copy `.env.example` → `.env` and fill Postgres + TxLINE + Solana values (empty `DATABASE_URL` = mock mode).
2. Run migrations if using Postgres: `npm run db:migrate`.
3. Start app: **`npm run dev`** (starts Nitro API + Vite — required for wallet auth).
4. Open in a **top-level browser tab** at `http://localhost:5173` (not an embedded iframe — Phantom cannot inject in previews).
5. Optional: start SSE worker in a separate terminal: `npm run worker`

## Demo flow (≤ 5 minutes)

### 1. Landing Live Pulse (15s)
- Open `/`
- Confirm **Live Pulse** bar shows TxLINE network stats
- Read hero: *"The World's First Verifiable Sports Intelligence Network"*
- Click **Oracle Command Center** CTA

### 2. Oracle Command Center (45s)
- Go to `/oracle` (sidebar: **Oracle Command Center**)
- Confirm **TXLINE CONNECTED** or **DEGRADED** badge with SL12
- Watch scrolling event terminal (goals, odds, settlement)
- Point out pipeline viz: TxLINE → Events → Markets → Predictions → Solana → Settlement

### 3. Connect wallet (60s)
- Click **Connect Wallet** in header
- If no extension detected, follow inline help (top-level tab + Phantom install)
- Sign message when prompted — wallet stays connected on auth retry
- Confirm **Settings** shows **API reachable** / **Auth ready** chips

### 4. Replay match (90s)
- Go to `/replay` (sidebar: **Replay**)
- Pick preset: **Argentina vs Brazil** or **France vs Germany**
- Click **Start replay** — watch timeline steps light up
- Mock fallback runs automatically if TxLINE API unavailable
- When done, click through to Oracle + Proof Certificate links

### 5. Proof certificate (30s)
- Go to `/proofs`
- Show **Verified Match Certificate** with animated badge
- Copy Merkle root, open Solana Explorer link

### 6. Task board (30s)
- Go to `/tasks`
- Show featured task + filter pills (All / Easy / Community / Builder)
- Complete a task — points persist in localStorage

## API smoke checks

```bash
npm run smoke
```

Or manually:

```bash
curl -s localhost:5173/api/health | jq '.solana.programId'
curl -s 'localhost:5173/api/auth/nonce?pubkey=7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU' | jq .
curl -s localhost:5173/api/matches | jq '.matches | length'
curl -s localhost:5173/api/proofs | jq '.proofs | length'
```

## Wallet troubleshooting

| Symptom | Fix |
|---------|-----|
| "No wallet extension detected" | Open `localhost:5173` in Chrome/Firefox top-level tab |
| Connect then immediate disconnect | Use `npm run dev` not `dev:vite` alone |
| Auth failed toast | Click **Retry sign-in** — wallet stays connected |

## Worker cron (Vercel)

`vercel.json` calls `POST /api/workers/tick` every minute with header:

```
x-worker-secret: $WORKER_SECRET
```

For persistent TxLINE SSE, run `npm run worker` on Railway/Render.
