#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

LOCAL_ADMIN_KEY="enki_local_admin_key"

# Compute SHA-256 hash (matches backend/src/infrastructure/auth.ts:hashKey)
KEY_HASH=$(node -e "console.log(require('crypto').createHash('sha256').update('${LOCAL_ADMIN_KEY}').digest('hex'))")

echo "Seeding local D1 with admin key..."
cd "$BACKEND_DIR"
npx wrangler d1 execute enki-db --local \
  --command="INSERT OR IGNORE INTO api_keys (id, key_hash, key_prefix, type, created_at) VALUES ('local-admin', '${KEY_HASH}', 'enki_local_', 'admin', datetime('now'));"

echo "Done. Local admin key: ${LOCAL_ADMIN_KEY}"
