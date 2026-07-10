# MatchMind AI — 5-Minute Judge Demo

## Prerequisites

1. Open https://match.buildingcultureid.space on **mobile width** or phone
2. Connect Solana wallet (devnet)
3. Best during **live World Cup match** (goal triggers poll)

## Demo flow (≤ 5 minutes)

### 1. Live match hub (60s)

- Open `/`
- Show TxLINE-powered score + live event feed
- Point out polling updates every ~6 seconds

### 2. Goal → poll (90s)

- When goal arrives: new XP poll appears (2-min countdown)
- Tap **Yes/No**, sign with wallet
- Explain: outcome resolves from TxLINE goal events in window

If no live goal: note replay on World Cup OS `/replay` seeds shared DB events.

### 3. Moments vault (60s)

- Go to `/moments`
- Claim a goal moment → Solana memo transaction
- Show explorer link

### 4. Fan passport (60s)

- `/passport` — XP, level, achievements
- Show prediction win streak after poll resolves

### 5. Rewards (45s)

- `/rewards` — redeem XP for jersey raffle / VIP entry
- Optional: `/stadium` attendance proof

### 6. Architecture (30s)

- TxLINE worker → goal hook → fan UI
- Not a sportsbook — XP engagement loop

## Do NOT lead with

- USDC escrow tab on `/predict` (World Cup OS track overlap)
- Oracle / settlement UI (different product)

## Readiness

```bash
cd engagement
BASE_URL=https://match.buildingcultureid.space npm run test:hackathon-readiness
```

## API smoke

```bash
curl -s https://match.buildingcultureid.space/api/health | jq '.worker'
curl -s https://match.buildingcultureid.space/api/engagement/featured
curl -s https://match.buildingcultureid.space/api/engagement/polls
curl -s https://match.buildingcultureid.space/api/stream/events
```
