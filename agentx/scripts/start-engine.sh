#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PYTHONPATH=services/ai-engine
cd services/ai-engine
exec .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port "${API_PORT:-8041}"
