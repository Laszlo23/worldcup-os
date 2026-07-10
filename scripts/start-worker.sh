#!/bin/bash
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
set -a
source "$ROOT/.env"
set +a
cd "$ROOT"
exec npx tsx scripts/worker.ts
