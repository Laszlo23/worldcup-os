#!/bin/bash
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
set -a
if [ -f "$ROOT/.env" ]; then
  source "$ROOT/.env"
elif [ -f "$ROOT/../.env" ]; then
  source "$ROOT/../.env"
fi
set +a
cd "$ROOT"
exec npm run start:prod
