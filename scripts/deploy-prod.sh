#!/usr/bin/env bash
# Deploy to production without overwriting server .env (secrets + DATABASE_URL).
set -euo pipefail
HOST="${DEPLOY_HOST:-root@187.124.18.204}"
SSH_KEY="${DEPLOY_SSH_KEY:-$HOME/.ssh/id_ed25519_wgsdex}"
REMOTE_DIR="${DEPLOY_DIR:-/var/www/wmos-buildingculture}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

rsync -az --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude target \
  --exclude .output \
  --exclude .env \
  --exclude agentx \
  --exclude enagement \
  --exclude .publish \
  --exclude '**/.next' \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new" \
  "$ROOT/" "$HOST:$REMOTE_DIR/"

ssh -i "$SSH_KEY" "$HOST" "cd $REMOTE_DIR && npm ci && npm run build && pm2 startOrRestart ecosystem.config.cjs && pm2 save && pm2 status worldcup-worker"

ssh -i "$SSH_KEY" "$HOST" "cd $REMOTE_DIR && node scripts/verify-worker-health.mjs || true"

echo "Deployed to https://wmos.buildingcultureid.space"
