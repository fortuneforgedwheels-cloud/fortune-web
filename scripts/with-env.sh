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
# Do not default SHOPIFY_FLAG_THEME to an old theme — scripts set this explicitly.

exec "$@"
