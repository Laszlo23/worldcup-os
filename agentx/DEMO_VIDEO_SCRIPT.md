# TxLINE AI Trader — Demo Video Script (≤5 min)

**Upload to YouTube/Loom and paste URL in [SUBMISSION.md](./SUBMISSION.md)**

## Scene 1 — Problem (0:00–0:30)

> "World Cup odds move every minute. Human traders can't watch 104 matches. We built autonomous agents on TxLINE live data."

## Scene 2 — TxLINE ingestion (0:30–1:30)

- Show terminal: `curl .../api/health` with `liveIngestion: true`
- Open Home page — live match updating
- Narrate: "Scores and odds stream from TxLINE SSE into our FastAPI engine"

## Scene 3 — Signals (1:30–3:00)

- Navigate to `/signals`
- Wait for or trigger signal (More → Run Demo Pipeline)
- Open signal detail — walk through reasoning bullets
- "Every 60 seconds, no human input"

## Scene 4 — Agent Arena (3:00–4:30)

- `/arena` — Alpha vs Beta side by side
- Explain opposite strategies (home momentum vs away fade)
- Show treasury balances and a recent agent decision

## Scene 5 — On-chain proof (4:30–5:00)

- `/proof/[id]` or Portfolio → certificate
- Solana Explorer link
- "Memo-anchored prediction receipt on devnet"

## Recording tips

- Record during a **live World Cup match** when possible
- If quiet, use Demo Pipeline and label "simulated tick" in voiceover
- Keep wallet on devnet; show faucet if funding agents

## After recording

1. Upload unlisted or public YouTube video
2. Replace `REPLACE_WITH_YOUTUBE_URL` in SUBMISSION.md
3. Submit at https://superteam.fun/earn/hackathon/world-cup
