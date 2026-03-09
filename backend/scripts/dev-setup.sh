#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

LOCAL_ADMIN_KEY="enki_local_admin_key"

# 1. Apply D1 migrations (idempotent, < /dev/null auto-accepts prompt)
npx wrangler d1 migrations apply enki-db --local < /dev/null 2>&1 | tail -3

# 2. Seed admin key (INSERT OR IGNORE — idempotent)
KEY_HASH=$(node -e "console.log(require('crypto').createHash('sha256').update('${LOCAL_ADMIN_KEY}').digest('hex'))")
npx wrangler d1 execute enki-db --local \
  --command="INSERT OR IGNORE INTO api_keys (id, key_hash, key_prefix, type, created_at) VALUES ('local-admin', '${KEY_HASH}', 'enki_local_', 'admin', datetime('now'));" \
  < /dev/null 2>&1 | tail -1

# 3. Set default active agent (INSERT OR REPLACE — idempotent)
npx wrangler d1 execute enki-db --local \
  --command="INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('active_agent', 'outline-react', datetime('now'));" \
  < /dev/null 2>&1 | tail -1

echo "Admin key: ${LOCAL_ADMIN_KEY}"
