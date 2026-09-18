#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

export SHOPIFY_FLAG_STORE="${SHOPIFY_FLAG_STORE:-bb6223-6f.myshopify.com}"
export SHOPIFY_FLAG_THEME="${SHOPIFY_FLAG_THEME:-178099421459}"

# HARD SAFETY: every `shopify theme push` must keep remote-only files and
# refuse to run if protected homepage assets are missing from the local tree.
if [[ "${1:-}" == "shopify" && "${2:-}" == "theme" && "${3:-}" == "push" ]]; then
  bash "${ROOT_DIR}/scripts/assert-protected-theme-files.sh"

  args=("$@")
  has_nodelete=0
  for a in "${args[@]}"; do
    if [[ "$a" == "--nodelete" ]]; then
      has_nodelete=1
      break
    fi
  done
  if [[ "$has_nodelete" -eq 0 ]]; then
    # Insert --nodelete immediately after `shopify theme push`
    args=(shopify theme push --nodelete "${args[@]:3}")
  fi

  echo "==> theme push guard: forcing --nodelete (never delete remote-only theme files)"
  set -- "${args[@]}"
fi

exec "$@"
