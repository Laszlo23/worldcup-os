#!/bin/bash
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
set -a
source "$ROOT/.env"
set +a
cd "$ROOT"
exec npm run start:prod
