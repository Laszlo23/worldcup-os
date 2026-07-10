# MatchMind AI — Hackathon Submission Pack

**Track:** Consumer and Fan Experiences ($16,000)  
**Live URL:** https://match.buildingcultureid.space

---

## Project Title

```
MatchMind AI — Real-Time World Cup Fan Engagement
```

## Briefly explain your Project

```
MatchMind turns TxLINE live World Cup data into a mobile fan game. When TxLINE reports a goal, fans get a 2-minute XP poll and a claimable moment collectible — wallet auth via Solana, no spreadsheet sweepstakes.

Core loop: Live match hub → vote on goal-triggered poll → claim on-chain moment → earn XP on Fan Passport → redeem rewards.

TxLINE powers every score update and goal event through our shared ingestion worker. Poll outcomes resolve from real match_events (goals/corners), not manual admin.

Demo video: REPLACE_WITH_YOUTUBE_URL
```

## Link to live MVP

```
https://match.buildingcultureid.space
```

Judge path: `/` → vote on poll → `/moments` claim → `/passport` → `/rewards`

## Demo Video

```
REPLACE_WITH_YOUTUBE_URL
```

See [DEMO_VIDEO_SCRIPT.md](./DEMO_VIDEO_SCRIPT.md). **Required for screening.**

## Public Repository

```
https://github.com/Laszlo23/matchmind-ai
```

## Technical Documentation

```
https://github.com/Laszlo23/matchmind-ai/blob/main/README.md
https://github.com/Laszlo23/matchmind-ai/blob/main/ARCHITECTURE.md
https://github.com/Laszlo23/matchmind-ai/blob/main/TXLINE.md
https://github.com/Laszlo23/matchmind-ai/blob/main/HACKATHON_DEMO.md
```

## TxLINE API feedback

```
What we liked most:
- Goal events are fast enough for in-the-moment fan polls during live matches
- Normalized score payload makes mobile UI updates trivial
- 104-match scale works without custom per-fixture code

Where we hit friction:
- Fan app needs shared worker — document "companion worker" pattern for multi-app setups
- Event type strings for corners/cards need a enum reference in World Cup docs
- Post-tournament review relies on demo video when SSE is quiet
```

## Pre-submission checklist

- [ ] Connect wallet on https://match.buildingcultureid.space
- [ ] Demo video uploaded (≤5 min)
- [ ] Repo public at github.com/Laszlo23/matchmind-ai
- [ ] `npm run test:hackathon-readiness` passes
- [ ] Submit at https://superteam.fun/earn/hackathon/world-cup
