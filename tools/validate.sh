#!/usr/bin/env bash
set -euo pipefail

# Check the built ZIP against src/metadata.json and the release rules.

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

fail=0
say() { echo "[validate] $*"; }

check_zip_has() {
  if zipinfo -1 "$1" | grep -qx "$2"; then say "OK: has $2"; else say "ERROR: missing $2"; fail=1; fi
}

check_zip_lacks() {
  if zipinfo -1 "$1" | grep -qx "$2"; then say "ERROR: should NOT contain $2"; fail=1; else say "OK: lacks $2"; fi
}

zip_meta() {
  python3 -c 'import json,sys,zipfile
m = json.loads(zipfile.ZipFile(sys.argv[1]).read("metadata.json"))
v = m[sys.argv[2]]
print(",".join(v) if isinstance(v, list) else v)' "$1" "$2"
}

src_meta() {
  python3 -c 'import json,sys
v = json.load(open("src/metadata.json"))[sys.argv[1]]
print(",".join(v) if isinstance(v, list) else v)' "$1"
}

version=$(src_meta version)
zip="dist/numeric-clock@nickotmazgin.v${version}.shell-extension.zip"
say "Checking $zip"
[[ -f "$zip" ]] || { say "ERROR: $zip not found (run ./tools/build.sh)"; exit 1; }

for f in metadata.json extension.js prefs.js presets.js stylesheet.css \
         icons/numeric-clock-symbolic.svg \
         schemas/org.gnome.shell.extensions.numeric-clock.gschema.xml; do
  check_zip_has "$zip" "$f"
done
for f in schemas/gschemas.compiled tools/build.sh .env; do
  check_zip_lacks "$zip" "$f"
done

for key in uuid version version-name shell-version; do
  z=$(zip_meta "$zip" "$key"); s=$(src_meta "$key")
  if [[ "$z" == "$s" ]]; then say "OK: $key=$z"; else say "ERROR: $key=$z, src has $s"; fail=1; fi
done

# shell-version must be a contiguous run of majors starting at 45 (ESM only).
python3 - "$zip" <<'PY' || fail=1
import json, sys, zipfile
sv = [int(v) for v in json.loads(zipfile.ZipFile(sys.argv[1]).read("metadata.json"))["shell-version"]]
ok = sv and sv[0] == 45 and sv == list(range(45, sv[-1] + 1))
print(f"[validate] {'OK' if ok else 'ERROR'}: shell-version {sv[0]}–{sv[-1]}")
sys.exit(0 if ok else 1)
PY

# version-name is "<release> <first>.<last>", e.g. "17.5.0 45.51".
vn=$(src_meta version-name); sv=$(src_meta shell-version)
want="${sv%%,*}.${sv##*,}"
if [[ "${vn#* }" == "$want" ]]; then say "OK: version-name suffix $want"; else say "ERROR: version-name '$vn' should end in $want"; fail=1; fi

exit $fail
