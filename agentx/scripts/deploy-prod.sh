#!/usr/bin/env bash
set -euo pipefail
HOST="${DEPLOY_HOST:-root@187.124.18.204}"
SSH_KEY="${DEPLOY_SSH_KEY:-$HOME/.ssh/id_ed25519_wgsdex}"
REMOTE_BASE="${DEPLOY_DIR:-/var/www/agentx-buildingculture}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$HOST" "mkdir -p $REMOTE_BASE"

rsync -az --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude .output \
  --exclude apps/web/.next \
  --exclude apps/web/node_modules \
  --exclude services/ai-engine/.venv \
  --exclude services/ai-engine/__pycache__ \
  --exclude .env \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new" \
  "$REPO/" "$HOST:$REMOTE_BASE/"

ssh -i "$SSH_KEY" "$HOST" "bash $REMOTE_BASE/scripts/patch-env.sh $REMOTE_BASE"

ssh -i "$SSH_KEY" "$HOST" "cd $REMOTE_BASE && rm -f apps/web/package-lock.json && npm ci && npm install @tailwindcss/oxide-linux-x64-gnu@4.3.2 lightningcss-linux-x64-gnu@1.32.0 -w web --save-optional && set -a && . ./.env && set +a && npx prisma generate && npx prisma db push --skip-generate"

ssh -i "$SSH_KEY" "$HOST" "cd $REMOTE_BASE/services/ai-engine && (python3.11 -m venv .venv 2>/dev/null || python3 -m venv .venv) && .venv/bin/pip install -q -r requirements.txt"

ssh -i "$SSH_KEY" "$HOST" "bash -s" <<'TREASURY'
set -euo pipefail
REMOTE_BASE="/var/www/agentx-buildingculture"
ENV_FILE="$REMOTE_BASE/.env"
PY="$REMOTE_BASE/services/ai-engine/.venv/bin/python"
for agent in ALPHA BETA; do
  key="AGENT_${agent}_TREASURY_SECRET"
  if ! grep -q "^${key}=" "$ENV_FILE"; then
    secret="$("$PY" "$REMOTE_BASE/scripts/gen-treasury-key.py")"
    echo "${key}=${secret}" >> "$ENV_FILE"
  fi
done
TREASURY

ssh -i "$SSH_KEY" "$HOST" "cd $REMOTE_BASE/apps/web && set -a && . ../../.env && set +a && npm run build"

ssh -i "$SSH_KEY" "$HOST" "cd $REMOTE_BASE && pm2 startOrRestart ecosystem.config.cjs && pm2 save"

ssh -i "$SSH_KEY" "$HOST" "PORT=3041 API_PORT=8041 bash $REMOTE_BASE/scripts/setup-ssl.sh"

echo "Deployed to https://agentx.buildingcultureid.space"
curl -s "https://agentx.buildingcultureid.space/api/health" | head -c 500 || true
echo ""
