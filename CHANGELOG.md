# Changelog

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
