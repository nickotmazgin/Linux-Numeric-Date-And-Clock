# Changelog

## v17.4.1 — 2026-06-11

**International polish, refined icon, and easier access.**

- Redesign panel icon to a cleaner **digital display** style (readable at 16px)
- Add **7 international format presets** (ISO, compact, time-only, US 12-hour, and more) via shared `presets.js`
- **Tooltip** on panel icon; **right-click / middle-click** the formatted clock for the quick menu (left-click keeps GNOME calendar)
- Documentation reframed for **worldwide** use — system locale/timezone, not region-specific
- Menu items include symbolic icons; `only-topbar` preference shows a safety note

> **Recommended upgrade** from v17.4.0 and earlier.

## v17.4.0 — 2026-06-11

**Panel access icon and quick controls.**

- Add a **top-bar clock icon** (`numeric-clock-symbolic`) for fast access to preferences, format presets, and copy-current-time
- New **Show panel access icon** preference (on by default; hide if you only want the formatted clock text)
- Fix `shellMajor()` to use the GNOME 45+ `Config` module instead of legacy `imports`
- Preferences reset now updates all toggle switches correctly
- README and install docs aligned to extension build **v24**

> **Recommended upgrade** from v17.3.3 and earlier.

## v17.3.3 — 2026-06-11

**Security and packaging hardening.**

- Cap format-string length in preferences (128 characters)
- Release validation asserts `extension.js` and `prefs.js` are present in the zip
- `only-topbar` remains default `true` (safest; disabling can affect other panel clocks)

> **Recommended upgrade** from v17.3.2 and earlier.

## End of GNOME Shell 42–44 support — 2026-06-02

**Numeric Clock no longer builds, tests, or maintains a GNOME Shell 42–44 package.**

- Removed `src-legacy/` and dual-zip packaging from `tools/build.sh`
- Deleted the `legacy/42-44` branch
- Removed legacy zip assets from GitHub Releases
- **Minimum supported Shell:** GNOME **45**

## v17.3.2 — 2026-05-31

**Current release for GNOME Shell 45–50 (ESM, extension version 22).**

### Preferences
- New **About** tab: developer name, email, version, description, and links (repo, README, issues, releases, PayPal)
- **Settings** tab holds format, preview, presets, and reset (Support/Donate moved to About)
- Preset buttons include tooltips; **DD/MM + seconds** preset verified

### Fixes (carried from v17.3.1)
- GNOME Shell 46: stage signals use `child-added` only
- Restore default GNOME clock on disable/uninstall
- Live preview ticks every second when format includes seconds

Download only from [latest release](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/releases/latest).
