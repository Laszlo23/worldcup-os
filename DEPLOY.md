# Deploy World Cup OS to wmos.buildingcultureid.space

Production URL: **https://wmos.buildingcultureid.space**

## Quick deploy (Docker)

```bash
# On your server (after DNS A/CNAME points to the host)
git clone https://github.com/Laszlo23/worldcup-os.git
cd worldcup-os
cp .env.example .env
# Edit .env — set at minimum:
#   VITE_APP_URL=https://wmos.buildingcultureid.space
#   SESSION_SECRET=<random-32-chars>
#   WORKER_SECRET=<random-32-chars>
#   WORLDCUP_PROGRAM_ID=Dr4SiPac8YoQbn6TgAeigEegCegjGTFtnEm3tjyiGqJ6
#   VITE_WORLDCUP_PROGRAM_ID=Dr4SiPac8YoQbn6TgAeigEegCegjGTFtnEm3tjyiGqJ6
#   SOLANA_NETWORK=devnet
#   DATABASE_URL=   (empty = mock demo mode)

docker build -t worldcup-os .
docker run -d --name worldcup-os -p 3000:3000 --env-file .env worldcup-os
```

Put **Caddy** or **nginx** in front with TLS:

```nginx
server {
  listen 443 ssl;
  server_name wmos.buildingcultureid.space;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## Node deploy (no Docker)

```bash
npm ci
npm run build
export WORKER_SECRET=$(openssl rand -hex 16)
export SESSION_SECRET=$(openssl rand -hex 16)
export REQUIRE_LIVE_DATA=false
export VITE_APP_URL=https://wmos.buildingcultureid.space
npm run start:hackathon
# App on :5173 — proxy nginx to port 5173
```

**API-only** (health checks, no SSR pages):

```bash
PORT=3000 node .output/server/index.mjs
```

## Environment (hackathon demo)

| Variable | Value |
|----------|-------|
| `REQUIRE_LIVE_DATA` | `false` |
| `WORKER_SECRET` | random string (not `dev-worker-secret`) |
| `SESSION_SECRET` | random string (not `dev-session-secret`) |
| `VITE_APP_URL` | `https://wmos.buildingcultureid.space` |
| `WORLDCUP_PROGRAM_ID` | `Dr4SiPac8YoQbn6TgAeigEegCegjGTFtnEm3tjyiGqJ6` |
| `DATABASE_URL` | empty = mock mode |

## Vercel

```bash
vercel login
NITRO_PRESET=vercel npm run build
vercel --prod
# Add custom domain: wmos.buildingcultureid.space in Vercel dashboard
```

Set environment variables in Vercel project settings (same as `.env.example`).

## Post-deploy smoke test

```bash
curl -s https://wmos.buildingcultureid.space/api/health | jq .
curl -sI https://wmos.buildingcultureid.space/oracle | head -5
```

Open in a **top-level browser tab** (not iframe):
- `/` — Live Pulse
- `/oracle` — Command Center
- Connect Phantom wallet

## DNS checklist

| Record | Value |
|--------|-------|
| `wmos.buildingcultureid.space` | A → server IP, or CNAME → hosting provider |

If you see **503**, the reverse proxy is up but the Node app is not running or not reachable on port 3000.
