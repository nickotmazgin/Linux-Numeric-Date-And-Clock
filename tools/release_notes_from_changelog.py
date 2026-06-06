#!/usr/bin/env python3
"""Extract GitHub release notes from CHANGELOG.md for Numeric Clock."""
from __future__ import annotations

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CHANGELOG = REPO_ROOT / "CHANGELOG.md"

FOOTER = """
## Install
Download **`numeric-clock@nickotmazgin.v*.shell-extension.zip`** from this release (GNOME Shell **45–50**), then:

```bash
gnome-extensions install --force numeric-clock@nickotmazgin.v*.shell-extension.zip
```

Enable in Extensions, or Alt+F2 → r → Enter after install.

## GNOME 42–44 — discontinued
Numeric Clock **no longer supports GNOME Shell 42–44**. Use GNOME **45** or newer.
""".strip()


def section_for_version(text: str, version: str) -> str:
    v = version.lstrip("v")
    header = re.compile(rf"^## v{re.escape(v)}\s+—", re.MULTILINE)
    match = header.search(text)
    if not match:
        raise SystemExit(f"No CHANGELOG section for v{v}")
    start = match.start()
    rest = text[start + 1 :]
    nxt = re.search(r"^## ", rest, re.MULTILINE)
    end = start + 1 + nxt.start() if nxt else len(text)
    block = text[start:end].strip()
    block = re.sub(rf"^## v{re.escape(v)}\s+—[^\n]*\n+", "", block, count=1)
    return block.strip()


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit(f"usage: {sys.argv[0]} <version e.g. 17.3.2>")
    version = sys.argv[1].lstrip("v")
    text = CHANGELOG.read_text(encoding="utf-8")
    body = section_for_version(text, version)
    print("## Highlights\n")
    print(body)
    print()
    print(FOOTER)


if __name__ == "__main__":
    main()
