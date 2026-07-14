# Superteam Earn Agent Integration

This stack integrates with [Superteam Earn for Agents](https://superteam.fun/earn/agents). Agents discover bounties, submit work, and hand off payouts to a human operator via claim codes.

**Official docs:** [skill.md](https://superteam.fun/skill.md) · [heartbeat.md](https://superteam.fun/heartbeat.md)

## Architecture

```
Superteam Earn API
       │
       ├── scripts/earn-agent.mjs (discover, heartbeat, submit, readiness)
       ├── src/server/services/earn/client.ts (TypeScript SDK)
       └── server/api/earn/listings.get.ts (proxy, keeps API key server-side)

AgentX engine
       ├── GET  /api/earn/opportunities — live matches + signals as work items
       ├── POST /api/earn/link — wallet links Earn agent ID to deployed agent
       ├── POST /api/agents/{name}/heartbeat — external liveness (Bearer API key)
       └── POST /api/agents/{name}/decisions — external agent submits trades

World Cup OS worker
       └── npm run worker — TxLINE SSE listener (loads .env automatically)
```

## Environment

Add to root `.env` (see `.env.example`):

```bash
SUPERTEAM_EARN_BASE_URL=https://superteam.fun
SUPERTEAM_EARN_API_KEY=sk_...
SUPERTEAM_EARN_CLAIM_CODE=...
SUPERTEAM_EARN_AGENT_ID=...
AGENTX_API_KEY=...          # inbound auth for AgentX external agent routes
```

AgentX `.env` can mirror `SUPERTEAM_EARN_*` and `AGENTX_API_KEY`.

## CLI commands

```bash
npm run earn:discover      # list agent-eligible bounties
npm run earn:heartbeat     # health check wmos + agentx + matchmind
npm run earn:readiness     # run hackathon readiness on all three apps
npm run earn:submit        # submit to open-innovation-track-agents (set SUPERTEAM_EARN_TELEGRAM)
npm run worker             # start TxLINE SSE listener + worker tick
```

### Submit example

```bash
SUPERTEAM_EARN_TELEGRAM=http://t.me/your_username npm run earn:submit
# or with explicit slug:
node scripts/earn-agent.mjs submit open-innovation-track-agents http://t.me/your_username
```

## Human claim flow

After the agent wins a bounty:

1. Visit `https://superteam.fun/earn/claim/<SUPERTEAM_EARN_CLAIM_CODE>`
2. Sign in and complete talent profile
3. Confirm agent link — submissions transfer for payout eligibility

## TxLINE worker

The dev server (`npm run dev`) does **not** start the SSE worker. Run in a separate terminal:

```bash
npm run worker
```

Health: `GET /api/health` → `worker.healthy` and `txline.lastSseAt`.

## World Cup hackathon

The World Cup hackathon form is **human-only** — use [HACKATHON_SUBMIT.md](./HACKATHON_SUBMIT.md). Mention Earn integration in submission copy; do not use the agent submission API for that listing.

## Superfan points bridge

When an AgentX agent decision wins after match settlement:

- `agent_win` → `POST /api/superfan/internal/award` on World Cup OS (50 pts, idempotent per decision)
- `agent_deploy` → 100 pts on wallet deploy (existing)

## 8004 Trustless Agent Registry

On-chain agent identity and reputation via [`8004-solana`](https://github.com/QuantuLabs/8004-solana-ts).

```
AGENT_8004_ASSET=...              # agent NFT pubkey from npm run trust8004:register
# Feedback signer: SOLANA_DEPLOYER_SECRET (default — no separate secret needed)
```

### Commands

```bash
npm run trust8004:register        # register agent on devnet (deployer pays)
npx tsx scripts/airdrop-deployer.ts  # fund deployer if faucet allows
npm run trust8004:heartbeat:dry   # preview uptime feedback payload
npm run trust8004:heartbeat       # post uptime + reachability to 8004
npm run earn:heartbeat            # Earn health + auto 8004 feedback when AGENT_8004_ASSET is set
```

### API

`GET /api/trust8004/reputation?asset=<pubkey>` — trust tier, scores, liveness (indexer-backed).

AgentX arena shows **8004** trust badges when `NEXT_PUBLIC_AGENT_8004_ASSET` is set in AgentX web env.

