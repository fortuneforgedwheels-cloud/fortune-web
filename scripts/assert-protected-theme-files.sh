#!/usr/bin/env bash
# Abort if critical live homepage/code files are missing from the local theme.
# Prevents theme push from deleting Featured Specs, quote gate, SBV bar, etc.
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

if [[ ! -f "${ROOT}/theme/sections/ff-simple-build.liquid" ]] ||
   ! grep -q 'data-ff-build-unlock' "${ROOT}/theme/sections/ff-simple-build.liquid"; then
  echo "PROTECTED MARKUP MISSING: BUILD MY QUOTE gate (data-ff-build-unlock) in ff-simple-build.liquid" >&2
  missing=1
fi

if [[ ! -f "${ROOT}/theme/sections/ff-simple-build.liquid" ]] ||
   ! grep -q "ff-quote-meta.js" "${ROOT}/theme/sections/ff-simple-build.liquid"; then
  echo "PROTECTED MARKUP MISSING: ff-quote-meta.js include in ff-simple-build.liquid" >&2
  missing=1
fi

if [[ "$missing" -ne 0 ]]; then
  echo >&2
  echo "Refusing theme push. Restore protected files before deploying." >&2
  echo "A push without these files can wipe live homepage sections." >&2
  exit 1
fi

echo "==> Protected theme files present (Featured Specs, quote gate, SBV bar, meta pixel)."
