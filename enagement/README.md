# MatchMind AI

> Watch the match. Lock the call. Claim the night.

Mobile-first fan layer for the World Cup OS stack — live TxLINE fixtures, 7-minute XP polls with **on-chain Solana memos**, goal collectables, Crew chat, and a passport that remembers every terrace win.

**Hackathon track:** Consumer & Fan Experiences · [Superteam World Cup](https://superteam.fun/earn/hackathon/world-cup)

| | |
|---|---|
| **Live** | https://match.buildingcultureid.space |
| **Monorepo** | https://github.com/Laszlo23/worldcup-os |
| **Network** | Solana **devnet** (test USDC · no real-world value) |

---

## Fan loop

```text
Live Hub  →  Polls (XP / USDC)  →  My picks
   │                │                  │
   │                ├─ sign memo       ├─ history
   │                └─ claim drops     └─ claim USDC wins
   ▼
Passport · Crew · Collectables · Mine
```

1. **Live** — score, video feel, TxLINE flashes  
2. **Polls** — free XP windows + optional USDC escrow before kickoff  
3. **My picks** — every vote & position in one place (`/predict` → **My picks**, also on Profile)  
4. **Drops** — goal moments → Solana memo claim → album  
5. **Passport** — XP, stats, wallet desk, referrals  

---

## Where are my predictions?

Fans kept asking — so it’s front and centre:

| Surface | Path |
|---------|------|
| **My picks tab** | `/predict` → third tab |
| **Profile** | `/passport` → My picks panel |
| **Match Desk** | Attack zone → “My picks” |

API:

- `GET /api/engagement/polls/mine` — XP poll votes (+ explorer links)  
- `GET /api/predictions/mine` — USDC positions  
- `POST /api/predictions/claim` — payout won markets  

---

## Quick start

```bash
cd enagement
cp .env.example .env   # share DATABASE_URL with World Cup OS
npm ci
npm run db:migrate
npm run dev
```

Needs **worldcup-worker** (shared with WMOS) for live TxLINE SSE.

```bash
# Production deploy
npm run deploy:prod

# Readiness
BASE_URL=https://match.buildingcultureid.space npm run test:hackathon-readiness
```

---

## Stack

| Layer | Tech |
|-------|------|
| UI | TanStack Start · mobile shell (≤480px) |
| API | Nitro under `enagement/server/api/` |
| Engine | Parent `src/server/*` via `@shared` |
| Auth | SIWS-style session cookie |
| Chain | Solana memos (polls / moments / stadium) · USDC escrow markets |

---

## On-chain proof (devnet)

| Action | Proof |
|--------|--------|
| XP poll vote | Memo `matchmind:poll:{id}:{choice}:{wallet}` |
| Goal drop claim | Memo `matchmind:moment:{id}:{wallet}` |
| Stadium check-in | Memo `matchmind:stadium:{matchId}:…` |
| USDC place | SPL transfer into market escrow ATA |
| USDC claim | Settlement pool → user ATA |

Memo program is resolved at runtime (Solana 4.x beta clusters expose Memo1 when MemoSq4 is absent).

---

## Docs in-app

- **FAQ** — `/faq`  
- **Docs** — `/docs`  
- Deeper write-ups: [ARCHITECTURE.md](./ARCHITECTURE.md) · [TXLINE.md](./TXLINE.md) · [HACKATHON_DEMO.md](./HACKATHON_DEMO.md) · [SUBMISSION.md](./SUBMISSION.md)

---

## Related apps

| App | URL |
|-----|-----|
| World Cup OS (trust / markets) | https://wmos.buildingcultureid.space |
| AgentX (AI trader) | https://agentx.buildingcultureid.space |

Shared Postgres + `worldcup-worker` on the same host.

---

## License / demo note

Hackathon demo on **Solana devnet**. Faucet USDC and sponsored fees are for showcase only — not mainnet funds.
