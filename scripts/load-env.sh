#!/usr/bin/env bash
# Source this before Shopify CLI commands if you are not using dotenv automatically.
# Usage: set -a && source scripts/load-env.sh && set +a

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
fi

export SHOPIFY_FLAG_STORE="${SHOPIFY_FLAG_STORE:-bb6223-6f.myshopify.com}"
export SHOPIFY_FLAG_THEME="${SHOPIFY_FLAG_THEME:-178099421459}"
