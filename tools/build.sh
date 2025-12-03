#!/usr/bin/env bash
set -euo pipefail

# Build GNOME Shell extension ZIPs for both variants.
# - src        → GNOME 45–47 (ESM)
# - src-legacy → GNOME 42–44 (classic)

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
DIST_DIR="$ROOT_DIR/dist"
ESM_DIR="$ROOT_DIR/src"
LEGACY_DIR="$ROOT_DIR/src-legacy"

mkdir -p "$DIST_DIR"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing required command: $1" >&2; exit 1; }; }
need gnome-extensions
need glib-compile-schemas

meta_val() {
  # jq-less JSON field extractor for flat string/int fields in metadata.json
  # usage: meta_val <key> <file>
  local key="$1" file="$2"
  # Extract between quotes or as a number
  sed -n -E "s/^[[:space:]]*\"${key}\"[[:space:]]*:[[:space:]]*\"?([^\",}]+)\"?.*$/\1/p" "$file" | head -n1
}

pack_dir() {
  local dir="$1"
  local tmpdir="$2"
  local dist="$3"
  local compile_schemas="${4:-false}"

  local meta="$dir/metadata.json"
  [[ -f "$meta" ]] || { echo "metadata.json not found in $dir" >&2; exit 1; }
  local uuid version
  uuid=$(meta_val uuid "$meta")
  version=$(meta_val version "$meta")

  # Work from a temp copy so we can compile schemas for legacy
  rm -rf "$tmpdir"
  mkdir -p "$tmpdir"
  cp -a "$dir/"* "$tmpdir/"

  if [[ "$compile_schemas" == "true" ]]; then
    if [[ -f "$tmpdir/schemas/org.gnome.shell.extensions.numeric-clock.gschema.xml" ]]; then
      (cd "$tmpdir" && glib-compile-schemas schemas || true)
    fi
  else
    # Ensure we do not ship compiled schemas for 45+
    rm -f "$tmpdir/schemas/gschemas.compiled" 2>/dev/null || true
  fi

  # Pack
  local out
  out=$(gnome-extensions pack "$tmpdir" --force --out-dir "$dist")
  # gnome-extensions outputs a message like: Created /path/uuid.shell-extension.zip
  local basezip
  basezip=$(echo "$out" | sed -n -E 's/^Created[[:space:]]+(.+)$/\1/p')
  if [[ -z "$basezip" || ! -f "$basezip" ]]; then
    # Fallback: guess by UUID
    basezip="$dist/${uuid}.shell-extension.zip"
  fi

  local dest="$dist/${uuid}.v${version}.shell-extension.zip"
  rm -f "$dest"
  mv -f "$basezip" "$dest"
  echo "$dest"
}

echo "Building ESM (GNOME 45–47) from: $ESM_DIR"
esm_tmp=$(mktemp -d)
esm_zip=$(pack_dir "$ESM_DIR" "$esm_tmp" "$DIST_DIR" false)
# Strip compiled schemas from ESM build if present
if command -v zip >/dev/null 2>&1; then
  zip -d "$esm_zip" 'schemas/gschemas.compiled' >/dev/null 2>&1 || true
fi
rm -rf "$esm_tmp"

echo "Building legacy (GNOME 42–44) from: $LEGACY_DIR"
legacy_tmp=$(mktemp -d)
legacy_zip=$(pack_dir "$LEGACY_DIR" "$legacy_tmp" "$DIST_DIR" true)
rm -rf "$legacy_tmp"

echo
echo "Done. Artifacts:"
echo "  - $esm_zip"
echo "  - $legacy_zip"
