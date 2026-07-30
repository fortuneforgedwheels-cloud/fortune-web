#!/usr/bin/env bash
# Push Liquid/CSS/JS/assets only — never settings_data or template JSON.
# Use this for layout/code deploys so theme-editor text is not overwritten.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

THEME_ID="${SHOPIFY_THEME_ID:-188605104403}"
ALLOW_LIVE_FLAG=()
if [[ "${1:-}" == "--allow-live" ]]; then
  ALLOW_LIVE_FLAG=(--allow-live)
  shift
fi

ONLY_ARGS=(
  --only 'layout/*'
  --only 'sections/*.liquid'
  --only 'snippets/*'
  --only 'assets/*'
  --only 'locales/*'
  --only 'config/settings_schema.json'
)

# Extra paths from caller (must not be settings_data or templates)
EXTRA=("$@")
for item in "${EXTRA[@]}"; do
  case "$item" in
    config/settings_data.json|templates/*|templates|config/settings_data.json)
      echo "Refusing to push merchant copy via theme:push:code: $item" >&2
      echo "Run npm run theme:sync-copy first, then use theme:push:templates intentionally." >&2
      exit 1
      ;;
  esac
  ONLY_ARGS+=(--only "$item")
done

if [[ ! -x "${ROOT}/node_modules/.bin/shopify" ]]; then
  echo "Missing Shopify CLI. Run: npm install" >&2
  exit 1
fi

export PATH="${ROOT}/node_modules/.bin:${PATH}"
echo "==> Pushing code-only files to theme ${THEME_ID} (no settings_data / templates)"
bash scripts/with-env.sh shopify theme push \
  --path theme \
  --theme "$THEME_ID" \
  "${ALLOW_LIVE_FLAG[@]}" \
  "${ONLY_ARGS[@]}"
