# World Cup OS — TxLINE × Solana Hackathon

Prediction markets for World Cup fixtures, powered by **TxLINE SL12** live data and **Solana** USDC escrow.

## Quick start (demo mode — no API keys)

```bash
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173 — mock fixtures load automatically when `DATABASE_URL` is empty.

## Full stack

| Layer | Tech |
|-------|------|
| Frontend | TanStack Start + React |
| API | Nitro (`server/api/*`) |
| Database | Self-hosted Postgres (`npm run db:migrate`) |
| Live data | TxLINE SL12 (SSE + stat-validation) |
| Chain | `worldcup_os` Anchor program on Solana devnet |

```bash
npm run dev          # Vite + Nitro API (waits for API health)
npm run worker       # TxLINE SSE listener (needs API token)
npm run db:migrate   # Apply Postgres schema
npm run test         # Unit tests
npm run smoke        # Tests + API health smoke
```

## Solana / on-chain

Program built with Anchor 0.31. Program ID (devnet keypair):

```
Dr4SiPac8YoQbn6TgAeigEegCegjGTFtnEm3tjyiGqJ6
```

```bash
# Build + deploy (wallet needs ~1.8 SOL on devnet)
solana airdrop 2   # or use https://faucet.solana.com
npm run anchor:deploy
```

Set in `.env`:

```
WORLDCUP_PROGRAM_ID=Dr4SiPac8YoQbn6TgAeigEegCegjGTFtnEm3tjyiGqJ6
VITE_WORLDCUP_PROGRAM_ID=Dr4SiPac8YoQbn6TgAeigEegCegjGTFtnEm3tjyiGqJ6
SOLANA_NETWORK=devnet
USDC_MINT=ELWTKspHKCnCfCiCiqYw1EDH77k8VCP74dK9qytG2Ujh
```

**Prediction flow:** wallet signs SPL USDC transfer to escrow PDA → server verifies on-chain → Postgres records prediction.

**Without deployed program:** predictions use API mock mode (no on-chain tx required).

## TxLINE activation (when you have API access)

1. Set `ADMIN_WALLET_ALLOWLIST=<your-wallet-pubkey>` in `.env`
2. Connect wallet → subscribe on-chain to TxLINE SL12 via txoracle
3. `POST /api/txline/activate` with activation signature
4. Run `npm run worker` for live fixture sync

## Environment

See `.env.example`. Key variables:

- `DATABASE_URL` — Postgres (empty = mock mode)
- `TXLINE_API_TOKEN` / `TXLINE_GUEST_JWT` — live TxLINE feed
- `REQUIRE_LIVE_DATA=false` — allow mock fixtures for local demo
- `ADMIN_WALLET_ALLOWLIST` — wallets allowed to activate TxLINE

## Demo script

See [HACKATHON_DEMO.md](./HACKATHON_DEMO.md) for the 5-minute judge walkthrough.

## Documentation

| Doc | Purpose |
|-----|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, data flow, deployment |
| [TXLINE.md](./TXLINE.md) | TxLINE endpoints, auth, hackathon feedback |
| [SUBMISSION.md](./SUBMISSION.md) | Hackathon form copy-paste |
| [ONCHAIN_DEMO.md](./ONCHAIN_DEMO.md) | Predict → settle → claim on devnet |
| [DEPLOY.md](./DEPLOY.md) | Production deploy |

## Readiness audit

```bash
BASE_URL=https://wmos.buildingcultureid.space npm run test:hackathon-readiness
npm run verify:worker
```

Generates `hackathon-readiness-report.md` for judges.

## Live demo

**https://wmos.buildingcultureid.space**

| Route | Purpose |
|-------|---------|
| `/oracle` | Oracle Command Center (primary judge link) |
| `/replay` | 90-second match lifecycle demo |
| `/proofs` | Verified Match Certificates |
| `/tasks` | Community task board |

Deploy: [DEPLOY.md](./DEPLOY.md) · Hackathon form copy: [SUBMISSION.md](./SUBMISSION.md)

## GitHub

```bash
git init
git add .
git commit -m "World Cup OS hackathon submission"
gh repo create worldcup-os --public --source=. --push
```

## Architecture

```
Browser → Nitro API → Postgres
              ↓
         TxLINE SL12 (fixtures, scores, proofs)
              ↓
         Solana devnet (USDC escrow, settlement CPI → txoracle)
```
