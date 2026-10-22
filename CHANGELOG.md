# Changelog

## v17.7.0 — 2026-10-22

**About and Donate in the menu, and a menu-position fix.**

- **Fix:** after right-clicking the top-bar clock, the next left-click on the panel icon opened the menu over by the clock. The menu now goes back to the icon whenever it closes, and a left-click on the icon always opens it under the icon
- **About Numeric Clock** in the quick menu opens Preferences straight on the About page (new `prefs-page` setting)
- **Donate** in the quick menu opens the PayPal donation page
- New screenshots, collage, social preview and demo video for 17.7 ([YouTube](https://youtu.be/VlcEy6rQHBw))
- Tests cover the menu anchor after a clock right-click, the new items, and opening Preferences on the About page

## v17.6.1 — 2026-10-22

**Fix: a stray key press could replace the clock format.**

- Preferences opened with the format field focused and its text selected, and every key press was saved at once, so typing anything (for example `\\`) replaced the whole format. Now the window opens with nothing focused, and the format is saved only when you press **Enter** or the ✓ button
- Empty formats and formats without any `%` code are refused instead of saved; the preview shows what you type before you apply it
- Opening Preferences from the panel icon no longer logs "Unhandled promise rejection" when the Extensions app is slow to answer
- New `tools/prefs-test.sh` checks the Preferences behaviour in plain gjs

> **Recommended upgrade** from v17.6.0. If your clock shows odd text, open Preferences and press **Reset**.

## v17.6.0 — 2026-10-22

**Menu styles and distinct panel icon clicks.**

- **Menu style: System, Light or Dark** — in Preferences → Appearance or straight from the quick menu. System follows the shell theme; Light and Dark use Numeric Clock's own colors for the menu and tooltip
- **Panel icon clicks do different things:** left-click opens the quick menu, **right-click opens Preferences**, **middle-click copies the current time**. Right- and middle-click are configurable (quick menu, Preferences, copy time); the tooltip shows the hints
- Right-clicking the top-bar clock now opens the quick menu under the clock instead of under the icon
- Gallery redone from a real GNOME Shell session with descriptive file names (tray menu, presets, menu styles, clock menu, tooltip, copy, Preferences); new collage and a more readable social preview
- Nested smoke test covers click actions and menu styles (31 checks)
- Narrated 1080p demo video (README and [Discussion #76](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/discussions/76)), made with `tools/media/demo_video.py`

## v17.5.0 — 2026-10-22

**GNOME Shell 51 support, a sharper icon, and an audit of the clock engine.**

- GNOME Shell **51** in `shell-version` (now 45–51). Numeric Clock uses nothing GNOME 51 removed or changed (`St` `vertical`, async `disable()`, `ui/pointerWatcher.js`, `Shell.GLSLEffect`, `Clutter.get_default_backend()`, `PopupMenu.open()` animation argument), per the official porting guide
- **Smooth tick now really ticks on the second.** It used `timeout_add_seconds()` after the first tick, which GLib shifts by a per-session offset, so seconds could lag by up to one second. Each tick now lands within ~10 ms of the boundary
- **Invalid or empty formats no longer blank the clock** — GLib returns `null` instead of throwing, and an empty string showed nothing. Both fall back to the default format; Preferences marks the format field red
- **Disabling restores the stock clock immediately** (it previously waited up to a minute for GNOME's next update) and puts back the clock label's original click behavior
- **"Only change the top bar clock" off is safer:** other labels are taken over only when their whole text looks like a clock or they carry a `clock` style class. Previously any label containing a day or month word ("Monday", "may") or a time ("meeting at 10:30") — including notifications and the calendar's world clocks — could be overwritten. The full stage scan also runs every 5 s instead of every second
- Hooked labels are released when destroyed, so long sessions no longer collect stale signal handlers
- Right-click menu opens next to the clock when the panel icon is hidden
- Panel icon **redrawn on the 16 px pixel grid** (crisp hands, no tick merging into the hand) and sized by the shell theme like other status icons instead of a forced 18 px
- Working hover **tooltip** on the panel icon showing the current time (the old tooltip call did nothing in GNOME Shell)
- Quick menu: Preferences moved to the bottom, preset notifications name the preset
- New preset: **ISO date + week number** (`%Y-%m-%d W%V %H:%M`)
- Preferences rebuilt with libadwaita rows bound directly to settings, so changes from the panel menu show up live; presets show a live sample; new **format codes** cheat sheet; search; the preview timer stops when the window closes
- Strings marked for translation with the extension's gettext domain
- Repository: ESLint + ShellCheck CI, nested GNOME Shell smoke test (`tools/nested-smoke-test.sh`), deterministic `tools/build.sh`, `tools/validate.sh` checks the zip against `src/metadata.json`, CONTRIBUTING, Code of Conduct, SUPPORT, release checklist, Discussions link in the issue chooser
- Release zips now get a Sigstore build-provenance attestation (`gh attestation verify`), like EaseHub
- Panel icon uses the Adwaita symbolic fill color like the other extensions
- New HD screenshots, collage and social preview for v17.5.0; README FAQ, keywords and topics for search

> **Recommended upgrade** for everyone on v17.4.4 and earlier.

## v17.4.4 — 2026-06-11

**Fix extension enable crash on GNOME Shell 46.**

- Remove `theme.load_stylesheet()` (not available on Shell 46) — use `icon_size: 18` on the panel icon instead
- Extension enables cleanly with no journal errors

> **Recommended upgrade** from v17.4.3 and earlier.

## v17.4.3 — 2026-06-11

**UI fixes, clearer panel icon, and release CI repair.**

- Redesign panel icon as a **bold analog clock** (more visible, no keyboard-like segments)
- Add `stylesheet.css` for slightly larger panel icon (18px)
- Fix preferences presets layout — each preset is a normal horizontal row with **Apply** button (no vertical/garbled text)
- Fix release CI `startup_failure` — pin `actions/checkout` SHA (same as validate workflow) and install `gnome-shell-extensions` on CI

> **Recommended upgrade** from v17.4.2 and earlier.

## v17.4.2 — 2026-06-11

**Fix extension enable crash on quick-presets submenu.**

- `PopupSubMenuMenuItem` now passes `wantIcon=true` so `presets.icon` exists on GNOME 45–50
- Extension enables cleanly again after disable or Shell reload

> **Recommended upgrade** from v17.4.1 if enable failed with `TypeError: presets.icon is undefined`.

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
