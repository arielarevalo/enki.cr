#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:8788}"

echo "=== Agents E2E Tests ==="
echo "Target: ${BASE_URL}"
echo ""

PASS=0
FAIL=0

assert() {
  local name="$1"
  if eval "$2"; then
    echo "  PASS: ${name}"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: ${name}"
    FAIL=$((FAIL + 1))
  fi
}

# --- Test 1: Health check ---
echo "1) Health check"
HEALTH_RESPONSE=$(curl --silent --max-time 10 "${BASE_URL}/agents/outline-deep-agent/health" || echo "CURL_FAILED")

if [[ "$HEALTH_RESPONSE" == "CURL_FAILED" ]]; then
  echo "  FAIL: Could not reach agents at ${BASE_URL}"
  echo ""
  echo "Results: 0 passed, 1 failed"
  exit 1
fi

assert "status is ok" "[[ \$(echo '${HEALTH_RESPONSE}' | node -e \"process.stdin.on('data',d=>console.log(JSON.parse(d).status))\") == 'ok' ]]"

# --- Test 2: Process request (SSE stream) ---
echo "2) Process request"
SESSION_ID=$(node -e "console.log(require('crypto').randomUUID())")
PROCESS_RESPONSE=$(curl --silent --max-time 90 \
  -w "\n%{http_code}\n%{content_type}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"input":[{"type":"input_text","text":"https://example.com"}]}' \
  "${BASE_URL}/agents/outline-deep-agent/${SESSION_ID}" || echo "CURL_FAILED")

if [[ "$PROCESS_RESPONSE" == "CURL_FAILED" ]]; then
  echo "  FAIL: Process request failed"
  FAIL=$((FAIL + 1))
else
  HTTP_CODE=$(echo "$PROCESS_RESPONSE" | tail -2 | head -1)
  CONTENT_TYPE=$(echo "$PROCESS_RESPONSE" | tail -1)
  BODY=$(echo "$PROCESS_RESPONSE" | sed '$d' | sed '$d')

  assert "HTTP 200" "[[ '${HTTP_CODE}' == '200' ]]"
  assert "content-type is text/event-stream" "[[ '${CONTENT_TYPE}' == *'text/event-stream'* ]]"
  assert "body contains response.created" "[[ '${BODY}' == *'response.created'* ]]"
  assert "body contains response.completed" "[[ '${BODY}' == *'response.completed'* ]]"
fi

echo ""
echo "Results: ${PASS} passed, ${FAIL} failed"
[[ "$FAIL" -eq 0 ]] || exit 1
