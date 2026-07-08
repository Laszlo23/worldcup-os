# World Cup Track — Hackathon Submission Pack

Copy each field below into the hackathon form. Live URL: **https://wmos.buildingcultureid.space**

---

## Link to your Submission (primary)

```
https://wmos.buildingcultureid.space/oracle
```

---

## Project Title

```
World Cup OS — The Trust Layer for Global Sports Intelligence
```

---

## Briefly explain your Project

```
World Cup OS is a verifiable sports intelligence network that turns TxLINE SL12 live match data into transparent prediction markets settled on Solana.

What we built: An Oracle Command Center that streams TxLINE events (goals, odds, settlement) through a full data pipeline; non-custodial USDC escrow via an Anchor program; cryptographically verifiable Match Certificates (Merkle roots + Solana tx proofs); 90-second Replay Mode for judge demos; and wallet-authenticated predictions with automatic settlement after final whistle.

Stack: TxLINE SSE + stat-validation → Nitro API → Postgres → Solana devnet escrow. Demo-safe mock fallbacks when live TxLINE credentials are unavailable.

Try it: /oracle → Connect wallet → /replay → /proofs → /tasks
```

---

## Link to your live & working MVP

```
https://wmos.buildingcultureid.space
```

Judge path: Landing → Oracle → Replay → Proofs → Tasks ([HACKATHON_DEMO.md](./HACKATHON_DEMO.md)).

---

## Link to Your Live Demo Video

```
[PASTE LOOM OR YOUTUBE URL AFTER RECORDING — see DEMO_VIDEO_SCRIPT.md]
```

Suggested title: *World Cup OS — 5-Min TxLINE × Solana Demo*

---

## Project's Public Repository Link

```
https://github.com/Laszlo23/worldcup-os
```

---

## Link to your Project's Technical Documentation

```
https://github.com/Laszlo23/worldcup-os/blob/main/README.md
```

Additional: https://github.com/Laszlo23/worldcup-os/blob/main/HACKATHON_DEMO.md

---

## Tweet Link

```
[PASTE TWEET URL AFTER POSTING — see X_POST_DRAFT.md]
```

---

## Link to your Project's X Profile or X post

```
[PASTE SAME TWEET URL OR @handle PROFILE URL]
```

---

## Share your team's experience using the TxLINE API

```
What we liked most:
- SL12 SSE stream — sub-second score/event updates map cleanly to our Oracle Command Center terminal; the event log makes the TxLINE integration immediately visible to judges.
- stat-validation endpoint — Merkle root + signature fit naturally into our Verified Match Certificate flow and Solana settlement pipeline.
- Fixture-centric model — fixtureId as the join key between replay, markets, and proofs kept the architecture simple.

Where we hit friction:
- Activation flow — on-chain subscribe(12) + POST /api/txline/activate requires admin wallet setup; multi-step bootstrap documented in README.
- SSE worker hosting — persistent stream needs a long-running process (npm run worker); Vercel cron alone is not enough for live SSE.
- Devnet deploy — Anchor program built but devnet deploy needs ~1.8 SOL; predictions work in API mock mode without on-chain tx for demo.
- Embedded previews — wallet extensions (Phantom) cannot inject in iframes; we added diagnostics and require top-level browser tab.
```

---

## Anything Else?

```
Demo script: https://github.com/Laszlo23/worldcup-os/blob/main/HACKATHON_DEMO.md
Deploy guide: https://github.com/Laszlo23/worldcup-os/blob/main/DEPLOY.md
Program ID (devnet): Dr4SiPac8YoQbn6TgAeigEegCegjGTFtnEm3tjyiGqJ6
Health check: https://wmos.buildingcultureid.space/api/health
Oracle Command Center: https://wmos.buildingcultureid.space/oracle

On-chain program is built; full on-chain settlement requires devnet deploy + SOL. Mock/demo mode is intentional for hackathon judging.
```

---

## Submission order

1. Deploy to wmos.buildingcultureid.space ([DEPLOY.md](./DEPLOY.md))
2. Record demo video ([DEMO_VIDEO_SCRIPT.md](./DEMO_VIDEO_SCRIPT.md))
3. Post on X ([X_POST_DRAFT.md](./X_POST_DRAFT.md))
4. Paste fields above into the World Cup Track form
5. Submit (repeat for other tracks if eligible)
