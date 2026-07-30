#!/usr/bin/env bash
# Pull the merchant's latest homepage (index.json) from live, mirror to
# index.live.json, and push only the mirror so storefront visitors see editor saves.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

THEME_ID="${SHOPIFY_LIVE_THEME_ID:-${SHOPIFY_THEME_ID:-188606447891}}"
export SHOPIFY_FLAG_THEME="${THEME_ID}"

echo "==> Pulling latest templates/index.json from theme ${THEME_ID}"
bash scripts/with-env.sh shopify theme pull \
  --path theme \
  --theme "$THEME_ID" \
  --only templates/index.json \
  --force

echo "==> Mirroring index.json -> index.live.json"
node scripts/sync-homepage-live.mjs

echo "==> Pushing index.live.json to live theme"
bash scripts/with-env.sh shopify theme push \
  --path theme \
  --theme "$THEME_ID" \
  --only templates/index.live.json \
  --allow-live

echo "==> Homepage mirror updated. Live visitors will see your latest editor saves."
