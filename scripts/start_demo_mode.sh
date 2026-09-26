#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
mkdir -p backend/data
export DATABASE_URL="${DATABASE_URL:-sqlite:///./backend/data/orvex_demo.db}"
export PYTHONPATH="$ROOT/backend"
echo "ORVEX DEMO MODE"
echo "Database: $DATABASE_URL"
echo "Synthetic enterprise data: ENABLED"
echo
echo "Starting FastAPI on http://127.0.0.1:8000"
echo "Keep this terminal running during the pitch."
echo
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
