# Demo Video Script — World Cup OS (≈5 minutes)

**Record with:** Loom or YouTube (unlisted is fine)  
**URL:** https://wmos.buildingcultureid.space (top-level Chrome tab, Phantom installed)  
**Title:** World Cup OS — 5-Min TxLINE × Solana Demo

---

## Setup before recording

- [ ] Site is live (not 503): `curl -s https://wmos.buildingcultureid.space/api/health`
- [ ] Browser zoom 125%, hide bookmarks bar
- [ ] Phantom wallet on devnet with a small balance (optional for predictions)
- [ ] Close unrelated tabs; enable mic

---

## Scene-by-scene

| Time | Scene | Action | Say (approx.) |
|------|-------|--------|---------------|
| **0:00–0:30** | Landing | Open `/`, point at Live Pulse bar and hero | "World Cup OS is the trust layer for global sports intelligence — powered by TxLINE and settled on Solana." |
| **0:30–1:30** | Oracle | Click **Oracle Command Center**, show badges (CONNECTED/DEGRADED, SL12), scroll events, point at pipeline | "This is our Oracle Command Center — live TxLINE events flow through markets, predictions, Solana escrow, and settlement." |
| **1:30–2:30** | Wallet | Click **Connect Wallet**, sign message, open **Settings**, show API/Auth chips | "Wallet auth uses message signing — if auth fails, we keep the wallet connected and retry. Settings confirms the API is reachable." |
| **2:30–4:00** | Replay | Go to `/replay`, pick **Argentina vs Brazil**, **Start replay**, watch timeline | "Replay mode runs a full match lifecycle in 90 seconds — kickoff to proof to settlement. Mock fallback works without live World Cup fixtures." |
| **4:00–4:45** | Proofs | Go to `/proofs`, show certificate, copy Merkle root, click Solana explorer | "Every settled match gets a verified certificate — Merkle root from TxLINE stat-validation plus on-chain settlement proof." |
| **4:45–5:00** | Close | Show `/tasks` or GitHub repo tab | "Repo is open source on GitHub. Try the Oracle at wmos.buildingcultureid.space/oracle. Thanks!" |

---

## If TxLINE shows DEGRADED

Say: *"We're in demo mode with mock events — the same pipeline runs against live TxLINE SL12 when credentials and the SSE worker are active."*

---

## After recording

1. Upload to Loom or YouTube
2. Set visibility to **Anyone with the link**
3. Paste URL into [SUBMISSION.md](./SUBMISSION.md) demo video field
4. Optional: embed link in README
