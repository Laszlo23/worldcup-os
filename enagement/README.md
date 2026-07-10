# MatchMind AI

Real-time World Cup fan engagement powered by **TxLINE** live match data. Goal-triggered XP polls, on-chain moment collectibles, fan passport, and rewards — built for mobile.

**Track:** Consumer and Fan Experiences · [Superteam World Cup Hackathon](https://superteam.fun/earn/hackathon/world-cup)

**Live:** https://match.buildingcultureid.space · **Repo:** https://github.com/Laszlo23/matchmind-ai

## Core fan loop (not a sportsbook)

1. **Live match hub** — TxLINE scores + event feed
2. **Goal → XP poll** — 2-minute window, wallet vote
3. **Moments vault** — claim Solana memo collectible
4. **Fan passport** — XP, level, achievements
5. **Rewards** — redeem XP for merch/experience entries

> USDC prediction tab exists for devnet testing only. Primary submission story is **XP polls + moments**.

## Quick start

```bash
cd engagement
cp .env.example .env   # shares DATABASE_URL with World Cup OS
npm ci
npm run db:migrate
npm run dev
```

Requires **worldcup-worker** running (shared with World Cup OS) for live TxLINE SSE.

## Stack

| Layer | Tech |
|-------|------|
| UI | TanStack Start, mobile-first (480px) |
| API | Nitro (`engagement/server/api/`) |
| Shared engine | Parent `src/server/services/` via `@shared` alias |
| Auth | Solana wallet SIWS-style session |
| Chain | Solana devnet memo receipts for moments + stadium |

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [TXLINE.md](./TXLINE.md)
- [HACKATHON_DEMO.md](./HACKATHON_DEMO.md)
- [SUBMISSION.md](./SUBMISSION.md)
- [DEMO_VIDEO_SCRIPT.md](./DEMO_VIDEO_SCRIPT.md)

## Deploy

```bash
npm run deploy:prod
```

## Readiness

```bash
BASE_URL=https://match.buildingcultureid.space npm run test:hackathon-readiness
```

## Related

- **World Cup OS** (prediction markets): https://wmos.buildingcultureid.space
- Shared Postgres + `worldcup-worker` on same server
