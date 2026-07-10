#!/usr/bin/env bash
# Copy soccer/*.webp into each app's public/soccer/ folder.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/soccer"
DESTS=(
  "$ROOT/public/soccer"
  "$ROOT/agentx/apps/web/public/soccer"
  "$ROOT/enagement/public/soccer"
)

if [ ! -d "$SRC" ]; then
  echo "Missing $SRC — add .webp files first."
  exit 1
fi

for dest in "${DESTS[@]}"; do
  mkdir -p "$dest"
  rsync -a "$SRC/"*.webp "$dest/"
  echo "Synced $(ls "$dest"/*.webp 2>/dev/null | wc -l | tr -d ' ') images → $dest"
done

echo "Done."
