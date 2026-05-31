# Changelog

## v17.3.1 — 2026-05-31

### GNOME 45–50 (ESM, extension version 21)

- **Fix:** GNOME Shell 46 — connect only `child-added` / `child-removed` (never `actor-added` on MetaStage)
- **Fix:** Restore GNOME default clock when extension is disabled or uninstalled
- **Prefs:** Live preview ticks every second when format includes `%S` / `%T`
- **Prefs:** Preset renamed to **DD/MM + seconds** (public preset for any timezone, not Israel-only)
- Default `only-topbar`: **true** (lock screen clock unchanged by default)
- **Supersedes v17.3.0 and earlier** — download only from [latest release](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/releases/latest)

## v17.3.0 — 2026-05-30 (superseded by v17.3.1)

- GNOME Shell 48–50 support; extension version 20
- GNOME 46 stage signal migration (partial — use v17.3.1 for full fix)
- Israel preset, DD/MM/YYYY defaults

## Unreleased (merged into v17.3.1)

- Restore GNOME default clock display when the extension is disabled or uninstalled.
- Prefs: clarify DD/MM + seconds preset is for all users (system timezone), not Israel-only code.
