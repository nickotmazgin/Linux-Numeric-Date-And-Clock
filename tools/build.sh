#!/usr/bin/env bash
set -euo pipefail

# Build the GNOME Shell extension ZIP (ESM, GNOME 45+) from src/.
# The file list is explicit so local and CI builds ship exactly the same zip.

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
DIST_DIR="$ROOT_DIR/dist"
SRC_DIR="$ROOT_DIR/src"

FILES=(
  metadata.json
  extension.js
  prefs.js
  presets.js
  stylesheet.css
  icons/numeric-clock-symbolic.svg
  schemas/org.gnome.shell.extensions.numeric-clock.gschema.xml
)

have() { command -v "$1" >/dev/null 2>&1; }
for cmd in zip python3 glib-compile-schemas; do
  have "$cmd" || { echo "Missing required command: $cmd" >&2; exit 1; }
done

meta() { python3 -c 'import json,sys; m=json.load(open(sys.argv[1])); print(m[sys.argv[2]] if not isinstance(m[sys.argv[2]], list) else "-".join(m[sys.argv[2]]))' "$SRC_DIR/metadata.json" "$1"; }

uuid=$(meta uuid)
version=$(meta version)

for f in "${FILES[@]}"; do
  [[ -f "$SRC_DIR/$f" ]] || { echo "Missing source file: src/$f" >&2; exit 1; }
done

# Fail early on a broken schema (the compiled file is never shipped).
glib-compile-schemas --strict --dry-run "$SRC_DIR/schemas"

mkdir -p "$DIST_DIR"
dest="$DIST_DIR/${uuid}.v${version}.shell-extension.zip"
rm -f "$dest"
(cd "$SRC_DIR" && zip -qX "$dest" "${FILES[@]}")

echo "Built: $dest ($(meta shell-version | sed 's/-/, /g'))"
