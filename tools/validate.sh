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

is_esm_zip() {
  local zip="$1"
  # ESM zips must not include compiled schemas
  if zipinfo -1 "$zip" | grep -qx 'schemas/gschemas.compiled'; then
    return 1
  fi
  return 0
}

pick_latest_by_version() {
  # args: filter_fn_name (is_esm_zip|negate), outputs chosen zip
  local fn="$1"; shift
  local best_zip="" best_ver=0
  for z in dist/numeric-clock@nickotmazgin.v*.shell-extension.zip; do
    [[ -f "$z" ]] || continue
    if "$fn" "$z"; then
      local v
      v=$(meta_field "$z" version)
      [[ "$v" =~ ^[0-9]+$ ]] || continue
      if (( v > best_ver )); then best_ver=$v; best_zip="$z"; fi
    fi
  done
  echo -n "$best_zip"
}

negate() { ! is_esm_zip "$1"; }

main() {
  local esm_zip legacy_zip
  esm_zip=$(pick_latest_by_version is_esm_zip)
  legacy_zip=$(pick_latest_by_version negate)

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

  say "Checking legacy zip: ${legacy_zip:-<none>}"
  if [[ -n "$legacy_zip" ]]; then
    check_zip_has "$legacy_zip" schemas/gschemas.compiled
    check_zip_has "$legacy_zip" metadata.json
    local v shellv
    v=$(meta_field "$legacy_zip" version)
    shellv=$(unzip -p "$legacy_zip" metadata.json | tr -d '\n' | sed -n -E 's/.*"shell-version"\s*:\s*\[([^\]]+)\].*/\1/p')
    say "LEGACY version=$v shell-version=[$shellv]"
  else
    say "ERROR: no legacy zip found"; fail=1
  fi

  exit $fail
}

main "$@"
