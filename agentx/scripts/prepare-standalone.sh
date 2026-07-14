#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-/var/www/agentx-buildingculture}"
WEB="$ROOT/apps/web"
STANDALONE="$WEB/.next/standalone/apps/web"

if [ ! -f "$STANDALONE/server.js" ]; then
  echo "Standalone server not found at $STANDALONE/server.js — skipping asset copy"
  exit 0
fi

cp -r "$WEB/public" "$STANDALONE/public"
mkdir -p "$STANDALONE/.next"
cp -r "$WEB/.next/static" "$STANDALONE/.next/static"
echo "Standalone assets prepared at $STANDALONE"
