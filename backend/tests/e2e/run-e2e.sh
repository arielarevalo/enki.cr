#!/usr/bin/env bash
set -euo pipefail

ENV="${1:-prod}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/environments/${ENV}.postman_environment.json"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: Environment file not found: ${ENV_FILE}"
  echo "Available environments:"
  ls "${SCRIPT_DIR}/environments/"
  exit 1
fi

# Determine agents base URL for pre-flight check
if [[ "$ENV" == "local" ]]; then
  AGENTS_URL="http://localhost:8788"
else
  AGENTS_URL="https://agents.enki.cr"
fi

# Pre-flight: verify agents are reachable
echo "Checking agents at ${AGENTS_URL}..."
if ! curl --fail --silent --max-time 5 "${AGENTS_URL}/agents/outline-deep-agent/health" > /dev/null 2>&1; then
  echo "Error: Agents not reachable at ${AGENTS_URL}"
  echo "Start agents first: cd agents && npm run dev"
  exit 1
fi
echo "Agents OK"

# Build Newman args
NEWMAN_ARGS=(
  "${SCRIPT_DIR}/enki-api.postman_collection.json"
  --environment "$ENV_FILE"
  --reporters cli,junit
  --reporter-junit-export "${SCRIPT_DIR}/results.xml"
)

# Only override adminKey if ADMIN_KEY env var is set (for prod)
if [[ -n "${ADMIN_KEY:-}" ]]; then
  NEWMAN_ARGS+=(--env-var "adminKey=${ADMIN_KEY}")
fi

# Run Newman
npx newman run "${NEWMAN_ARGS[@]}"
