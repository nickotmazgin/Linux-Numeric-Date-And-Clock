
# Numeric Clock (GNOME Shell Extension)

A lightweight GNOME Shell extension that replaces the top-bar clock with a **numeric, fully configurable** format (e.g., `DD/MM/YYYY HH:MM`).
Works on **GNOME 42 → 47** (Wayland & Xorg). Licensed under **MIT**.

![i18n](https://img.shields.io/badge/i18n-enabled-blue)

**UUID:** `numeric-clock@nickotmazgin`
**E.G.O. page:** [https://extensions.gnome.org/extension/8566/numeric-clock/](https://extensions.gnome.org/extension/8566/numeric-clock/)

> Using GNOME **42–44**? See the [`legacy/42-44` branch](../../tree/legacy/42-44).

---

## Quick links

* **Install on GNOME Extensions (E.G.O.)**: [https://extensions.gnome.org/extension/8566/numeric-clock/](https://extensions.gnome.org/extension/8566/numeric-clock/)
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

| Build (branch)              |     GNOME | Settings schema ID                         | E.G.O “Extension version” | Packaging notes                                                                         |
| --------------------------- | --------: | ------------------------------------------ | ------------------------: | --------------------------------------------------------------------------------------- |
| **Main** (`main`)           | **45–47** | `org.gnome.shell.extensions.numeric-clock` |                   **v17** | **Do not** include `schemas/gschemas.compiled`. Metadata omits `icon`. |
| **Legacy** (`legacy/42-44`) | **42–44** | `org.gnome.shell.extensions.numeric-clock` |                   **v18** | **Must** include `schemas/gschemas.compiled` inside the ZIP.                            |

> On the E.G.O. page you can pick **Shell version** (42/43/44/45/46/47) and the matching **Extension version** (v14 for 42–44, v15 for 45–47) from the dropdowns.

---

## Install

### A) From **extensions.gnome.org** (recommended)

1. Open [https://extensions.gnome.org/extension/8566/numeric-clock/](https://extensions.gnome.org/extension/8566/numeric-clock/)
2. In **Download**, set **Shell version** to your GNOME, then choose:

   - **GNOME 45–47 → Extension version v15**
   - **GNOME 42–44 → Extension version v14**
3. Click **Install** (with the browser integration), or download and install manually:

### B) Manual install (ZIP)

```bash
# 45–47
gnome-extensions install --force dist/numeric-clock@nickotmazgin.v15.shell-extension.zip

# 42–44 (legacy)
gnome-extensions install --force dist/numeric-clock@nickotmazgin.v14.shell-extension.zip

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

**E.G.O. reads the integer `"version"` in `metadata.json`:**

- **45–47 build** → `"version": 17`
- **42–44 build** → `"version": 18`

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

**45–47 build (from `main`):**

```bash
./tools/build.sh
# -> dist/numeric-clock@nickotmazgin.v15.shell-extension.zip
```

**Legacy 42–44 build (from `legacy/42-44`):**

```bash
./tools/build.sh
# -> dist/numeric-clock@nickotmazgin.v14.shell-extension.zip
```

**Release flow**

1. Upload the appropriate ZIP(s) to **GitHub Releases**.
2. On **E.G.O.**, submit the **45–47** update (v14) and keep **legacy v13** available via the dropdowns.

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
**PayPal:** https://www.paypal.com/donate/?hosted_button_id=4HM44VH47LSMW

---

## Contact

[nickotmazgin.dev@gmail.com](mailto:nickotmazgin.dev@gmail.com)

---
