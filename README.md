# Numeric Clock (GNOME Shell Extension)

A lightweight GNOME Shell extension that replaces the top-bar clock with a numeric, fully configurable format (e.g., `DD/MM/YYYY HH:MM`).
Works on **Wayland and Xorg** (tested on GNOME **42–45**). Licensed under MIT.

## Features

* Show a **fully numeric** date/time (you choose the format).
* **Instant-apply** preferences — there’s **no OK/Save button**; changes are applied as you type.
* **Update interval** is configurable (seconds).
* Plays nice with panels that also draw a clock (e.g., Zorin Taskbar) by updating all visible clock labels.
* Safe text rendering (forces plain text; no Pango markup).

## Requirements

* GNOME Shell 42, 43, 44, or 45.
* Either session type: **Wayland** or **Xorg**.

## Install

### Install from extensions.gnome.org (EGO)

The extension is also available on the GNOME Extensions website.  
Open the **Extensions** app (or **Extension Manager**) → **Browse** and search for **“Numeric Clock”**  
(UUID: `numeric-clock@nickotmazgin`) and toggle **On** to install.

You can also search on <https://extensions.gnome.org> and use the web toggle.  
After installing, open **Preferences** or run:
```bash
gnome-extensions prefs numeric-clock@nickotmazgin

### Recommended: install the latest released build

```bash
# 1) Download the latest release asset
curl -L -o /tmp/numeric-clock.zip \
  https://github.com/nickotmazgin/numeric-clock-gnome/releases/latest/download/numeric-clock@nickotmazgin.zip

# 2) Install the extension
gnome-extensions install --force /tmp/numeric-clock.zip

# 3) Enable and open preferences
gnome-extensions enable numeric-clock@nickotmazgin
gnome-extensions prefs  numeric-clock@nickotmazgin
```

> The **Website** button in GNOME Extensions points here:
> [https://github.com/nickotmazgin/numeric-clock-gnome](https://github.com/nickotmazgin/numeric-clock-gnome)

### From source (developer install)

```bash
git clone https://github.com/nickotmazgin/numeric-clock-gnome.git
cd numeric-clock-gnome/numeric-clock@nickotmazgin

# Compile the local schema (dev installs only)
glib-compile-schemas schemas

# Install to your user extensions dir
zip -r /tmp/numeric-clock@nickotmazgin.zip . -x '*.git*' '*.sh'
gnome-extensions install --force /tmp/numeric-clock@nickotmazgin.zip

gnome-extensions enable numeric-clock@nickotmazgin
gnome-extensions prefs  numeric-clock@nickotmazgin
```

> **Note:** release ZIPs **must not** include `schemas/gschemas.compiled`. For dev installs you compile schemas locally as shown above.

## Usage

Open **Preferences** and set:

* **Format string** — this uses `strftime`. Examples:

  * `"%A %d/%m/%Y %H:%M"` → `Sunday 24/08/2025 22:04`
  * `"%Y-%m-%d %H:%M:%S"` → `2025-08-24 22:04:09`
  * `"%d.%m.%Y  %H:%M"`  → `24.08.2025  22:04`
* **Update interval (seconds)** — how often to refresh the text.

Changes apply **immediately** as you type (no Save button).

### Quick format tips (strftime)

* `%A` = full weekday name, `%a` = short (Sun)
* `%d` = day (01–31), `%m` = month (01–12), `%Y` = year (4-digit)
* `%H` = hour (00–23), `%M` = minute, `%S` = second

## Troubleshooting

* **Still seeing a different clock?**
  Disable other clock extensions (e.g., **Clock Override**) that also change the top-bar clock:

  ```bash
  gnome-extensions list | grep -i clock
  gnome-extensions disable clock-override@gnomeshell.kryogenix.org || true
  ```

* **Reset to defaults:**

  ```bash
  gsettings reset-recursively org.nick.numericclock
  ```

* **Manually set preferences from terminal:**

  ```bash
  gsettings set org.nick.numericclock format-string '%A %d/%m/%Y %H:%M'
  gsettings set org.nick.numericclock update-interval 60
  ```

* **Logs (for debugging):**

  ```bash
  journalctl --user -b 0 -o cat | grep -i numeric-clock
  ```

## Packaging & Releases (for maintainers)

1. Bump `version` (integer) in `numeric-clock@nickotmazgin/metadata.json` (e.g., 110 for v1.1.0).
2. Ensure the repo URL is set:

   ```json
   "url": "https://github.com/nickotmazgin/numeric-clock-gnome"
   ```
3. Create the release ZIP from inside `numeric-clock@nickotmazgin/` **without** `schemas/gschemas.compiled`:

   ```bash
   rm -f schemas/gschemas.compiled
   zip -r ../numeric-clock@nickotmazgin.zip . -x '*.git*' '*.sh'
   ```
4. Tag & publish on GitHub with the asset named **`numeric-clock@nickotmazgin.zip`** so the “latest” download URL works.

## Privacy

No network access. The extension only formats and sets the top-bar text.

## License

MIT © Nick Otmazgin

## Links

* **Releases:** [https://github.com/nickotmazgin/numeric-clock-gnome/releases](https://github.com/nickotmazgin/numeric-clock-gnome/releases)
* **Issues:**   [https://github.com/nickotmazgin/numeric-clock-gnome/issues](https://github.com/nickotmazgin/numeric-clock-gnome/issues)
* **Contact:**  [nickotmazgin.dev@gmail.com](mailto:nickotmazgin.dev@gmail.com)

