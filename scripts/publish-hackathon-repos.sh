#!/usr/bin/env bash
# Prepare three separate public repos for Superteam World Cup Hackathon submission.
# Usage: ./scripts/publish-hackathon-repos.sh [--push]
#
# Creates .publish/worldcup-os, .publish/txline-ai-trader, .publish/matchmind-ai
# Review each directory, then push to GitHub manually or with --push.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUBLISH="$ROOT/.publish"
PUSH="${1:-}"

rm -rf "$PUBLISH"
mkdir -p "$PUBLISH/worldcup-os" "$PUBLISH/txline-ai-trader" "$PUBLISH/matchmind-ai"

echo "==> worldcup-os (Prediction Markets)"
rsync -a \
  --exclude node_modules --exclude .git --exclude target --exclude .output \
  --exclude agentx --exclude engagement --exclude .publish \
  --exclude hackathon-readiness-report.json --exclude hackathon-readiness-report.md \
  "$ROOT/" "$PUBLISH/worldcup-os/"

echo "==> txline-ai-trader (Trading Agents)"
rsync -a \
  --exclude node_modules --exclude .git --exclude .output \
  --exclude apps/web/.next --exclude services/ai-engine/.venv \
  "$ROOT/agentx/" "$PUBLISH/txline-ai-trader/"

echo "==> matchmind-ai (Fan Experiences)"
rsync -a \
  --exclude node_modules --exclude .git --exclude .output \
  "$ROOT/enagement/" "$PUBLISH/matchmind-ai/"

# Vendor minimal shared server code for standalone matchmind repo
SHARED="$PUBLISH/matchmind-ai/shared-server"
mkdir -p "$SHARED/services" "$SHARED/repositories" "$SHARED/db" "$SHARED/config"
for f in \
  services/txline \
  services/market-engine.ts \
  services/engagement-polls.ts \
  services/settlement.ts \
  services/blockchain \
  repositories/engagement.ts \
  db/postgres.ts \
  config/env.ts; do
  src="$ROOT/src/server/$f"
  if [ -f "$src" ]; then
    mkdir -p "$SHARED/$(dirname "$f")"
    cp "$src" "$SHARED/$f"
  elif [ -d "$src" ]; then
    mkdir -p "$SHARED/$f"
    cp -R "$src/." "$SHARED/$f/"
  fi
done

cat > "$PUBLISH/matchmind-ai/PUBLISH_NOTES.md" <<'EOF'
# MatchMind standalone publish notes

This export vendors shared server modules under `shared-server/` for the standalone GitHub repo.

After clone, update `nitro.config.ts` to point `@shared` at `./shared-server` instead of `../src`.

Run from World Cup OS monorepo for full shared sync, or copy latest from `src/server/` before push.
EOF

cat > "$PUBLISH/README.md" <<'EOF'
# Hackathon repo exports

| Directory | GitHub target | Track |
|-----------|---------------|-------|
| worldcup-os | github.com/Laszlo23/worldcup-os | Prediction Markets |
| txline-ai-trader | github.com/Laszlo23/txline-ai-trader | Trading Agents |
| matchmind-ai | github.com/Laszlo23/matchmind-ai | Fan Experiences |

## Push commands (after creating empty repos on GitHub)

```bash
cd worldcup-os && git init && git add . && git commit -m "World Cup OS hackathon submission"
git remote add origin git@github.com:Laszlo23/worldcup-os.git && git push -u origin main

cd ../txline-ai-trader && git init && git add . && git commit -m "TxLINE AI Trader hackathon submission"
git remote add origin git@github.com:Laszlo23/txline-ai-trader.git && git push -u origin main

cd ../matchmind-ai && git init && git add . && git commit -m "MatchMind AI hackathon submission"
git remote add origin git@github.com:Laszlo23/matchmind-ai.git && git push -u origin main
```
EOF

echo ""
echo "Export complete: $PUBLISH"
echo "See $PUBLISH/README.md for push instructions"

if [ "$PUSH" = "--push" ]; then
  echo "Auto-push disabled by default — run git commands manually to avoid accidental force pushes."
fi
