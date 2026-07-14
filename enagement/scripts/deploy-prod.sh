#!/usr/bin/env bash
set -euo pipefail
HOST="${DEPLOY_HOST:-root@187.124.18.204}"
SSH_KEY="${DEPLOY_SSH_KEY:-$HOME/.ssh/id_ed25519_wgsdex}"
REMOTE_BASE="${DEPLOY_DIR:-/var/www/match-buildingculture}"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$HOST" "mkdir -p $REMOTE_BASE/enagement"

rsync -az --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude target \
  --exclude .output \
  --exclude enagement/node_modules \
  --exclude enagement/.output \
  --exclude enagement/.env \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new" \
  "$REPO/enagement/" "$HOST:$REMOTE_BASE/enagement/"

for dir in src supabase database scripts; do
  rsync -az \
    --exclude node_modules \
    -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new" \
    "$REPO/$dir/" "$HOST:$REMOTE_BASE/$dir/"
done

# Seed .env from World Cup OS if missing; ensure MatchMind URLs (before build)
ssh -i "$SSH_KEY" "$HOST" "bash -s" <<ENVPATCH
set -euo pipefail
ENV_FILE="$REMOTE_BASE/enagement/.env"
if [ ! -f "\$ENV_FILE" ] && [ -f /var/www/wmos-buildingculture/.env ]; then
  cp /var/www/wmos-buildingculture/.env "\$ENV_FILE"
fi
if [ -f "\$ENV_FILE" ]; then
  grep -q '^VITE_APP_URL=' "\$ENV_FILE" && sed -i 's|^VITE_APP_URL=.*|VITE_APP_URL=https://match.buildingcultureid.space|' "\$ENV_FILE" || echo 'VITE_APP_URL=https://match.buildingcultureid.space' >> "\$ENV_FILE"
  grep -q '^APP_ALLOWED_ORIGINS=' "\$ENV_FILE" && sed -i 's|^APP_ALLOWED_ORIGINS=.*|APP_ALLOWED_ORIGINS=https://match.buildingcultureid.space,http://127.0.0.1:3031|' "\$ENV_FILE" || echo 'APP_ALLOWED_ORIGINS=https://match.buildingcultureid.space,http://127.0.0.1:3031' >> "\$ENV_FILE"
  grep -q '^PORT=' "\$ENV_FILE" && sed -i 's|^PORT=.*|PORT=3031|' "\$ENV_FILE" || echo 'PORT=3031' >> "\$ENV_FILE"
  grep -q '^NITRO_DEV_PORT=' "\$ENV_FILE" && sed -i 's|^NITRO_DEV_PORT=.*|NITRO_DEV_PORT=3031|' "\$ENV_FILE" || echo 'NITRO_DEV_PORT=3031' >> "\$ENV_FILE"
  grep -q '^VITE_PORT=' "\$ENV_FILE" && sed -i 's|^VITE_PORT=.*|VITE_PORT=3019|' "\$ENV_FILE" || echo 'VITE_PORT=3019' >> "\$ENV_FILE"
  for key in WEBACY_API_KEY WEBACY_ENABLED; do
    if [ -f /var/www/wmos-buildingculture/.env ] && grep -q "^\${key}=" /var/www/wmos-buildingculture/.env; then
      val="\$(grep "^\${key}=" /var/www/wmos-buildingculture/.env | head -1 | cut -d= -f2-)"
      grep -q "^\${key}=" "\$ENV_FILE" && sed -i "s|^\${key}=.*|\${key}=\${val}|" "\$ENV_FILE" || echo "\${key}=\${val}" >> "\$ENV_FILE"
    fi
  done
fi
cd "$REMOTE_BASE/enagement" && set -a && source .env && set +a && npm run db:migrate || true
ENVPATCH

ssh -i "$SSH_KEY" "$HOST" "cd $REMOTE_BASE/enagement && npm ci && ln -sfn $REMOTE_BASE/enagement/node_modules $REMOTE_BASE/node_modules && npm run build && pm2 startOrRestart ecosystem.config.cjs && pm2 save"

# Nginx + Let's Encrypt SSL
ssh -i "$SSH_KEY" "$HOST" "bash $REMOTE_BASE/enagement/scripts/setup-ssl.sh"

echo "Deployed to https://match.buildingcultureid.space"
