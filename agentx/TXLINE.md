# TxLINE AI Trader — TxLINE Integration

**API origin:** `https://txline.txodds.com`

## Authentication

Both headers required for SSE (matches World Cup OS):

```
Authorization: Bearer <TXLINE_GUEST_JWT>
X-Api-Token: <TXLINE_API_TOKEN>
```

Implementation: `services/ai-engine/app/ingestion/txline_client.py`

## Endpoints used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/fixtures/snapshot` | GET | Sync World Cup fixtures on boot + every 60s |
| `/api/scores/stream` | SSE | Live score updates → match state + goals |
| `/api/odds/stream` | SSE | Live odds → momentum + signal engine |
| `/api/scores/snapshot/{fixtureId}` | GET | Available for point-in-time backfill |

## Signal engine inputs from TxLINE

- Odds history deltas (35% weight)
- Attack stats / shots (25%)
- Possession (20%)
- Match minute + score state patterns (20%)

## Hackathon feedback

**Liked:**
- Single schema for scores and odds — easy to join in one `matches` row
- SSE streams stay connected with standard HTTP headers
- Fixture snapshot bootstraps agent context before streams attach

**Friction:**
- Dev vs prod origin mismatch caused 401 until we aligned on `txline.txodds.com`
- Both JWT and API token required — not obvious from quickstart alone
- Post-deadline review needs demo video since live matches may be over

## Environment

```
TXLINE_API_ORIGIN=https://txline.txodds.com
TXLINE_GUEST_JWT=
TXLINE_API_TOKEN=
DEMO_MODE=false
```

When credentials missing, `DEMO_MODE=true` runs Brazil–France simulated ticks.
