#!/usr/bin/env bash
# Abort if critical live theme files/markers are missing from the local tree.
# Prevents theme push from deleting Featured Specs, PDP path, tiles, chrome, SBV, etc.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LIST="${ROOT}/scripts/protected-theme-files.txt"
missing=0

if [[ ! -f "$LIST" ]]; then
  echo "FATAL: missing protected file list: $LIST" >&2
  exit 1
fi

while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
  rel="${line#"${line%%[![:space:]]*}"}"
  rel="${rel%"${rel##*[![:space:]]}"}"
  [[ -z "$rel" ]] && continue
  if [[ ! -f "${ROOT}/${rel}" ]]; then
    echo "PROTECTED FILE MISSING: ${rel}" >&2
    missing=1
  fi
done < "$LIST"

require_marker() {
  local file="$1"
  local pattern="$2"
  local label="$3"
  if [[ ! -f "${ROOT}/${file}" ]] || ! grep -qE "$pattern" "${ROOT}/${file}"; then
    echo "PROTECTED MARKUP MISSING: ${label} (${file})" >&2
    missing=1
  fi
}

# Live wiring that historically got stripped by incomplete pushes
require_marker "theme/layout/theme.liquid" "ffChromeChargeV2" "Chrome surcharge runtime (ffChromeChargeV2)"
require_marker "theme/layout/theme.liquid" "ff-bcpo-chrome-surcharge\\.js" "Chrome surcharge asset include"
require_marker "theme/layout/theme.liquid" "ff-option-tiles\\.js" "Option tiles JS include"
require_marker "theme/layout/theme.liquid" "ff-option-tiles\\.css" "Option tiles CSS include"
require_marker "theme/sections/main-product.liquid" "render 'ff-pdp-configurator'" "PDP configurator render"
require_marker "theme/sections/main-product.liquid" "render 'ff-pdp-confidence'" "PDP confidence render"
require_marker "theme/snippets/ff-shop-by-vehicle-build.liquid" "ff-shop-by-vehicle-v3\\.js" "SBV v3 build script"
require_marker "theme/sections/ff-shop-by-vehicle.liquid" "ff-shop-by-vehicle-v3\\.js" "SBV v3 section script"

if [[ "$missing" -ne 0 ]]; then
  echo >&2
  echo "Refusing theme push. Restore protected files before deploying." >&2
  echo "A push without these files can wipe live features (Featured Specs, PDP path, tiles, chrome, SBV)." >&2
  echo "Restore point tag: live-restore-2026-09-20  (see RESTORE_POINT.txt)" >&2
  exit 1
fi

echo "==> Protected theme files present (Featured Specs, PDP path, option tiles, chrome, SBV, quote)."
