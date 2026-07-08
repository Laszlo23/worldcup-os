# World Cup OS — 5-Minute Judge Demo Script

Follow this script to verify the hackathon submission end-to-end.

## Prerequisites

1. Copy `.env.example` → `.env` and fill Postgres + TxLINE + Solana values.
2. Run migrations: `npm run db:migrate`.
3. Activate TxLINE SL12: on-chain `subscribe(12)` → `POST /api/txline/activate` with admin wallet.
4. Start app: `npm run dev`
5. Start SSE worker (separate terminal): `npm run worker`

## Demo flow (≤ 5 minutes)

### 1. TxLINE connection (30s)
- Open **Settings** or **Dashboard**
- Confirm health banner shows **TxLINE Healthy** and **SL12**
- `/api/health` returns `txline.status: healthy`

### 2. Live match (60s)
- Go to **Matches**
- Pick a live World Cup fixture from TxLINE sync
- Watch score/minute update from SSE worker

### 3. Place prediction (60s)
- Connect **Phantom** wallet
- Open match → pick market outcome → enter USDC amount
- Sign escrow transaction (build-tx → wallet sign → place API)
- Open Solana Explorer link from portfolio transaction

### 4. Market close (15s)
- Show market auto-closes before kickoff (worker `closeExpiredMarkets`)

### 5. Settlement + proof (60s)
- After final whistle, worker enqueues settlement
- Open **Proof Explorer** or match **SettlementCard**
- Verify real Merkle root from `GET /api/scores/stat-validation`

### 6. On-chain verify (30s)
- Click Solana Explorer link on settlement tx
- Confirm `worldcup_os.settle_market` CPI to txoracle

### 7. Claim (30s)
- Winner opens **Portfolio** → claims USDC
- Show Explorer tx for claim transfer

### 8. Replay mode (90s)
- Go to `/replay`
- Enter fixture ID → **Start replay**
- Full lifecycle completes; settlement job queued automatically

## API smoke checks

```bash
curl -s localhost:5173/api/health | jq .
curl -s localhost:5173/api/matches | jq '.matches | length'
curl -s localhost:5173/api/proofs | jq '.proofs | length'
```

## Worker cron (Vercel)

`vercel.json` calls `POST /api/workers/tick` every minute with header:

```
x-worker-secret: $WORKER_SECRET
```

For persistent TxLINE SSE, run `npm run worker` on Railway/Render.
