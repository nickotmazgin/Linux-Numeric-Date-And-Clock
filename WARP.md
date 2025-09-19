# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a GNOME Shell extension that replaces the top-bar clock with a customizable numeric format. The extension supports two separate builds:

- **Main branch (`src/`)**: GNOME 45 only, using ES modules (ESM)
- **Legacy source (`src-legacy/`)**: GNOME 42-44, using CommonJS-style imports

The extension dynamically finds and replaces all clock-like labels in the GNOME Shell UI, including third-party extensions and desktop environments like Zorin OS.

## Architecture

### Core Components

- **`extension.js`**: Main extension logic that handles clock detection and replacement
  - **Main (`src/`)**: ES modules with class-based Extension architecture
  - **Legacy (`src-legacy/`)**: CommonJS with function-based architecture
  - Implements sophisticated clock detection using regex patterns and UI introspection
  - Manages timer-based updates and settings synchronization
  - Uses Symbol-based markers (`HOOKED`) to prevent duplicate signal connections

- **`prefs.js`**: Preferences UI
  - **Main**: Uses Adw (Adwaita) widgets for GNOME 45
  - **Legacy**: Uses legacy GTK4 widgets for GNOME 42-44
  - Real-time settings updates with instant preview
  - Format string validation and user input handling

- **`schemas/org.gnome.shell.extensions.numeric-clock.gschema.xml`**: GSettings schema
  - `format-string` (string): strftime pattern for clock display (default: `'%A %d/%m/%Y %H:%M'`)
  - `update-interval` (integer): Refresh rate in seconds (default: 60)

- **`metadata.json`**: Extension metadata
  - **Main**: version 7, GNOME Shell 45, includes `"icon": "icon.png"`
  - **Legacy**: version 12, GNOME Shell 42-44, no icon key

- **`icon.png`**: Extension icon (10KB, only in main branch)

### Key Design Patterns

- **Clock Detection Algorithm**: Multi-layered approach finding clocks by:
  1. Direct GNOME panel dateMenu references (`_clockDisplay`, `_clock`, `_time`)
  2. CSS class names containing "clock" or "date" (case-insensitive)
  3. Widget names containing "clock" or "date" (case-insensitive)
  4. Text content matching time/date patterns using regex:
     - Time: `/(^|\s)\d{1,2}:\d{2}(:\d{2})?(\s|$)/i`
     - Months: `/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i`
     - Days: `/\b(sun|mon|tue|wed|thu|fri|sat)\b/i`

- **Signal Management**: Careful connection/disconnection of:
  - Settings change signals (`changed::format-string`, `changed::update-interval`)
  - Stage actor signals (`actor-added`, `actor-removed`)
  - Individual label text change signals (`notify::text`) to override other extensions
  - All signals properly cleaned up in `disable()` method

- **Format Safety**: Forces plain text rendering (`set_use_markup(false)`) to prevent Pango markup injection issues

- **Timer Management**: Uses `GLib.timeout_add_seconds()` with proper cleanup and rescheduling

## Branch Structure

- **`main`**: Current development branch, GNOME 45 only
- **`legacy/42-44`**: Legacy support branch for GNOME 42-44
- **`src/`**: GNOME 45 source code (in main branch)
- **`src-legacy/`**: GNOME 42-44 source code (in main branch for comparison)

## Common Development Tasks

### Building Extension Packages

**GNOME 45 build (from main branch):**
```bash
cd src
# Ensure no compiled schemas are present (CRITICAL for GNOME 45+)
rm -f schemas/gschemas.compiled
# Pack extension
gnome-extensions pack . --force --out-dir ..
```

**Legacy GNOME 42-44 build:**
```bash
cd src-legacy
# Compile schemas (REQUIRED for GNOME 42-44)
glib-compile-schemas schemas/
# Verify compiled schema exists
ls -la schemas/gschemas.compiled
# Pack extension
gnome-extensions pack . --force --out-dir ..
```

### Installation and Testing

**Install locally for testing:**
```bash
# Install the built package
gnome-extensions install --force numeric-clock@nickotmazgin.shell-extension.zip

# Enable extension
gnome-extensions enable numeric-clock@nickotmazgin

# Open preferences (requires extension to be enabled)
gnome-extensions prefs numeric-clock@nickotmazgin
```

**Alternative installation from source (development):**
```bash
# For GNOME 45 (main branch)
cp -r src ~/.local/share/gnome-shell/extensions/numeric-clock@nickotmazgin

# For GNOME 42-44 (legacy)
cp -r src-legacy ~/.local/share/gnome-shell/extensions/numeric-clock@nickotmazgin

# Restart GNOME Shell (Wayland: logout/login, X11: Alt+F2 -> r)
```

### Development Commands

**Check extension status:**
```bash
gnome-extensions info numeric-clock@nickotmazgin
gnome-extensions list --enabled | grep numeric-clock
gnome-extensions list --disabled | grep numeric-clock
```

**View extension logs:**
```bash
# Real-time logs
journalctl --user -f -o cat | grep -i numeric-clock

# Boot logs
journalctl --user -b 0 -o cat | grep -i numeric-clock

# GNOME Shell logs
journalctl --user -u gnome-shell -f
```

**Restart GNOME Shell (X11 only):**
```bash
# Press Alt+F2, then type 'r' and press Enter
# Or via command:
busctl --user call org.gnome.Shell /org/gnome/Shell org.gnome.Shell Eval s 'Meta.restart("Restarting…")'
```

**Settings management:**
```bash
# View current settings
gsettings list-recursively org.gnome.shell.extensions.numeric-clock

# Get specific setting
gsettings get org.gnome.shell.extensions.numeric-clock format-string
gsettings get org.gnome.shell.extensions.numeric-clock update-interval

# Set settings manually
gsettings set org.gnome.shell.extensions.numeric-clock format-string '%d/%m/%Y %H:%M:%S'
gsettings set org.gnome.shell.extensions.numeric-clock update-interval 5

# Reset all settings
gsettings reset-recursively org.gnome.shell.extensions.numeric-clock
```

### Debugging Clock Detection

To debug clock detection manually:

```bash
# Enable debug mode in legacy version by editing extension.js:
# Change: const DEBUG = false;
# To:     const DEBUG = true;

# Then check logs for detection info:
journalctl --user -f -o cat | grep -i numeric-clock
```

The extension looks for:
1. Labels with CSS classes containing: "clock", "date"
2. Labels with names containing: "clock", "date" 
3. Labels with text matching time patterns
4. Standard GNOME panel clock references

### Performance and Memory Testing

```bash
# Monitor GNOME Shell memory usage
ps aux | grep gnome-shell | grep -v grep

# Monitor extension resource usage
journalctl --user -f | grep -E "(numeric-clock|timeout|signal)"

# Test timer cleanup (should show no orphaned timers after disable)
gnome-extensions disable numeric-clock@nickotmazgin
ps aux | grep gjs  # Should not show hanging processes
```

## Version Management

### Current Versions
- **Main branch (`src/`)**: 
  - Extension version: 7
  - GNOME Shell: 45 only
  - Includes: `icon.png`, no compiled schemas
  - Metadata: `"icon": "icon.png"` required

- **Legacy (`src-legacy/`)**: 
  - Extension version: 12
  - GNOME Shell: 42, 43, 44
  - Includes: compiled schemas required
  - Metadata: no icon key

### Schema Compilation Rules
- **GNOME 45+**: Must NOT include `schemas/gschemas.compiled` (will be rejected by extensions.gnome.org)
- **GNOME 42-44**: Must include `schemas/gschemas.compiled` (required for installation)

## Release Process

1. **Prepare releases:**
   ```bash
   # Update version numbers in metadata.json files
   # Build both packages
   cd src && gnome-extensions pack . --force --out-dir ..
   cd ../src-legacy && glib-compile-schemas schemas && gnome-extensions pack . --force --out-dir ..
   ```

2. **Test installations:**
   ```bash
   gnome-extensions install --force numeric-clock@nickotmazgin.shell-extension.zip
   gnome-extensions enable numeric-clock@nickotmazgin
   # Test functionality
   gnome-extensions disable numeric-clock@nickotmazgin
   gnome-extensions uninstall numeric-clock@nickotmazgin
   ```

3. **GitHub Release:**
   - Tag version: `git tag v1.x.x && git push origin v1.x.x`
   - Upload both ZIP files to GitHub Releases
   - Include changelog and compatibility notes

4. **extensions.gnome.org submission:**
   - Upload correct ZIP for target GNOME Shell versions
   - Main branch ZIP for GNOME 45
   - Legacy ZIP for GNOME 42-44
   - Never commit `schemas/gschemas.compiled` to git repository

## Testing Checklist

### Core Functionality
- [ ] Clock replacement works on fresh GNOME installation
- [ ] Settings changes apply instantly
- [ ] Format string validation handles invalid input gracefully
- [ ] Timer updates at correct intervals
- [ ] Extension enables/disables cleanly without errors

### Compatibility Testing
- [ ] Works on Wayland and X11 sessions
- [ ] Compatible with Zorin OS desktop
- [ ] Doesn't conflict with other clock extensions
- [ ] Handles missing dateMenu gracefully
- [ ] Works with custom GNOME themes

### Edge Cases
- [ ] Invalid format strings don't crash extension
- [ ] Very short update intervals (1 second) work correctly
- [ ] Extension survives GNOME Shell restarts
- [ ] Memory doesn't leak during long-running sessions
- [ ] Signal cleanup prevents duplicate connections

### Development Testing
- [ ] Both build processes work correctly
- [ ] Installation from ZIP works
- [ ] Direct source installation works
- [ ] Settings schema validation passes
- [ ] No orphaned timers after disable

## Code Architecture Notes

### Import Patterns
**Main (ESM):**
```javascript
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
```

**Legacy (CommonJS):**
```javascript
const { Gio, GLib, St } = imports.gi;
const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
```

### Extension Structure
**Main**: Class-based extending `Extension`
**Legacy**: Function-based with `init()`, `enable()`, `disable()`

### Error Handling
- Try-catch blocks around all potentially failing operations
- Graceful fallback to default format on format string errors
- Silent failure with cleanup on signal connection errors

### Resource Management
- Symbol-based markers prevent duplicate signal connections
- Comprehensive cleanup in `disable()` methods
- Proper timer removal using `GLib.source_remove()`
- All signal IDs tracked and disconnected on disable

## Security Considerations

- **No markup rendering**: `set_use_markup(false)` prevents Pango markup injection
- **Format string validation**: Invalid formats fall back to safe default
- **No external network access**: Extension operates entirely locally
- **Minimal permissions**: Only accesses UI and settings, no file system operations
