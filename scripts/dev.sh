#!/usr/bin/env bash
set -euo pipefail
trap 'kill 0' INT TERM

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR/agents"  && npm run dev &
cd "$ROOT_DIR/backend"  && npm run dev &
cd "$ROOT_DIR/frontend" && npm run dev &

wait_for() {
  local name="$1" url="$2"
  for i in $(seq 1 30); do
    curl -sf --max-time 2 "$url" > /dev/null 2>&1 && echo "  $name ready" && return 0
    sleep 1
  done
  echo "  $name FAILED (timeout)" && return 1
}

echo ""
echo "Starting services..."
wait_for "Agents"   "http://localhost:8788/agents/outline-deep-agent/health"
wait_for "Backend"  "http://localhost:8787/health"
wait_for "Frontend" "http://localhost:5173"

echo ""
echo "Enki running at http://localhost:5173"
echo "Admin key: enki_local_admin_key"
echo ""
wait
