# Changelog

## v17.3.0 — 2026-05-30

### GNOME 45–50 (ESM, extension version 20)

- Add GNOME Shell 48, 49, and 50 to metadata.
- GNOME Shell 46: use `child-added` / `child-removed` stage signals (GNOME 45 and earlier used `actor-added` / `actor-removed`).
- Default format: `%d/%m/%Y %H:%M:%S` (DD/MM/YYYY, 24-hour, with seconds).
- Default update interval: 1 second; smooth second tick enabled by default.
- Add **Israel** preset in preferences (DD/MM/YYYY HH:MM:SS, top bar only).
- Update README with latest release info, install steps, and Israel setup.
- Remove stale SweetTooth `_generated` metadata field.

### Legacy 42–44 (extension version 18)

- Fix legacy ZIP packaging to include `schemas/gschemas.compiled`.
