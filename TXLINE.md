# World Cup OS — TxLINE Integration

**API origin:** `https://txline.txodds.com` (production SL12 for hackathon)

Full docs: [TxLINE Quickstart](https://txline.txodds.com/documentation/quickstart) · [World Cup](https://txline.txodds.com/documentation/worldcup)

## Authentication

| Step | Endpoint | Implementation |
|------|----------|----------------|
| Guest session | `POST /auth/guest/start` | `src/server/services/txline/activation.ts` |
| Token activate | `POST /api/token/activate` | On-chain subscribe + wallet signature |
| API calls | Headers | `Authorization: Bearer <guestJwt>` + `X-Api-Token: <apiToken>` |

Credentials stored in Postgres via `src/server/services/txline/credentials.ts`.

## REST endpoints used

| Endpoint | Purpose |
|----------|---------|
| `GET /api/fixtures/snapshot` | Sync 104 World Cup fixtures into Postgres |
| `GET /api/scores/historical/{fixtureId}` | Backfill score timeline |
| `GET /api/scores/snapshot/{fixtureId}` | Point-in-time score when SSE quiet |
| `GET /api/scores/stat-validation?fixtureId=&seq=&statKey=` | Merkle proof for settlement |

## SSE streams (worker)

| Stream | URL | Handler |
|--------|-----|---------|
| Scores | `GET /api/scores/stream` | `processScoreUpdate()` → markets + engagement hooks |
| Odds | `GET /api/odds/stream` | `processOddsUpdate()` → implied probabilities |

Worker: `npm run worker` or PM2 `worldcup-worker`. Health: `GET /api/health` → `worker.lastSseAt`.

## On-chain validation (optional CPI)

Program `Dr4SiPac8YoQbn6TgAeigEegCegjGTFtnEm3tjyiGqJ6` exposes `settle_market` which CPIs into TxLINE txoracle `validate_stat`.

Proof parsing: `src/server/services/txline/validation.ts`

## Hackathon feedback (for submission form)

**What we liked:**
- Unified fixtureId across fixtures, scores, odds, and stat-validation
- Normalized JSON schema — one worker handles all 104 matches
- Cryptographic stat-validation maps cleanly to Verified Match Certificates

**Friction:**
- Activation requires admin wallet + on-chain subscribe bootstrap
- Persistent SSE needs dedicated worker process (cron tick alone insufficient)
- Full settle→claim demo must wait for real final whistle (we do not fake certs)

## Environment variables

```
TXLINE_API_ORIGIN=https://txline.txodds.com
TXLINE_GUEST_JWT=
TXLINE_API_TOKEN=
TXLINE_SERVICE_LEVEL=12
```

See `.env.example`.
