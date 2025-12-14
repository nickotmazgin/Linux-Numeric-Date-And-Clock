
# Numeric Clock (GNOME Shell Extension)

A lightweight GNOME Shell extension that replaces the top-bar clock with a **numeric, fully configurable** format (e.g., `DD/MM/YYYY HH:MM`).
Works on **GNOME 42 → 45+** (Wayland & Xorg). Licensed under **MIT**.

**UUID:** `numeric-clock@nickotmazgin`

> Using GNOME **42–44**? See the [`legacy/42-44` branch](../../tree/legacy/42-44).

---

## Quick links

* **Latest GitHub Release (ZIPs)**: [https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/releases/latest](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/releases/latest)
* **Issues**: [https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/issues](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/issues)
* **Discussions**: [https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/discussions](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/discussions)

---

## Screenshot

![Numeric Clock — top bar & preferences](screenshots/numeric-clock_screenshot.png)

---

## Features

* Fully numeric date/time (you choose the `strftime` **format string**).
* **Instant-apply** preferences — changes apply as you type.
* Configurable **update interval** (seconds).
* Plays nice with other clocks (keeps visible labels in sync).
* Safe text rendering (plain text; no Pango markup).
* No network access, telemetry, or external services.

---

## Compatibility & builds

| Build (branch)              |     GNOME | Settings schema ID                         | Packaging notes                                               |
| --------------------------- | --------: | ------------------------------------------ | ------------------------------------------------------------- |
| **Main** (`main`)           |   **45+** | `org.gnome.shell.extensions.numeric-clock` | Do not include `schemas/gschemas.compiled`. Metadata includes `"icon": "icon.png"`. |
| **Legacy** (`legacy/42-44`) | **42–44** | `org.gnome.shell.extensions.numeric-clock` | Must include `schemas/gschemas.compiled` inside the ZIP.      |

---

## Install

### Manual install (ZIP)

```bash
# 45+
gnome-extensions install --force numeric-clock@nickotmazgin-gnome45-*.zip

# 42–44 (legacy)
gnome-extensions install --force numeric-clock@nickotmazgin-legacy-42-44-*.zip

# Enable + open preferences
gnome-extensions enable numeric-clock@nickotmazgin
gnome-extensions prefs  numeric-clock@nickotmazgin
```

> **Note:** 45+ ZIPs **must not** contain `schemas/gschemas.compiled`.
> 42–44 ZIPs **must** contain `schemas/gschemas.compiled`.

---

## Usage

Open **Preferences** and set:

* **Format string** — any `strftime` pattern.
* **Update interval (seconds)** — how often to refresh.

Changes apply immediately as you type.

### Quick `strftime` cheatsheet

`%A` weekday • `%a` short weekday • `%d` day • `%m` month • `%Y` year • `%H` hour (00–23) • `%M` minute • `%S` second

Examples:

* `%A %d/%m/%Y %H:%M` → `Sunday 24/08/2025 22:04`
* `%Y-%m-%d %H:%M:%S` → `2025-08-24 22:04:09`
* `%d.%m.%Y  %H:%M` → `24.08.2025  22:04`

---

## Troubleshooting

**Clock missing or doubled?**

* List clock-like extensions and disable the extra one:

  ```bash
  gnome-extensions list | grep -Ei 'clock|date|time'
  gnome-extensions disable <conflicting-extension-uuid>
  ```
* If the panel label doesn’t refresh:

  * Make sure your **Update interval** is > 0.
  * On **Xorg** you can press **Alt+F2**, type `r`, Enter (restart shell).
    On **Wayland**, log out and back in.

**Reset preferences (45+ schema):**

```bash
gsettings reset-recursively org.gnome.shell.extensions.numeric-clock
```

**Check what’s installed / enabled:**

```bash
gnome-extensions info numeric-clock@nickotmazgin
gnome-extensions list --enabled
```

**Logs:**

```bash
journalctl --user -b 0 -o cat | grep -i numeric-clock
```

---

## Packaging & releases (for maintainers)

**Common metadata fields:**

```json
{
  "uuid": "numeric-clock@nickotmazgin",
  "name": "Numeric Clock",
  "description": "Top-bar clock with a numeric format (DD/MM/YYYY 24-hour).",
  "settings-schema": "org.gnome.shell.extensions.numeric-clock",
  "url": "https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock"
}
```

**45+ build (from `main`):**

```bash
cd numeric-clock@nickotmazgin
rm -f schemas/gschemas.compiled                  # must NOT ship on 45+
# ensure metadata has "icon": "icon.png"
gnome-extensions pack . --force --out-dir ..
# -> ../numeric-clock@nickotmazgin.shell-extension.zip
```

**Legacy 42–44 build (from `legacy/42-44`):**

```bash
cd numeric-clock@nickotmazgin
glib-compile-schemas schemas                     # produce schemas/gschemas.compiled
gnome-extensions pack . --force --out-dir ..
# -> ../numeric-clock@nickotmazgin.shell-extension.zip
```

**Release flow**

1. Upload the appropriate ZIP(s) to **GitHub Releases**.

> Do **not** commit `schemas/gschemas.compiled` to the repo; it’s a build artifact (only inside the legacy ZIP).

---

## Privacy

No network access. Only local preferences are stored.

---

## License

MIT © Nick Otmazgin — see [LICENSE](LICENSE).

---

## Support

If you enjoy the extension and want to support development:
**PayPal:** [https://www.paypal.com/paypalme/nickotmazgin](https://www.paypal.com/paypalme/nickotmazgin)

---

## Contact

[nickotmazgin.dev@gmail.com](mailto:nickotmazgin.dev@gmail.com)

---
