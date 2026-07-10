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
World Cup OS is a verifiable sports intelligence network that turns TxLINE live World Cup fixtures into transparent prediction markets with Solana devnet USDC escrow.

What we built: An Oracle Command Center wired to TxLINE (fixtures + stat-validation); wallet-authenticated predictions with on-chain escrow (verified place-prediction txs on devnet); automatic settlement after final whistle via TxLINE stat-validation → Verified Match Certificate → market resolution → claim. Settlement and certificates activate only when a fixture has actually finished on TxLINE — we do not simulate verified settlement on upcoming matches.

Stack: TxLINE API + worker → Nitro API → Postgres → Solana devnet (program Dr4SiPac8YoQbn6TgAeigEegCegjGTFtnEm3tjyiGqJ6).

Try it: /oracle → Connect wallet (devnet) → place prediction → /proofs (on-chain escrow proofs). After a real final whistle: worker settles → certificate appears → Portfolio claim.

Demo video: https://youtu.be/WNSlVMCMFxg
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
https://youtu.be/WNSlVMCMFxg
```

**Pre-submission checklist:**
- [x] `curl -s https://wmos.buildingcultureid.space/api/health` → status ok
- [x] `/oracle` — TxLINE connected, live event stream
- [x] Wallet auth + on-chain predictions (escrow txs on `/proofs`)
- [x] Demo video recorded → https://youtu.be/WNSlVMCMFxg
- [ ] Post on X ([X_POST_DRAFT.md](./X_POST_DRAFT.md)) — paste tweet URL below
- [ ] **Settlement + Match Certificate** — waits until a real World Cup fixture finishes on TxLINE (worker auto-settles; no fake certs on scheduled matches)

Suggested title: *World Cup OS — TxLINE × Solana Prediction Markets Demo*

---

## Project's Public Repository Link

```
https://github.com/Laszlo23/worldcup-os
```

---

## Link to your Project's Technical Documentation

```
https://github.com/Laszlo23/worldcup-os/blob/main/README.md
https://github.com/Laszlo23/worldcup-os/blob/main/ARCHITECTURE.md
https://github.com/Laszlo23/worldcup-os/blob/main/TXLINE.md
```

Additional: https://github.com/Laszlo23/worldcup-os/blob/main/HACKATHON_DEMO.md

---

## Tweet Link

```
https://x.com/bihary41418/status/2075094898345115713
```

Posted thread: [@bihary41418](https://x.com/bihary41418/status/2075094898345115713). If Superteam X verification fails, paste this URL manually in the form and add the same link under **Anything Else?** / demo video notes.

---

## Link to your Project's X Profile or X post

```
https://x.com/bihary41418/status/2075094898345115713
```

Profile: https://x.com/bihary41418

---

## Share your team's experience using the TxLINE API

```
What we liked most:
- Fixture sync + stat-validation — fixtureId joins markets, predictions, and settlement; Merkle root + signature map cleanly to Verified Match Certificates after final whistle.
- Event pipeline — goals and prediction escrow events surface in the Oracle Command Center so TxLINE integration is visible to judges.
- Honest settlement gate — we only issue verified certificates when TxLINE reports the fixture finished (GameState), not on scheduled matches.

Where we hit friction:
- Activation flow — on-chain subscribe + bootstrap requires admin wallet; devnet uses SL1 (SL12 invalid on-chain for our program).
- SSE worker hosting — persistent stream needs `worldcup-worker` on the server; cron alone is not enough.
- Settlement timing — full settle → certificate → claim demo must wait for a real match to end; video shows predict + escrow proofs; post-whistle flow is automated when fixtures finish.
- Embedded previews — Phantom cannot inject in iframes; open the app in a top-level browser tab.
```

---

## Anything Else?

```
Demo video: https://youtu.be/WNSlVMCMFxg
X post: https://x.com/bihary41418/status/2075094898345115713
X profile: https://x.com/bihary41418
Demo script: https://github.com/Laszlo23/worldcup-os/blob/main/HACKATHON_DEMO.md
Readiness audit: npm run test:hackathon-readiness (see hackathon-readiness-report.md)
Program ID (devnet): Dr4SiPac8YoQbn6TgAeigEegCegjGTFtnEm3tjyiGqJ6
Health: https://wmos.buildingcultureid.space/api/health
Oracle: https://wmos.buildingcultureid.space/oracle
Proof explorer: https://wmos.buildingcultureid.space/proofs

Settlement note: Verified Match Certificates and claims appear automatically after a fixture finishes on TxLINE. Until then, judges can verify on-chain prediction escrow txs in /proofs.
Explorer (program): https://explorer.solana.com/address/Dr4SiPac8YoQbn6TgAeigEegCegjGTFtnEm3tjyiGqJ6?cluster=devnet
```

---

## Submission order

1. Deploy to wmos.buildingcultureid.space ([DEPLOY.md](./DEPLOY.md)) — done
2. Demo video — https://youtu.be/WNSlVMCMFxg — done
3. Post on X — https://x.com/bihary41418/status/2075094898345115713 — done
4. Paste fields above into the World Cup Track form
5. Submit (repeat for other tracks if eligible)
6. After first real final whistle: settlement + certificate auto-runs via worker (no manual fake settle)
