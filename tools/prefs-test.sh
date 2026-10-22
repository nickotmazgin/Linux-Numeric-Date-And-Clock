#!/usr/bin/env bash
# Check the Preferences window's behaviour in plain gjs (no GNOME Shell needed):
# the format field saves only on Enter/apply, refuses empty or %-less formats,
# opens unfocused, and follows outside changes. Uses in-memory settings.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/numeric-clock-prefs.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/ext" "$WORK/config"

cp -r "$ROOT_DIR"/src/{metadata.json,presets.js,schemas} "$WORK/ext/"
glib-compile-schemas "$WORK/ext/schemas"
cp "$ROOT_DIR/tools/media/showcase/shim.js" "$ROOT_DIR/tools/tests/prefs.test.js" "$WORK/ext/"
sed "s#resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js#./shim.js#" \
    "$ROOT_DIR/src/prefs.js" > "$WORK/ext/prefs.js"

out=$(cd "$WORK/ext" && XDG_CONFIG_HOME="$WORK/config" GSETTINGS_BACKEND=memory \
      timeout 30 gjs -m prefs.test.js 2>&1 | grep -E '^(PASS|FAIL)' || true)
echo "$out"
if [[ -z "$out" ]] || grep -q '^FAIL' <<<"$out"; then
  echo "PREFS TEST FAILED"
  exit 1
fi
echo "PREFS TEST PASSED"
