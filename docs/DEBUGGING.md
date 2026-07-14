# Debugging Runbook

Operational guide for World Cup OS, MatchMind, and AgentX on the hackathon demo stack.

## Quick health checks

```bash
# WMOS production
curl -s https://wmos.buildingcultureid.space/api/health | jq .

# MatchMind
curl -s https://match.buildingcultureid.space/api/health | jq .

# AgentX engine
curl -s https://agentx.buildingcultureid.space/api/health | jq .
```

Key fields:

| Field | Healthy signal |
|-------|----------------|
| `status` | `"ok"` |
| `worker.healthy` | `true` (fixture sync + SSE connect within threshold) |
| `txline.lastSseAt` | Recent ISO timestamp (touches on SSE connect even when idle) |
| `txline.lastPingOk` | `true` |

Local readiness:

```bash
npm run security:audit
BASE_URL=https://wmos.buildingcultureid.space npm run test:hackathon-readiness
npm run earn:readiness
```

## Worker restart (production)

SSH to deploy host, then:

```bash
pm2 restart worldcup-worker
pm2 logs worldcup-worker --lines 50
```

Worker runs TxLINE fixture sync and SSE score/odds streams. If `lastSseAt` is null, check TxLINE credentials:

```bash
npm run bootstrap:txline   # local; writes TXLINE_GUEST_JWT to .env
```

Devnet requires **service level 1** (`TXLINE_SERVICE_LEVEL=1`).

## TxLINE stream down

1. Verify env: `TXLINE_GUEST_JWT`, `TXLINE_API_TOKEN`, `TXLINE_SERVICE_LEVEL=1` on devnet.
2. Run `npm run bootstrap:txline` to refresh guest JWT.
3. Restart worker: `pm2 restart worldcup-worker`.
4. Confirm `GET /api/health` → `txline.lastPingOk` and `lastSseAt`.

## Prediction errors

### `transaction_not_found_or_failed`

Wallet sent the USDC transfer before devnet RPC indexed it. Client now waits for confirmation; server retries `getParsedTransaction` up to 8×.

If still failing:

- Retry after 10s
- Check explorer link from wallet
- Verify USDC mint matches devnet faucet mint

### `InitializeMarket` insufficient lamports

Settlement authority wallet needs SOL for rent and tx fees:

```bash
npm run fund:sol -- --target settlement
# or on server with production .env loaded
npx tsx scripts/fund-sol.ts
```

### Markets closed

Markets lock **5 minutes before kickoff**. Pick an upcoming fixture.

## Devnet USDC faucet

Users need devnet USDC in wallet before predicting:

- In-app faucet button (devnet only)
- API: `POST /api/faucet/usdc` (session required, rate limited)

## Earn agent routes 404

Earn proxy routes ship with the main WMOS deploy. After deploy:

```bash
curl -s https://wmos.buildingcultureid.space/api/earn/listings | jq .
npm run earn:readiness
```

AgentX Earn: `GET /api/earn/opportunities` on agentx host.

## Security probes

Protected endpoints must return 401/403 without secrets:

- `POST /api/workers/tick` — requires `WORKER_SECRET`
- `POST /api/superfan/internal/award` — requires internal secret
- `GET /api/admin` — requires admin session
- `POST /api/replay/settle` — locked in production

Run `npm run security:audit` for automated report → `security-audit-report.md`.

## Logs

```bash
# PM2 on production server
pm2 logs worldcup-app --lines 100
pm2 logs worldcup-worker --lines 100
```

Common worker messages:

- `fixturesSynced: N` — fixture poll OK
- `InitializeMarket` errors — fund settlement authority SOL
- SSE reconnect loops — TxLINE credential or network issue

## Deploy checklist

```bash
npm run lint && npm run test && npm run build
npm run deploy:prod          # WMOS
# MatchMind + AgentX per scripts/deploy-prod.sh
pm2 restart worldcup-worker
```

Smoke test:

1. `/legal/terms` and `/legal/privacy` load on all three apps
2. Partner footer shows Solana, TxLINE, Superteam Earn logos
3. Place a small devnet prediction and confirm portfolio row
