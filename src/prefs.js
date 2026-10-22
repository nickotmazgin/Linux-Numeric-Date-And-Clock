// SPDX-License-Identifier: MIT
// Numeric Clock prefs — GNOME 45+ (ESM)
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import {
  FORMAT_PRESETS, MAX_FORMAT_LENGTH, applyPresetToSettings,
  formatNow, formatShowsSeconds, isValidFormat,
} from './presets.js';

const REPO_URL = 'https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock';
const DONATE_URL = 'https://www.paypal.com/donate/?hosted_button_id=4HM44VH47LSMW';
const EMAIL = 'nickotmazgin.dev@gmail.com';
const AUTHOR = 'Nick Otmazgin';
const SETTING_KEYS = [
  'format-string', 'update-interval', 'only-topbar', 'smooth-second',
  'show-panel-icon', 'clock-secondary-opens-menu',
];
const CHEATSHEET = [
  ['%d / %m / %Y', 'Day · month · year (22 / 10 / 2026)'],
  ['%H : %M : %S', '24-hour time (13:05:09)'],
  ['%I %p', '12-hour clock with AM/PM'],
  ['%a / %A', 'Short / full weekday'],
  ['%b / %B', 'Short / full month name'],
  ['%V / %j', 'ISO week number / day of year'],
  ['%e / %-d', 'Day without leading zero'],
  ['%Z', 'Time zone abbreviation'],
];

function launchUri(uri) {
  try { Gio.AppInfo.launch_default_for_uri(uri, null); } catch (_e) {}
}

function switchRow(settings, key, title, subtitle) {
  const row = new Adw.SwitchRow({ title, subtitle });
  settings.bind(key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
  return row;
}

export default class NumericClockPrefs extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings();
    const metadata = this.metadata || {};
    window.default_width = 600;
    window.default_height = 680;
    window.search_enabled = true;

    // ── Settings page ───────────────────────────────────────────────
    const pageSettings = new Adw.PreferencesPage({
      title: _('Settings'),
      icon_name: 'preferences-system-symbolic',
    });

    const groupFormat = new Adw.PreferencesGroup({
      title: _('Clock format'),
      description: _('Uses your system locale and timezone'),
    });

    const rowFmt = new Adw.EntryRow({ title: _('Format string') });
    settings.bind('format-string', rowFmt, 'text', Gio.SettingsBindFlags.DEFAULT);
    groupFormat.add(rowFmt);

    const rowPreview = new Adw.ActionRow({ title: _('Preview') });
    const preview = new Gtk.Label({ selectable: true, hexpand: true, xalign: 1, wrap: true, css_classes: ['numeric'] });
    rowPreview.add_suffix(preview);
    groupFormat.add(rowPreview);

    // Live sample shown as each preset row's subtitle.
    const presetRows = [];
    let previewTimer = 0;
    const refreshPreview = () => {
      const fmt = settings.get_string('format-string');
      const valid = isValidFormat(fmt);
      preview.label = formatNow(fmt);
      rowPreview.subtitle = valid
        ? _('Live sample')
        : _('Invalid or empty format — the clock shows the default format');
      if (valid) rowFmt.remove_css_class('error');
      else rowFmt.add_css_class('error');
      for (const [row, preset] of presetRows)
        row.subtitle = `${preset.fmt}  →  ${formatNow(preset.fmt)}`;
    };
    const restartPreviewTimer = () => {
      if (previewTimer) GLib.source_remove(previewTimer);
      const fmt = settings.get_string('format-string');
      const sec = formatShowsSeconds(fmt) ? 1 : Math.min(60, Math.max(1, settings.get_int('update-interval')));
      previewTimer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, sec, () => {
        refreshPreview();
        return GLib.SOURCE_CONTINUE;
      });
      refreshPreview();
    };

    const cheatsheet = new Adw.ExpanderRow({
      title: _('Format codes'),
      subtitle: _('Common strftime codes — combine them freely'),
    });
    for (const [code, meaning] of CHEATSHEET) {
      const row = new Adw.ActionRow({ title: code, subtitle: _(meaning) });
      row.add_css_class('property');
      cheatsheet.add_row(row);
    }
    groupFormat.add(cheatsheet);
    pageSettings.add(groupFormat);

    const groupBehavior = new Adw.PreferencesGroup({ title: _('Behavior') });
    const rowInt = new Adw.SpinRow({
      title: _('Update interval (seconds)'),
      subtitle: _('Use 1 when the format shows seconds'),
      adjustment: new Gtk.Adjustment({ lower: 1, upper: 300, step_increment: 1, page_increment: 5 }),
      numeric: true,
    });
    settings.bind('update-interval', rowInt, 'value', Gio.SettingsBindFlags.DEFAULT);
    groupBehavior.add(rowInt);
    groupBehavior.add(switchRow(settings, 'smooth-second',
      _('Smooth tick'),
      _('Update exactly on each second boundary')));
    groupBehavior.add(switchRow(settings, 'only-topbar',
      _('Only change the top bar clock'),
      _('Recommended. When off, other panel and dock clocks are formatted too.')));
    pageSettings.add(groupBehavior);

    const groupAccess = new Adw.PreferencesGroup({ title: _('Quick access') });
    groupAccess.add(switchRow(settings, 'show-panel-icon',
      _('Show panel icon'),
      _('Clock icon in the top bar with presets, copy time and preferences')));
    groupAccess.add(switchRow(settings, 'clock-secondary-opens-menu',
      _('Right-click clock for quick menu'),
      _('Right-click or middle-click the clock. Left-click still opens the GNOME calendar.')));
    pageSettings.add(groupAccess);

    const groupPresets = new Adw.PreferencesGroup({
      title: _('Format presets'),
      description: _('One-click formats — the sample uses your system locale and timezone'),
    });
    for (const preset of FORMAT_PRESETS) {
      const row = new Adw.ActionRow({ title: _(preset.label) });
      row.add_css_class('property');
      const btn = new Gtk.Button({ label: _('Apply'), valign: Gtk.Align.CENTER });
      btn.connect('clicked', () => applyPresetToSettings(settings, preset));
      row.add_suffix(btn);
      row.activatable_widget = btn;
      groupPresets.add(row);
      presetRows.push([row, preset]);
    }
    pageSettings.add(groupPresets);

    const groupReset = new Adw.PreferencesGroup();
    const rowReset = new Adw.ActionRow({
      title: _('Reset to defaults'),
      subtitle: _('Restore every setting on this page'),
    });
    const btnReset = new Gtk.Button({
      label: _('Reset'), valign: Gtk.Align.CENTER, css_classes: ['destructive-action'],
    });
    btnReset.connect('clicked', () => {
      for (const key of SETTING_KEYS)
        settings.reset(key);
    });
    rowReset.add_suffix(btnReset);
    rowReset.activatable_widget = btnReset;
    groupReset.add(rowReset);
    pageSettings.add(groupReset);

    // ── About page ──────────────────────────────────────────────────
    const pageAbout = new Adw.PreferencesPage({
      title: _('About'),
      icon_name: 'help-about-symbolic',
    });

    const groupInfo = new Adw.PreferencesGroup({ title: _('Extension') });
    const infoRow = (title, subtitle) => {
      const row = new Adw.ActionRow({ title, subtitle, subtitle_selectable: true });
      row.add_css_class('property');
      groupInfo.add(row);
    };
    infoRow(_('Name'), metadata.name || 'Numeric Clock');
    infoRow(_('Version'), metadata['version-name'] || String(metadata.version ?? ''));
    infoRow(_('Developer'), AUTHOR);
    infoRow(_('Description'),
      _('International numeric top-bar clock — configurable date/time format, panel icon, and live preview.'));
    pageAbout.add(groupInfo);

    const groupLinks = new Adw.PreferencesGroup({ title: _('Links') });
    const addLinkRow = (title, uri, icon = 'go-next-symbolic') => {
      const row = new Adw.ActionRow({ title, activatable: true });
      row.add_suffix(new Gtk.Image({ icon_name: icon }));
      row.connect('activated', () => launchUri(uri));
      groupLinks.add(row);
    };
    addLinkRow(_('GitHub repository'), REPO_URL);
    addLinkRow(_('Report an issue'), `${REPO_URL}/issues`);
    addLinkRow(_('Latest release'), `${REPO_URL}/releases/latest`);
    addLinkRow(_('Donate via PayPal'), DONATE_URL);
    addLinkRow(EMAIL, `mailto:${EMAIL}`, 'mail-unread-symbolic');
    pageAbout.add(groupLinks);

    window.add(pageSettings);
    window.add(pageAbout);

    // Trim over-long formats; settings.bind() writes the trimmed text back.
    rowFmt.connect('changed', () => {
      if (rowFmt.text.length > MAX_FORMAT_LENGTH)
        rowFmt.text = rowFmt.text.slice(0, MAX_FORMAT_LENGTH);
    });
    const settingsIds = [
      settings.connect('changed::format-string', restartPreviewTimer),
      settings.connect('changed::update-interval', restartPreviewTimer),
    ];
    restartPreviewTimer();

    // The prefs process outlives the window; stop the timer and signals with it.
    window.connect('close-request', () => {
      if (previewTimer) GLib.source_remove(previewTimer);
      previewTimer = 0;
      for (const id of settingsIds)
        settings.disconnect(id);
      return false;
    });
  }
}
