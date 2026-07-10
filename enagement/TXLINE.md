# MatchMind AI — TxLINE Integration

MatchMind consumes TxLINE data **indirectly** through the shared World Cup OS worker (same Postgres).

## TxLINE endpoints (via shared pipeline)

| Endpoint | How MatchMind uses it |
|----------|----------------------|
| `GET /api/fixtures/snapshot` | Featured match selection |
| `GET /api/scores/stream` | Goal events → polls + moments |
| `GET /api/scores/snapshot/{id}` | Live scores on match hub |
| `GET /api/odds/stream` | Implied probabilities (optional display) |

MatchMind does not open its own SSE connection. The `worldcup-worker` process writes to shared tables.

## Goal → fan feature hook

`src/server/services/market-engine.ts` → `maybeOnGoalEngagement()`:
- Creates XP poll with TxLINE-derived `event_key` (goal seq)
- Creates moment collectible
- Resolves prior goal-window polls on new goal

## Health

```bash
curl -s https://match.buildingcultureid.space/api/health | jq '.worker'
```

## Hackathon feedback (fan track)

**Liked:**
- Goal events arrive fast enough for 2-minute prediction windows
- Same fixtureId lets us tie polls to live match cards instantly
- Mobile-friendly JSON payloads — no custom parsing per league

**Friction:**
- Requires separate worker process — fan app alone doesn't ingest TxLINE
- Poll resolution needed explicit match_events join (we fixed auto-yes bug)
- Corner event types vary — we infer from match_events.type

## Environment

Uses parent `.env` / World Cup OS deployment credentials. See `engagement/.env.example`.
