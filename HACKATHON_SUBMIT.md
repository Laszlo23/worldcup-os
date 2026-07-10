# Superteam World Cup Hackathon — Submit All Three Tracks

**Deadline:** July 19, 2026 23:59 UTC  
**Form:** https://superteam.fun/earn/hackathon/world-cup

## Submissions overview

| Track | Product | Live URL | Submission doc | Demo video |
|-------|---------|----------|----------------|------------|
| Prediction Markets ($18k) | World Cup OS | https://wmos.buildingcultureid.space | [SUBMISSION.md](./SUBMISSION.md) | https://youtu.be/WNSlVMCMFxg |
| Trading Agents ($16k) | TxLINE AI Trader | https://agentx.buildingcultureid.space | [agentx/SUBMISSION.md](./agentx/SUBMISSION.md) | Record → paste URL |
| Fan Experiences ($16k) | MatchMind AI | https://match.buildingcultureid.space | [enagement/SUBMISSION.md](./enagement/SUBMISSION.md) | Record → paste URL |

## Before you submit (each track)

1. Run readiness audit:
   ```bash
   # World Cup OS
   BASE_URL=https://wmos.buildingcultureid.space npm run test:hackathon-readiness
   npm run verify:worker

   # TxLINE AI Trader
   cd agentx && BASE_URL=https://agentx.buildingcultureid.space npm run test:hackathon-readiness

   # MatchMind
   cd enagement && BASE_URL=https://match.buildingcultureid.space npm run test:hackathon-readiness
   ```

2. Record demo videos (≤5 min) using:
   - [DEMO_VIDEO_SCRIPT.md](./DEMO_VIDEO_SCRIPT.md) (World Cup OS — done)
   - [agentx/DEMO_VIDEO_SCRIPT.md](./agentx/DEMO_VIDEO_SCRIPT.md)
   - [enagement/DEMO_VIDEO_SCRIPT.md](./enagement/DEMO_VIDEO_SCRIPT.md)

3. Publish repos:
   ```bash
   bash scripts/publish-hackathon-repos.sh
   # Then push .publish/* to GitHub (see .publish/README.md)
   ```

4. Deploy latest code:
   ```bash
   npm run deploy:prod                    # World Cup OS + worker
   cd agentx && npm run deploy:prod       # AI Trader
   cd enagement && npm run deploy:prod   # MatchMind
   ```

## Required fields (all tracks)

- Demo video URL (**mandatory for screening**)
- Public GitHub repo
- Live app URL
- Technical documentation link
- TxLINE endpoint list + API feedback (copy from each `TXLINE.md`)

## Track positioning (tell judges clearly)

- **World Cup OS** — verifiable prediction markets + USDC escrow + stat-validation settlement
- **TxLINE AI Trader** — autonomous agents, no manual trading, Alpha vs Beta arena
- **MatchMind** — fan XP polls + moments; NOT a sportsbook (de-emphasize USDC tab)

## Post-submit

- Attach `hackathon-readiness-report.md` to demo video descriptions
- Post track-specific X threads with live links
- If a World Cup match finishes before July 19, append settlement demo to World Cup OS video
