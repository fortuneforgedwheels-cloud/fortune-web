#!/usr/bin/env bash
# Full theme push wrapper — ALWAYS --nodelete + protected-file assert.
# Prefer npm run theme:push:code for normal deploys (avoids stomping merchant copy).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash "${ROOT}/scripts/assert-protected-theme-files.sh"

THEME_ID="${SHOPIFY_THEME_ID:-188656091411}"
ALLOW_LIVE_FLAG=()
ARGS=()
for arg in "$@"; do
  case "$arg" in
    --allow-live)
      ALLOW_LIVE_FLAG=(--allow-live)
      ;;
    --nodelete)
      # Already forced below; ignore duplicates from callers
      ;;
    *)
      ARGS+=("$arg")
      ;;
  esac
done

if [[ ! -x "${ROOT}/node_modules/.bin/shopify" ]]; then
  echo "Missing Shopify CLI. Run: npm install" >&2
  exit 1
fi

export PATH="${ROOT}/node_modules/.bin:${PATH}"
echo "==> Pushing theme ${THEME_ID} with --nodelete (remote-only files stay stuck until intentionally removed)"
bash scripts/with-env.sh shopify theme push \
  --path theme \
  --theme "$THEME_ID" \
  --nodelete \
  "${ALLOW_LIVE_FLAG[@]}" \
  "${ARGS[@]}"
