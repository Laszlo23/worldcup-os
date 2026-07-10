# MatchMind AI — Architecture

## System overview

```
TxLINE SSE (worldcup-worker on wmos server)
        │
        ▼
market-engine.processScoreUpdate()
        │
        ├── on goal → engagement-polls.maybeOnGoalEngagement()
        │              ├── createPoll (XP, 2-min window)
        │              └── createMoment (collectible)
        │
        └── Postgres (shared with World Cup OS)
                │
                ▼
MatchMind Nitro API (engagement/server/api/)
                │
                ▼
TanStack Start UI (engagement/src/routes/)
```

## Routes

| Path | Feature |
|------|---------|
| `/` | Live match hub, TxLINE feed |
| `/predict` | XP polls (+ optional devnet USDC tab) |
| `/moments` | Moments vault |
| `/passport` | Fan XP + achievements |
| `/rewards` | XP reward catalog |
| `/stadium` | Stadium attendance memo proof |

## Poll resolution (TxLINE-driven)

Polls store `resolution_kind`:
- `goal_in_window` — resolved yes if goal in match_events during window
- `goal_before_ht` — goal before minute 45
- `hold_lead` — resolved at full time based on score
- `corner_in_window` — corner event in window

Worker calls `syncEngagementPolls()` every 30s. Goals immediately resolve open goal-window polls.

## Real-time UX

Client polls every 6–10s via TanStack Query (`LiveProvider`). Toast on new goals from `/api/stream/events`.

## Coupling note

MatchMind imports shared server code via `nitro.config.ts` → `@shared` → `../src`. For standalone repo publish, run `scripts/publish-hackathon-repos.sh`.

## Deployment

PM2 `matchmind-os` on port 3031. SSL: `match.buildingcultureid.space`.
