#!/usr/bin/env bash
# Smoke-test the built extension in a nested GNOME Shell (Wayland) window.
#
# Fully isolated from your desktop: its own D-Bus session, dconf database and
# extensions directory, so nothing here touches your real clock or settings.
#
#   ./tools/nested-smoke-test.sh          build, run, print NCTEST results
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

UUID=$(python3 -c 'import json;print(json.load(open("src/metadata.json"))["uuid"])')
SHELL_MAJOR=$(gnome-shell --version | grep -oE '[0-9]+' | head -1)

./tools/build.sh >/dev/null
ZIP=$(ls -t dist/*.shell-extension.zip | head -1)

WORK="$(mktemp -d "${TMPDIR:-/tmp}/numeric-clock-nested.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT
EXT_DIR="$WORK/data/gnome-shell/extensions"
mkdir -p "$EXT_DIR/numeric-clock-test@local" "$WORK/config"

unzip -q "$ZIP" -d "$EXT_DIR/$UUID"
glib-compile-schemas "$EXT_DIR/$UUID/schemas"
cp tools/nested-harness/extension.js "$EXT_DIR/numeric-clock-test@local/"
printf '{"uuid":"numeric-clock-test@local","name":"Numeric Clock test harness","description":"test","shell-version":["%s"]}\n' \
    "$SHELL_MAJOR" > "$EXT_DIR/numeric-clock-test@local/metadata.json"

cat > "$WORK/run.sh" <<RUN
set -e
gsettings set org.gnome.shell disable-user-extensions false
gsettings set org.gnome.shell enabled-extensions "['$UUID','numeric-clock-test@local']"
# Abort unless gsettings wrote to the isolated dconf database.
sleep 1
[ -s "\$XDG_CONFIG_HOME/dconf/user" ] || { echo "ISOLATION FAILED - aborting"; exit 1; }
MUTTER_DEBUG_DUMMY_MODE_SPECS=1280x800 timeout 40 gnome-shell --nested --wayland || true
RUN

# XDG_* must be set before dbus-run-session so D-Bus-activated dconf uses them.
env XDG_DATA_HOME="$WORK/data" XDG_CONFIG_HOME="$WORK/config" \
    dbus-run-session -- bash "$WORK/run.sh" > "$WORK/log.txt" 2>&1 || true

grep -E "ISOLATION|NCTEST|JS ERROR|numeric-clock|Numeric Clock" "$WORK/log.txt" || true
if grep -q "JS ERROR\|NCTEST FAIL\|ISOLATION FAILED" "$WORK/log.txt" || ! grep -q "NCTEST DONE" "$WORK/log.txt"; then
    echo "SMOKE TEST FAILED"
    exit 1
fi
echo "SMOKE TEST PASSED"
