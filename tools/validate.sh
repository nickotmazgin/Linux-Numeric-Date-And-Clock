#!/usr/bin/env bash
set -euo pipefail

fail=0
say() { echo "[validate] $*"; }
check_zip_has() {
  local zip="$1" path="$2"; shift 2
  if zipinfo -1 "$zip" | grep -qx "$path"; then
    say "OK: $zip has $path"
  else
    say "ERROR: $zip missing $path"; fail=1
  fi
}
check_zip_lacks() {
  local zip="$1" path="$2"; shift 2
  if zipinfo -1 "$zip" | grep -qx "$path"; then
    say "ERROR: $zip should NOT contain $path"; fail=1
  else
    say "OK: $zip lacks $path"
  fi
}
meta_field() {
  local zip="$1" key="$2"
  unzip -p "$zip" metadata.json | sed -n -E "s/^[[:space:]]*\"${key}\"[[:space:]]*:[[:space:]]*\"?([^\",}]+)\"?.*$/\1/p" | head -n1
}

main() {
  local esm_zip legacy_zip
  esm_zip=$(ls -1 dist/numeric-clock@nickotmazgin.v*.shell-extension.zip | sort -V | tail -n1)
  legacy_zip=$(ls -1 dist/numeric-clock@nickotmazgin.v*.shell-extension.zip | grep v1[0-4] | sort -V | tail -n1 || true)

  say "Checking ESM zip: $esm_zip"
  check_zip_lacks "$esm_zip" schemas/gschemas.compiled
  check_zip_has   "$esm_zip" metadata.json

  local v shellv
  v=$(meta_field "$esm_zip" version)
  shellv=$(unzip -p "$esm_zip" metadata.json | tr -d '\n' | sed -n -E 's/.*"shell-version"\s*:\s*\[([^\]]+)\].*/\1/p')
  say "ESM version=$v shell-version=[$shellv]"

  if [[ -n "${legacy_zip:-}" ]]; then
    say "Checking legacy zip: $legacy_zip"
    check_zip_has "$legacy_zip" schemas/gschemas.compiled
    check_zip_has "$legacy_zip" metadata.json
    v=$(meta_field "$legacy_zip" version)
    shellv=$(unzip -p "$legacy_zip" metadata.json | tr -d '\n' | sed -n -E 's/.*"shell-version"\s*:\s*\[([^\]]+)\].*/\1/p')
    say "LEGACY version=$v shell-version=[$shellv]"
  fi

  exit $fail
}

main "$@"

