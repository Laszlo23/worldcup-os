#!/usr/bin/env bash
set -euo pipefail
REMOTE_BASE="${1:-/var/www/agentx-buildingculture}"
ENV_FILE="$REMOTE_BASE/.env"
WMOS_ENV="/var/www/wmos-buildingculture/.env"

if [ ! -f "$ENV_FILE" ] && [ -f "$WMOS_ENV" ]; then
  cp "$WMOS_ENV" "$ENV_FILE"
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "No .env at $ENV_FILE"
  exit 1
fi

grep -q '^DATABASE_URL=' "$ENV_FILE" || { echo 'ERROR: DATABASE_URL missing in .env'; exit 1; }
sed -i 's|/worldcup_os|/txline_ai_trader|' "$ENV_FILE"

set_kv() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

set_kv NEXT_PUBLIC_APP_URL https://agentx.buildingcultureid.space
set_kv NEXT_PUBLIC_API_URL https://agentx.buildingcultureid.space
set_kv NEXT_PUBLIC_WS_URL wss://agentx.buildingcultureid.space/ws
set_kv PORT 3041
set_kv API_PORT 8041
set_kv CORS_ORIGINS https://agentx.buildingcultureid.space,http://127.0.0.1:3041
set_kv APP_URL https://agentx.buildingcultureid.space
set_kv SOLANA_NETWORK devnet
set_kv NEXT_PUBLIC_SOLANA_NETWORK devnet
set_kv NEXT_PUBLIC_SOLANA_RPC_URL https://api.devnet.solana.com
set_kv TXLINE_API_ORIGIN https://txline.txodds.com

for key in TXLINE_GUEST_JWT TXLINE_API_TOKEN TXLINE_API_ORIGIN USDC_MINT NEXT_PUBLIC_USDC_MINT SETTLEMENT_AUTHORITY_SECRET ANCHOR_AUTHORITY_SECRET SESSION_SECRET; do
  if [ -f "$WMOS_ENV" ] && grep -q "^${key}=" "$WMOS_ENV"; then
    val="$(grep "^${key}=" "$WMOS_ENV" | head -1 | cut -d= -f2-)"
    set_kv "$key" "$val"
  elif ! grep -q "^${key}=" "$ENV_FILE" && [ -f "$WMOS_ENV" ] && grep -q "^${key}=" "$WMOS_ENV"; then
    grep "^${key}=" "$WMOS_ENV" >> "$ENV_FILE"
  fi
done

if grep -qE '^TXLINE_(GUEST_JWT|API_TOKEN)=' "$ENV_FILE"; then
  set_kv DEMO_MODE false
else
  grep -q '^DEMO_MODE=' "$ENV_FILE" || set_kv DEMO_MODE true
fi

grep -q '^SESSION_SECRET=' "$ENV_FILE" || set_kv SESSION_SECRET "$(openssl rand -hex 32)"

ln -sf "$ENV_FILE" "$REMOTE_BASE/services/ai-engine/.env"
echo "Patched $ENV_FILE"
