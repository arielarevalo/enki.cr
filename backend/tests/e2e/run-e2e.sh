#!/usr/bin/env bash
set -euo pipefail
npx newman run tests/e2e/enki-api.postman_collection.json \
  --environment tests/e2e/environments/staging.postman_environment.json \
  --env-var "adminKey=${ADMIN_KEY}" \
  --reporters cli,junit \
  --reporter-junit-export tests/e2e/results.xml
