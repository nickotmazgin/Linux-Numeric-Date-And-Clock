#!/usr/bin/env bash
set -euo pipefail

# Build GNOME Shell extension ZIP for GNOME 45–50 (ESM).

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
DIST_DIR="$ROOT_DIR/dist"
ESM_DIR="$ROOT_DIR/src"

mkdir -p "$DIST_DIR"

have() { command -v "$1" >/dev/null 2>&1; }
have glib-compile-schemas || { echo "Missing required command: glib-compile-schemas" >&2; exit 1; }

meta_val() {
  local key="$1" file="$2"
  sed -n -E "s/^[[:space:]]*\"${key}\"[[:space:]]*:[[:space:]]*\"?([^\",}]+)\"?.*$/\1/p" "$file" | head -n1
}

pack_dir() {
  local dir="$1"
  local tmpdir="$2"
  local dist="$3"

  local meta="$dir/metadata.json"
  [[ -f "$meta" ]] || { echo "metadata.json not found in $dir" >&2; exit 1; }
  local uuid version
  uuid=$(meta_val uuid "$meta")
  version=$(meta_val version "$meta")

  rm -rf "$tmpdir"
  mkdir -p "$tmpdir"
  cp -a "$dir/"* "$tmpdir/"
  rm -f "$tmpdir/schemas/gschemas.compiled" 2>/dev/null || true

  local basezip="$dist/${uuid}.shell-extension.zip"
  rm -f "$basezip"
  if have gnome-extensions; then
    local out
    out=$(gnome-extensions pack "$tmpdir" --force --out-dir "$dist")
    basezip=$(echo "$out" | sed -n -E 's/^Created[[:space:]]+(.+)$/\1/p')
    [[ -n "$basezip" && -f "$basezip" ]] || basezip="$dist/${uuid}.shell-extension.zip"
  else
    (cd "$tmpdir" && zip -qr "$basezip" .)
  fi

  if command -v zip >/dev/null 2>&1; then
    if [[ -d "$tmpdir/icons" ]]; then
      (cd "$tmpdir" && zip -qr "$basezip" icons/)
    fi
    if [[ -f "$tmpdir/presets.js" ]]; then
      (cd "$tmpdir" && zip -q "$basezip" presets.js)
    fi
  fi

  local dest="$dist/${uuid}.v${version}.shell-extension.zip"
  rm -f "$dest"
  mv -f "$basezip" "$dest"
  echo "$dest"
}

echo "Building ESM (GNOME 45–50) from: $ESM_DIR"
esm_tmp=$(mktemp -d)
trap 'rm -rf "$esm_tmp"' EXIT
esm_zip=$(pack_dir "$ESM_DIR" "$esm_tmp" "$DIST_DIR")
if command -v zip >/dev/null 2>&1; then
  zip -d "$esm_zip" 'schemas/gschemas.compiled' >/dev/null 2>&1 || true
fi
rm -rf "$esm_tmp"
trap - EXIT

echo
echo "Done. Artifact:"
echo "  - $esm_zip"
