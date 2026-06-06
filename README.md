# Numeric Clock (GNOME Shell Extension)

[![Release](https://img.shields.io/github/v/release/nickotmazgin/Linux-Numeric-Date-And-Clock?include_prereleases=false&display_name=tag&label=release)](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/nickotmazgin/Linux-Numeric-Date-And-Clock/total?label=downloads&color=success)](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/releases)
[![License: MIT](https://img.shields.io/github/license/nickotmazgin/Linux-Numeric-Date-And-Clock)](LICENSE)
[![GNOME 45–50](https://img.shields.io/badge/GNOME-45%E2%80%9350-4A86CF?logo=gnome&logoColor=white)](#compatibility)
[![ESM](https://img.shields.io/badge/ESM-GJS%20modules-orange)](#compatibility)
[![Wayland](https://img.shields.io/badge/Wayland-ready-0078D4)](#compatibility)

[![Issues](https://img.shields.io/github/issues/nickotmazgin/Linux-Numeric-Date-And-Clock)](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/issues)
[![Discussions](https://img.shields.io/github/discussions/nickotmazgin/Linux-Numeric-Date-And-Clock?label=discussions&color=8B5CF6)](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/discussions)
[![i18n](https://img.shields.io/badge/i18n-gettext-blue)](#features)
[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-ff5c93?logo=github-sponsors&logoColor=white)](https://github.com/sponsors/nickotmazgin)
[![PayPal](https://img.shields.io/badge/Donate-PayPal-0070BA?logo=paypal&logoColor=white)](https://www.paypal.com/donate/?hosted_button_id=4HM44VH47LSMW)

A lightweight GNOME Shell extension that replaces the top-bar clock with a **numeric, fully configurable** format — ideal for **DD/MM/YYYY** and **24-hour** time with optional **seconds**.

**Latest:** v17.3.2 — ESM build v22 for **GNOME 45–50** (Shell 46 tested on Zorin OS 18.1)

> Download only [v17.3.2](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/releases/latest).

**UUID:** `numeric-clock@nickotmazgin`

> **Keywords:** GNOME clock · numeric date · DD/MM/YYYY · 24-hour time · seconds · top bar · Israel timezone · Linux desktop · open source

> **GNOME Shell 42–44 is no longer supported.** Numeric Clock requires **GNOME 45–50**.

---

## Quick links

* **Latest release (ZIPs):** [GitHub Releases](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/releases/latest)
* **Issues:** [Report a bug](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/issues)
* **Discussions:** [Ask a question](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/discussions)

---

## Screenshot

![Numeric Clock — top bar, settings, and about (2026)](screenshots/collage-2026.png)

---

## Features

* Fully numeric date/time — you choose the `strftime` **format string**
* **Israel-friendly defaults:** `DD/MM/YYYY HH:MM:SS` (24-hour, seconds, system timezone e.g. `Asia/Jerusalem`)
* **Live preview** in settings — ticks every second when format shows seconds
* Configurable **update interval** (1–300 seconds)
* **Smooth second tick** alignment when showing seconds
* Presets: Default, Seconds (with weekday), **DD/MM + seconds** (any timezone)
* **Restore default clock** when disabled or uninstalled
* Safe plain-text rendering (no Pango markup)
* No network access, telemetry, or external services

---

## Compatibility

| GNOME | Status | Extension version | Notes |
| ----- | ------ | ----------------: | ----- |
| **45–50** | **Supported** | 22 | ESM build; do not ship `schemas/gschemas.compiled` |
| **42–44** | **Discontinued** | — | No longer built or maintained |

**Minimum requirement:** GNOME Shell **45**.

---

## Install

### From GitHub release (recommended)

```bash
gnome-extensions install --force dist/numeric-clock@nickotmazgin.v22.shell-extension.zip
gnome-extensions enable numeric-clock@nickotmazgin
gnome-extensions prefs numeric-clock@nickotmazgin
```

### Build locally

```bash
./tools/build.sh
./tools/validate.sh
gnome-extensions install --force dist/numeric-clock@nickotmazgin.v22.shell-extension.zip
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

Changes apply immediately as you type.

### Israel setup (example)

Set your system timezone to `Asia/Jerusalem`, then use the **Israel** preset or:

```bash
gsettings set org.gnome.shell.extensions.numeric-clock format-string '%d/%m/%Y %H:%M:%S'
gsettings set org.gnome.shell.extensions.numeric-clock update-interval 1
gsettings set org.gnome.shell.extensions.numeric-clock smooth-second true
gsettings set org.gnome.shell.extensions.numeric-clock only-topbar true
```

Example output: `30/05/2026 18:20:06`

### Quick `strftime` cheatsheet

`%A` weekday · `%a` short weekday · `%d` day · `%m` month · `%Y` year · `%H` hour (00–23) · `%M` minute · `%S` second

Examples:

* `%d/%m/%Y %H:%M:%S` → `30/05/2026 18:20:06`
* `%A %d/%m/%Y %H:%M:%S` → `Saturday 30/05/2026 18:20:06`
* `%Y-%m-%d %H:%M:%S` → `2026-05-30 18:20:06`

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
./tools/build.sh    # -> dist/numeric-clock@nickotmazgin.v22.shell-extension.zip (GNOME 45–50)
./tools/validate.sh
```

Tag `v*.*.*` to trigger CI upload of ZIPs to GitHub Releases.

Do **not** commit `schemas/gschemas.compiled` to the repo.

---

## Privacy

No network access. Only local preferences are stored.

---

## License

MIT © Nick Otmazgin — see [LICENSE](LICENSE).

---

## Support

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-ff5c93?logo=github-sponsors&logoColor=white)](https://github.com/sponsors/nickotmazgin)
[![PayPal](https://img.shields.io/badge/Donate-PayPal-0070BA?logo=paypal&logoColor=white)](https://www.paypal.com/donate/?hosted_button_id=4HM44VH47LSMW)

---

## Contact

[nickotmazgin.dev@gmail.com](mailto:nickotmazgin.dev@gmail.com)

---

## Find this project

**GitHub topics:** `gnome-shell-extension` · `clock` · `24-hour` · `numeric-date` · `top-bar` · `seconds` · `wayland` · `linux` · `open-source`

**Search for:** GNOME numeric clock, Linux top bar date format, DD/MM/YYYY clock extension, 24 hour clock GNOME

## More GNOME extensions by Nick Otmazgin

- [ClipFlow Pro](https://github.com/nickotmazgin/clipflow-pro) — clipboard history manager with pins, stars & privacy
- [Comfort Control (EaseHub)](https://github.com/nickotmazgin/comfort-control-easehub) — panel menu for power, screenshots, updates & utilities
