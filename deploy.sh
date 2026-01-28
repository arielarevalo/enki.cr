#!/bin/bash
set -e

# Load environment variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/.env"

echo "Deploying to Cloudflare Pages..."

CLOUDFLARE_API_TOKEN="$API_TOKEN" npx wrangler pages deploy "$SCRIPT_DIR" --project-name=enki

echo "✓ Deployment complete!"
echo "Live at: https://enki.cr/"
