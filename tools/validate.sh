#!/usr/bin/env bash
set -euo pipefail

fail=0
say() { echo "[validate] $*"; }

check_zip_has() {
  local zip="$1" path="$2"
  if zipinfo -1 "$zip" | grep -qx "$path"; then
    say "OK: $zip has $path"
  else
    say "ERROR: $zip missing $path"; fail=1
  fi
}

check_zip_lacks() {
  local zip="$1" path="$2"
  if zipinfo -1 "$zip" | grep -qx "$path"; then
    say "ERROR: $zip should NOT contain $path"; fail=1
  else
    say "OK: $zip lacks $path"
  fi
}

meta_field() {
  local zip="$1" key="$2"
  unzip -p "$zip" metadata.json | tr -d '\r' | sed -n -E "s/^[[:space:]]*\"${key}\"[[:space:]]*:[[:space:]]*\"?([^\",}]+)\"?.*$/\1/p" | head -n1
}

pick_latest_esm_zip() {
  local best_zip="" best_ver=0
  for z in dist/numeric-clock@nickotmazgin.v*.shell-extension.zip; do
    [[ -f "$z" ]] || continue
    if zipinfo -1 "$z" | grep -qx 'schemas/gschemas.compiled'; then
      continue
    fi
    local v
    v=$(meta_field "$z" version)
    [[ "$v" =~ ^[0-9]+$ ]] || continue
    if (( v > best_ver )); then best_ver=$v; best_zip="$z"; fi
  done
  echo -n "$best_zip"
}

main() {
  local esm_zip
  esm_zip=$(pick_latest_esm_zip)

  say "Checking ESM zip: ${esm_zip:-<none>}"
  if [[ -n "$esm_zip" ]]; then
    check_zip_lacks "$esm_zip" schemas/gschemas.compiled
    check_zip_has   "$esm_zip" metadata.json
    local v shellv
    v=$(meta_field "$esm_zip" version)
    shellv=$(unzip -p "$esm_zip" metadata.json | tr -d '\n' | sed -n -E 's/.*"shell-version"\s*:\s*\[([^\]]+)\].*/\1/p')
    say "ESM version=$v shell-version=[$shellv]"
  else
    say "ERROR: no ESM zip found"; fail=1
  fi

  exit $fail
}

main "$@"
