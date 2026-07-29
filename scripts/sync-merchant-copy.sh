#!/usr/bin/env bash
# Pull merchant copy (settings + templates) from Shopify into theme/.
# Run this BEFORE editing anything that could overwrite theme-editor text.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

THEME_ID="${SHOPIFY_THEME_ID:-188539207955}"

SHOPIFY_BIN="${ROOT}/node_modules/.bin/shopify"
if [[ ! -x "$SHOPIFY_BIN" ]]; then
  echo "Missing Shopify CLI. Run: npm install" >&2
  exit 1
fi

echo "==> Syncing merchant copy from theme ${THEME_ID} into theme/"
# PATH so with-env can exec `shopify` from node_modules via npm-style lookup
export PATH="${ROOT}/node_modules/.bin:${PATH}"
bash scripts/with-env.sh shopify theme pull \
  --path theme \
  --theme "$THEME_ID" \
  --only config/settings_data.json \
  --only 'templates/*.json' \
  --only 'sections/*.json' \
  --force

echo "==> Merchant copy synced. Keep settings values when you edit structure."
