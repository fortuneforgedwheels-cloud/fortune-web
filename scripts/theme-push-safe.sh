#!/usr/bin/env bash
# Safe deploy: pull merchant copy first, then push code only (never overwrite
# theme-editor text in settings_data.json or template JSON).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

THEME_ID="${SHOPIFY_LIVE_THEME_ID:-${SHOPIFY_THEME_ID:-188606447891}}"
export SHOPIFY_FLAG_THEME="${THEME_ID}"
export PATH="${ROOT}/node_modules/.bin:${PATH}"

echo "==> Pulling merchant copy before code deploy (prevents reverting editor changes)"
bash scripts/with-env.sh shopify theme pull \
  --path theme \
  --theme "$THEME_ID" \
  --only config/settings_data.json \
  --only 'templates/*.json' \
  --only 'sections/*.json' \
  --force

node scripts/sync-homepage-live.mjs

echo "==> Pushing code-only files (layout, sections, assets — no settings/templates)"
bash scripts/push-code-only.sh --allow-live "$@"
