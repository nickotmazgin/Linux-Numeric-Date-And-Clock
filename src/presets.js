// SPDX-License-Identifier: MIT
// Shared format presets — no GNOME Shell imports (safe for prefs + extension).

/** @typedef {{ id: string, label: string, fmt: string, interval: number, smooth: boolean, onlyTopbar?: boolean }} FormatPreset */

/** @type {FormatPreset[]} */
export const FORMAT_PRESETS = [
  {
    id: 'intl-full',
    label: 'International (DD/MM + seconds)',
    fmt: '%d/%m/%Y %H:%M:%S',
    interval: 1,
    smooth: true,
  },
  {
    id: 'weekday',
    label: 'Weekday + seconds',
    fmt: '%A %d/%m/%Y %H:%M:%S',
    interval: 1,
    smooth: true,
  },
  {
    id: 'compact',
    label: 'Compact (DD/MM HH:MM)',
    fmt: '%d/%m %H:%M',
    interval: 60,
    smooth: false,
  },
  {
    id: 'time-only',
    label: 'Time only (24-hour)',
    fmt: '%H:%M:%S',
    interval: 1,
    smooth: true,
  },
  {
    id: 'iso',
    label: 'ISO 8601',
    fmt: '%Y-%m-%d %H:%M:%S',
    interval: 1,
    smooth: true,
  },
  {
    id: 'us-12h',
    label: 'US date + 12-hour',
    fmt: '%m/%d/%Y %I:%M:%S %p',
    interval: 1,
    smooth: true,
  },
  {
    id: 'topbar-only',
    label: 'Top bar only (DD/MM + seconds)',
    fmt: '%d/%m/%Y %H:%M:%S',
    interval: 1,
    smooth: true,
    onlyTopbar: true,
  },
];

export function applyPresetToSettings(settings, preset) {
  settings.set_string('format-string', preset.fmt);
  settings.set_int('update-interval', preset.interval);
  settings.set_boolean('smooth-second', preset.smooth);
  if (preset.onlyTopbar !== undefined)
    settings.set_boolean('only-topbar', preset.onlyTopbar);
}
