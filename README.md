# Numeric Clock (GNOME Shell Extension)

**Quick links**

* **Install on GNOME Extensions (E.G.O.)**: [https://extensions.gnome.org/extension/8566/numeric-clock/](https://extensions.gnome.org/extension/8566/numeric-clock/)
* **Latest Release (ZIPs)**: [https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/releases/latest](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/releases/latest)
* **Issues / feedback**: [https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/issues](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/issues)

A lightweight GNOME Shell extension that replaces the top-bar clock with a numeric, fully configurable format (e.g., `DD/MM/YYYY HH:MM`). Works on **GNOME 45+** (Wayland & Xorg). Licensed under MIT.

**UUID:** `numeric-clock@nickotmazgin`

## Screenshot

![Numeric Clock — Top bar & Preferences](screenshots/numeric-clock_screenshot.png)


## Features

* Fully numeric date/time (you choose the `strftime` format string).
* **Instant-apply** preferences — changes apply as you type.
* Configurable **update interval** (seconds).
* Plays nice with panels that also draw a clock (keeps visible labels in sync).
* Safe text rendering (forces plain text; no Pango markup).

## Compatibility

* **GNOME Shell: 45+**
* Sessions: **Wayland** and **Xorg**

---

## Install

### A) From **extensions.gnome.org** (recommended)

Open **Extensions** (or **Extension Manager**) → **Browse** and search for **“Numeric Clock”** (UUID: `numeric-clock@nickotmazgin`) → toggle **On** → **Preferences** to configure.
Direct link: [https://extensions.gnome.org/extension/8566/numeric-clock/](https://extensions.gnome.org/extension/8566/numeric-clock/)

### B) From a **GitHub release** (manual install)

Download the latest `numeric-clock@nickotmazgin.shell-extension.zip` from Releases, then:

```bash
gnome-extensions install --force numeric-clock@nickotmazgin.shell-extension.zip
gnome-extensions enable numeric-clock@nickotmazgin
gnome-extensions prefs  numeric-clock@nickotmazgin
```

### C) From source (developer install)

```bash
# Clone this repo
git clone https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock.git
cd Linux-Numeric-Date-And-Clock/numeric-clock@nickotmazgin

# (Dev only) compile the local schema for testing
glib-compile-schemas schemas

# Pack & install for your user
gnome-extensions pack . --force --out-dir /tmp
gnome-extensions install --force /tmp/numeric-clock@nickotmazgin.shell-extension.zip

# Enable & open preferences
gnome-extensions enable numeric-clock@nickotmazgin
gnome-extensions prefs  numeric-clock@nickotmazgin
```

> **Note:** For GNOME 44+ installs via E.G.O./`gnome-extensions`, schemas are auto-compiled. **Do not commit** `schemas/gschemas.compiled`. (It’s a build artifact and is ignored by `.gitignore`.)

---

## Usage

Open Preferences and set:

* **Format string** — uses `strftime`. Examples:

  * `%A %d/%m/%Y %H:%M` → `Sunday 24/08/2025 22:04`
  * `%Y-%m-%d %H:%M:%S` → `2025-08-24 22:04:09`
  * `%d.%m.%Y  %H:%M` → `24.08.2025  22:04`
* **Update interval (seconds)** — how often to refresh.

Changes apply immediately as you type.

### Quick `strftime` cheatsheet

`%A` full weekday, `%a` short • `%d` day • `%m` month • `%Y` year • `%H` hour (00–23) • `%M` minute • `%S` second

---

## Troubleshooting

Seeing two clocks? Disable other clock extensions (e.g., *Clock Override*):

```bash
gnome-extensions list | grep -i clock
gnome-extensions disable clock-override@gnomeshell.kryogenix.org || true
```

Reset to defaults:

```bash
gsettings reset-recursively org.gnome.shell.extensions.numeric-clock
```

Manually set preferences:

```bash
gsettings set org.gnome.shell.extensions.numeric-clock format-string '%A %d/%m/%Y %H:%M'
gsettings set org.gnome.shell.extensions.numeric-clock update-interval 60
```

Logs:

```bash
journalctl --user -b 0 -o cat | grep -i numeric-clock
```

---

## Packaging & Releases (for maintainers)

1. Bump the integer `"version"` in `numeric-clock@nickotmazgin/metadata.json` (E.G.O. sees this).
2. Ensure repo URL is set to:

   ```json
   "url": "https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock"
   ```
3. Build the release zip from inside `numeric-clock@nickotmazgin/`:

   ```bash
   rm -f schemas/gschemas.compiled
   gnome-extensions pack . --force --out-dir ..
   # Produces: ../numeric-clock@nickotmazgin.shell-extension.zip
   ```
4. Create a GitHub Release and upload the zip.
   *(Optional: attach a “Legacy 42–44” zip from the legacy branch for manual installs.)*

---

## Privacy

No network access. The extension only formats and sets the top-bar label.

## License

MIT © Nick Otmazgin

## Links

* **Releases:** [https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/releases](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/releases)
* **Issues:** [https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/issues](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/issues)
* **Website (Extensions “Website” button):** [https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock)
* **Contact:** [nickotmazgin.dev@gmail.com](mailto:nickotmazgin.dev@gmail.com)
