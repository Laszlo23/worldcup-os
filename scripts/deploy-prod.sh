#!/usr/bin/env bash
# Deploy to production without overwriting server .env (secrets + DATABASE_URL).
set -euo pipefail
HOST="${DEPLOY_HOST:-root@187.124.18.204}"
SSH_KEY="${DEPLOY_SSH_KEY:-$HOME/.ssh/id_ed25519_wgsdex}"
REMOTE_DIR="${DEPLOY_DIR:-/var/www/wmos-buildingculture}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "[deploy] Building production bundle locally..."
cd "$ROOT"
NODE_ENV=production npm run build

echo "[deploy] Syncing source + .output to server..."
# Keep previously hashed /assets so cached tabs can still load connect-wallet after deploy.
rsync -az --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude target \
  --exclude .env \
  --exclude agentx \
  --exclude enagement \
  --exclude .publish \
  --exclude '**/.next' \
  --exclude '.output/public/assets/' \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new" \
  "$ROOT/" "$HOST:$REMOTE_DIR/"

if [ -d "$ROOT/.output/public/assets" ]; then
  echo "[deploy] Merging hashed assets (no delete)..."
  rsync -az \
    -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new" \
    "$ROOT/.output/public/assets/" "$HOST:$REMOTE_DIR/.output/public/assets/"
fi

echo "[deploy] Installing runtime deps + migrating DB + restarting PM2..."
ssh -i "$SSH_KEY" "$HOST" "cd $REMOTE_DIR && chmod 755 . .output .output/public .output/public/assets 2>/dev/null || true; chmod 600 .env 2>/dev/null || true; set -a && [ -f ./.env ] && . ./.env; set +a && npm ci --omit=dev && npm run db:migrate && pm2 startOrRestart ecosystem.config.cjs && pm2 save && pm2 status worldcup-os worldcup-worker"

ssh -i "$SSH_KEY" "$HOST" "cd $REMOTE_DIR && node scripts/verify-worker-health.mjs || true"

echo "[deploy] Smoke check..."
curl -sf "https://wmos.buildingcultureid.space/api/health" | head -c 120 || true
echo ""
curl -sfI "https://wmos.buildingcultureid.space/" | head -3 || true

echo "Deployed to https://wmos.buildingcultureid.space"
