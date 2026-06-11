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

main() {
  local expected_version expected_name esm_zip
  expected_version=$(python3 -c 'import json; print(json.load(open("src/metadata.json"))["version"])')
  expected_name=$(python3 -c 'import json; print(json.load(open("src/metadata.json"))["version-name"])')
  esm_zip="dist/numeric-clock@nickotmazgin.v${expected_version}.shell-extension.zip"

  say "Checking ESM zip: ${esm_zip:-<none>}"
  if [[ -f "$esm_zip" ]]; then
    check_zip_lacks "$esm_zip" schemas/gschemas.compiled
    check_zip_has   "$esm_zip" metadata.json
    check_zip_has   "$esm_zip" extension.js
    check_zip_has   "$esm_zip" prefs.js
    check_zip_has   "$esm_zip" icons/numeric-clock-symbolic.svg
    check_zip_has   "$esm_zip" schemas/org.gnome.shell.extensions.numeric-clock.gschema.xml
    check_zip_lacks "$esm_zip" tools/build.sh
    check_zip_lacks "$esm_zip" .env
    local v version_name shellv
    v=$(meta_field "$esm_zip" version)
    version_name=$(python3 -c 'import json,sys,zipfile; print(json.loads(zipfile.ZipFile(sys.argv[1]).read("metadata.json"))["version-name"])' "$esm_zip")
    shellv=$(python3 -c 'import json,sys,zipfile; print(",".join(json.loads(zipfile.ZipFile(sys.argv[1]).read("metadata.json"))["shell-version"]))' "$esm_zip")
    [[ "$v" = "$expected_version" ]] || { say "ERROR: version=$v, expected $expected_version"; fail=1; }
    [[ "$version_name" = "$expected_name" ]] || { say "ERROR: version-name=$version_name, expected $expected_name"; fail=1; }
    [[ "$shellv" = "45,46,47,48,49,50" ]] || { say "ERROR: shell-version=[$shellv]"; fail=1; }
    say "ESM version=$v version-name=$version_name shell-version=[$shellv]"
  else
    say "ERROR: no ESM zip found"; fail=1
  fi

  exit $fail
}

main "$@"
