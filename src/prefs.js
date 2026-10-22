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
  'menu-style', 'icon-right-click', 'icon-middle-click',
];
const CLICK_ACTIONS = [['menu', 'Open quick menu'], ['preferences', 'Open Preferences'], ['copy', 'Copy current time']];
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

// Combo row for a string key with <choices>; choices are [value, label] pairs.
function comboRow(settings, key, title, subtitle, choices) {
  const row = new Adw.ComboRow({
    title, subtitle,
    model: Gtk.StringList.new(choices.map(([, label]) => _(label))),
  });
  const sync = () => {
    const i = choices.findIndex(([value]) => value === settings.get_string(key));
    if (i >= 0 && row.selected !== i) row.selected = i;
  };
  sync();
  row.connect('notify::selected', () => settings.set_string(key, choices[row.selected][0]));
  const id = settings.connect(`changed::${key}`, sync);
  row.connect('destroy', () => settings.disconnect(id));
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

    // Edits are saved only on Enter or the apply button, so a stray key press
    // (Preferences can open straight from a panel click) never changes the clock.
    const rowFmt = new Adw.EntryRow({ title: _('Format string'), show_apply_button: true });
    const showSaved = () => {
      // Setting text programmatically would otherwise reveal the apply button.
      rowFmt.show_apply_button = false;
      rowFmt.text = settings.get_string('format-string');
      rowFmt.show_apply_button = true;
    };
    showSaved();
    groupFormat.add(rowFmt);

    const rowPreview = new Adw.ActionRow({ title: _('Preview') });
    const preview = new Gtk.Label({ selectable: true, hexpand: true, xalign: 1, wrap: true, css_classes: ['numeric'] });
    rowPreview.add_suffix(preview);
    groupFormat.add(rowPreview);

    // Live sample shown as each preset row's subtitle.
    const presetRows = [];
    let previewTimer = 0;
    // The preview follows what is typed; the clock changes once it is applied.
    const refreshPreview = () => {
      const fmt = rowFmt.text;
      const valid = isValidFormat(fmt);
      preview.label = formatNow(fmt);
      if (!valid)
        rowPreview.subtitle = _('Invalid or empty format — it will not be saved');
      else if (!fmt.includes('%'))
        rowPreview.subtitle = _('No % codes — the clock would show this text as it is');
      else if (fmt !== settings.get_string('format-string'))
        rowPreview.subtitle = _('Press Enter or ✓ to apply');
      else
        rowPreview.subtitle = _('Live sample');
      if (valid && fmt.includes('%')) rowFmt.remove_css_class('error');
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

    const groupLook = new Adw.PreferencesGroup({ title: _('Appearance') });
    groupLook.add(comboRow(settings, 'menu-style', _('Menu style'),
      _('Quick menu and tooltip colors. System follows the shell theme.'),
      [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']]));
    pageSettings.add(groupLook);

    const groupAccess = new Adw.PreferencesGroup({ title: _('Quick access') });
    groupAccess.add(switchRow(settings, 'show-panel-icon',
      _('Show panel icon'),
      _('Clock icon in the top bar with presets, copy time and preferences')));
    groupAccess.add(switchRow(settings, 'clock-secondary-opens-menu',
      _('Right-click clock for quick menu'),
      _('Right-click or middle-click the clock. Left-click still opens the GNOME calendar.')));
    pageSettings.add(groupAccess);

    const groupClicks = new Adw.PreferencesGroup({
      title: _('Panel icon clicks'),
      description: _('Left-click always opens the quick menu'),
    });
    groupClicks.add(comboRow(settings, 'icon-right-click', _('Right-click'), null, CLICK_ACTIONS));
    groupClicks.add(comboRow(settings, 'icon-middle-click', _('Middle-click'), null, CLICK_ACTIONS));
    pageSettings.add(groupClicks);

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
    // "About Numeric Clock" in the quick menu asks for the About page.
    if (settings.get_string('prefs-page') === 'about') {
      window.set_visible_page(pageAbout);
      settings.reset('prefs-page');
    }

    rowFmt.connect('changed', () => {
      if (rowFmt.text.length > MAX_FORMAT_LENGTH)
        rowFmt.text = rowFmt.text.slice(0, MAX_FORMAT_LENGTH);
      refreshPreview();
    });
    rowFmt.connect('apply', () => {
      const fmt = rowFmt.text.trim();
      if (isValidFormat(fmt) && fmt.includes('%'))
        settings.set_string('format-string', fmt);
      else
        refreshPreview();
    });
    // Open with nothing focused, so typing does not land in the format field.
    window.connect('map', () => GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
      window.set_focus(null);
      return GLib.SOURCE_REMOVE;
    }));
    const settingsIds = [
      settings.connect('changed::format-string', () => {
        showSaved();
        restartPreviewTimer();
      }),
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
