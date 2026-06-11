# Numeric Clock (GNOME Shell Extension)

[![Release](https://img.shields.io/github/v/release/nickotmazgin/Linux-Numeric-Date-And-Clock?display_name=tag&label=release)](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/nickotmazgin/Linux-Numeric-Date-And-Clock/validate.yml?branch=main&label=CI)](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/actions)
[![Downloads](https://img.shields.io/github/downloads/nickotmazgin/Linux-Numeric-Date-And-Clock/total?label=downloads&color=success)](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/releases)
[![License: MIT](https://img.shields.io/github/license/nickotmazgin/Linux-Numeric-Date-And-Clock)](LICENSE)
[![GNOME 45–50](https://img.shields.io/badge/GNOME-45%E2%80%9350-4A86CF?logo=gnome&logoColor=white)](#compatibility)
[![ESM](https://img.shields.io/badge/ESM-GJS%20modules-orange)](#compatibility)
[![Wayland](https://img.shields.io/badge/Wayland-ready-0078D4)](#compatibility)

[![Issues](https://img.shields.io/github/issues/nickotmazgin/Linux-Numeric-Date-And-Clock)](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/issues)
[![Discussions](https://img.shields.io/github/discussions/nickotmazgin/Linux-Numeric-Date-And-Clock?label=discussions&color=8B5CF6)](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/discussions)
[![i18n](https://img.shields.io/badge/i18n-gettext-blue)](#features)
[![PayPal](https://img.shields.io/badge/Donate-PayPal-0070BA?logo=paypal&logoColor=white)](https://www.paypal.com/donate/?hosted_button_id=4HM44VH47LSMW)

A lightweight GNOME Shell extension that replaces the top-bar clock with a **numeric, fully configurable** format — ideal for **DD/MM/YYYY**, **ISO 8601**, **24-hour**, or **12-hour** time with optional **seconds**, anywhere in the world.

**Latest:** v17.4.4 — ESM build v28 for **GNOME 45–50** (Shell 46 tested on Zorin OS 18.1)

> Download only [v17.4.4](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/releases/latest). Older stable releases (v17.3.x) are kept for rollback.

**UUID:** `numeric-clock@nickotmazgin`

> **Keywords:** GNOME clock · numeric date · DD/MM/YYYY · ISO 8601 · 24-hour time · international · top bar · Linux desktop · open source

> **GNOME Shell 42–44 is no longer supported.** Numeric Clock requires **GNOME 45–50**.

---

## Quick links

* **Latest release (ZIPs):** [GitHub Releases](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/releases/latest)
* **Privacy:** [PRIVACY.md](PRIVACY.md)
* **Security:** [SECURITY.md](SECURITY.md)
* **Issues:** [Report a bug](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/issues)
* **Discussions:** [Ask a question](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/discussions)

---

## Screenshot

![Numeric Clock — top bar, settings, and about (2026)](screenshots/collage-2026.png)

---

## Features

* Fully numeric date/time — you choose the `strftime` **format string**
* **International defaults:** `DD/MM/YYYY HH:MM:SS` (24-hour, seconds; uses your **system locale and timezone**)
* **7 format presets:** International, weekday, compact, time-only, ISO 8601, US 12-hour, top-bar only
* **Live preview** in settings — ticks every second when format shows seconds
* Configurable **update interval** (1–300 seconds)
* **Smooth second tick** alignment when showing seconds
* **Panel access icon** — digital clock icon opens a quick menu (preferences, presets, copy time)
* **Right-click the formatted clock** for the same quick menu (left-click still opens GNOME calendar)
* **Restore default clock** when disabled or uninstalled
* Safe plain-text rendering (no Pango markup)
* No network access, telemetry, or external services — see [PRIVACY.md](PRIVACY.md)

---

## Compatibility

| GNOME | Status | Extension version | Notes |
| ----- | ------ | ----------------: | ----- |
| **45–50** | **Supported** | 28 | ESM build; do not ship `schemas/gschemas.compiled` |
| **42–44** | **Discontinued** | — | No longer built or maintained |

**Minimum requirement:** GNOME Shell **45**.

Works on **Zorin OS**, Ubuntu, Fedora, and other GNOME-based distributions that ship Shell 45–50.

---

## Install

### From GitHub release (recommended)

```bash
gnome-extensions install --force dist/numeric-clock@nickotmazgin.v28.shell-extension.zip
gnome-extensions enable numeric-clock@nickotmazgin
gnome-extensions prefs numeric-clock@nickotmazgin
```

### Build locally

```bash
./tools/build.sh
./tools/validate.sh
gnome-extensions install --force dist/numeric-clock@nickotmazgin.v28.shell-extension.zip
gnome-extensions enable numeric-clock@nickotmazgin
```

> **Note:** Release ZIPs **must not** contain `schemas/gschemas.compiled`.

After install, restart GNOME Shell: **Alt+F2** → `r` → Enter (Xorg) or log out/in (Wayland).

---

## Usage

Open **Preferences** and set:

* **Format string** — any `strftime` pattern
* **Update interval (seconds)** — use `1` when showing seconds
* **Smooth tick** — align updates to second boundaries
* **Show panel access icon** — digital clock icon for quick menu
* **Right-click clock for quick menu** — secondary/middle click on the formatted clock

Changes apply immediately as you type.

**Quick access:**

* Click the **panel clock icon** (system tray area) for preferences, presets, and copy time
* **Right-click** or **middle-click** the formatted top-bar clock for the same menu
* **Left-click** the clock still opens the standard GNOME calendar

### Regional examples

Numeric Clock uses your **system timezone** — set it in OS Settings. Examples:

**Europe / DD/MM (24-hour):**

```bash
gsettings set org.gnome.shell.extensions.numeric-clock format-string '%d/%m/%Y %H:%M:%S'
```

**ISO 8601 (worldwide standard):**

```bash
gsettings set org.gnome.shell.extensions.numeric-clock format-string '%Y-%m-%d %H:%M:%S'
```

**US (12-hour):**

```bash
gsettings set org.gnome.shell.extensions.numeric-clock format-string '%m/%d/%Y %I:%M:%S %p'
```

Or use the matching **preset buttons** in Preferences.

### Quick `strftime` cheatsheet

`%A` weekday · `%a` short weekday · `%d` day · `%m` month · `%Y` year · `%H` hour (00–23) · `%I` hour (01–12) · `%p` AM/PM · `%M` minute · `%S` second

Examples:

* `%d/%m/%Y %H:%M:%S` → `30/05/2026 18:20:06`
* `%Y-%m-%d %H:%M:%S` → `2026-05-30 18:20:06`
* `%m/%d/%Y %I:%M:%S %p` → `05/30/2026 06:20:06 PM`

---

## Troubleshooting

**Clock missing or doubled?**

```bash
gnome-extensions list | grep -Ei 'clock|date|time'
gnome-extensions disable <conflicting-extension-uuid>
```

**Reset preferences:**

```bash
gsettings reset-recursively org.gnome.shell.extensions.numeric-clock
```

**Check status:**

```bash
gnome-extensions info numeric-clock@nickotmazgin
gnome-extensions list --enabled
```

**Logs:**

```bash
journalctl --user -b 0 -o cat | grep -i numeric-clock
```

---

## Packaging & releases (maintainers)

```bash
./tools/build.sh    # -> dist/numeric-clock@nickotmazgin.v28.shell-extension.zip (GNOME 45–50)
./tools/validate.sh
```

Tag `v*` to trigger CI upload of ZIPs to GitHub Releases.

Do **not** commit `schemas/gschemas.compiled` to the repo.

---

## Privacy & compliance

* **Privacy:** [PRIVACY.md](PRIVACY.md) — local-only, no network, no telemetry
* **Security:** [SECURITY.md](SECURITY.md) — coordinated disclosure
* **License:** MIT — see [LICENSE](LICENSE)

This extension modifies only the top-bar clock display via supported GNOME Shell APIs. It does not bypass security, escalate privileges, or access data outside your session.

---

## License

MIT © Nick Otmazgin — see [LICENSE](LICENSE).

---

## Support

[![PayPal](https://img.shields.io/badge/Donate-PayPal-0070BA?logo=paypal&logoColor=white)](https://www.paypal.com/donate/?hosted_button_id=4HM44VH47LSMW)

---

## Contact

[nickotmazgin.dev@gmail.com](mailto:nickotmazgin.dev@gmail.com)

---

## Credits & Acknowledgements

Numeric Clock is created, maintained, signed, and released by **[Nick Otmazgin](https://github.com/nickotmazgin)** — the project's sole administrator and solo developer, who authors and reviews all code that ships.

[![AI assisted — OpenAI Codex](https://img.shields.io/badge/AI%20assisted-OpenAI%20Codex-10A37F)](https://openai.com/codex/)
[![AI assisted — Cursor Agent](https://img.shields.io/badge/AI%20assisted-Cursor%20Agent-1A1A1A)](https://cursor.com)

Recent releases were built with help from AI pair-programming agents, operated under the maintainer's direction and review:

- **OpenAI Codex** — release engineering, signed-tag release workflows, release validation and CI hardening
- **Cursor (Agent)** — code review, debugging, documentation

Every AI-assisted change is human-reviewed, tested on real GNOME sessions, and approved by the maintainer before release. See [CONTRIBUTORS.md](CONTRIBUTORS.md) for the full credits.

> OpenAI and Codex are trademarks of OpenAI. Cursor is a trademark of Anysphere, Inc. These names are used here solely for factual attribution. Numeric Clock is an independent project and is **not** affiliated with, sponsored, or endorsed by OpenAI or Anysphere/Cursor.

---

## Find this project

**GitHub topics:** `gnome-shell-extension` · `clock` · `24-hour` · `numeric-date` · `top-bar` · `seconds` · `wayland` · `linux` · `open-source`

**Search for:** GNOME numeric clock, Linux top bar date format, DD/MM/YYYY clock extension, 24 hour clock GNOME

## More GNOME extensions by Nick Otmazgin

- [ClipFlow Pro](https://github.com/nickotmazgin/clipflow-pro) — clipboard history manager with pins, stars & privacy
- [Comfort Control (EaseHub)](https://github.com/nickotmazgin/comfort-control-easehub) — panel menu for power, screenshots, updates & utilities
