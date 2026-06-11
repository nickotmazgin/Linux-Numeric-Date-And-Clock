// Numeric Clock prefs — GNOME 45+ (ESM)
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gettext from 'gettext';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { FORMAT_PRESETS, applyPresetToSettings } from './presets.js';

const REPO_URL = 'https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock';
const EMAIL = 'nickotmazgin.dev@gmail.com';
const AUTHOR = 'Nick Otmazgin';

export default class NumericClockPrefs extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings();
    const metadata = this.metadata || {};
    window.default_width = 560;
    window.default_height = 520;

    const _ = Gettext.domain('numeric-clock').gettext;

    const pageSettings = new Adw.PreferencesPage({
      title: _('Settings'),
      icon_name: 'preferences-system-symbolic',
    });
    const group = new Adw.PreferencesGroup({ title: _('Numeric Clock') });

    const rowFmt = new Adw.ActionRow({ title: _('Format string') });
    const entry = new Gtk.Entry({ hexpand: true, placeholder_text: '%d/%m/%Y %H:%M:%S' });
    entry.text = settings.get_string('format-string');
    entry.connect('changed', w => {
      const text = String(w.text || '').slice(0, 128);
      if (text !== w.text)
        w.text = text;
      settings.set_string('format-string', text);
    });
    rowFmt.add_suffix(entry);
    rowFmt.activatable_widget = entry;
    group.add(rowFmt);

    const rowPreview = new Adw.ActionRow({
      title: _('Preview'),
      subtitle: _('Live sample — uses your system locale and timezone'),
    });
    const preview = new Gtk.Label({ hexpand: true, selectable: true, xalign: 1 });
    let previewTimer = 0;
    function formatNow(fmt) {
      try { return GLib.DateTime.new_now_local().format(fmt); }
      catch (_) { return GLib.DateTime.new_now_local().format('%d/%m/%Y %H:%M:%S'); }
    }
    function formatShowsSeconds(fmt) {
      return /%[0-9]*S|%[0-9]*T|%\d*[EOe]/.test(fmt || '');
    }
    function refreshPreview() {
      const fmt = settings.get_string('format-string');
      preview.label = formatNow(fmt);
      const intervalSec = settings.get_int('update-interval');
      const tickMs = formatShowsSeconds(fmt) || intervalSec <= 1 ? 1000 : Math.max(1000, intervalSec * 1000);
      if (previewTimer)
        GLib.source_remove(previewTimer);
      previewTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, tickMs, () => {
        preview.label = formatNow(settings.get_string('format-string'));
        return GLib.SOURCE_CONTINUE;
      });
    }
    refreshPreview();
    settings.connect('changed::format-string', refreshPreview);
    settings.connect('changed::update-interval', refreshPreview);
    rowPreview.add_suffix(preview);
    group.add(rowPreview);

    const rowInt = new Adw.ActionRow({ title: _('Update interval (seconds)') });
    const adj = new Gtk.Adjustment({ lower: 1, upper: 300, step_increment: 1, page_increment: 5, value: settings.get_int('update-interval') });
    const spin = new Gtk.SpinButton({ adjustment: adj, numeric: true, halign: Gtk.Align.END });
    const getVal = typeof spin.get_value_as_int === 'function'
      ? () => spin.get_value_as_int()
      : () => Math.round(spin.value);
    spin.connect('value-changed', () => settings.set_int('update-interval', getVal()));
    rowInt.add_suffix(spin);
    rowInt.activatable_widget = spin;
    group.add(rowInt);

    const rowOnly = new Adw.ActionRow({
      title: _('Only override top bar DateMenu'),
      subtitle: _('Recommended. Turning off may affect other panel clocks on some desktops.'),
    });
    const swOnly = new Gtk.Switch({ active: settings.get_boolean('only-topbar') });
    swOnly.connect('notify::active', w => settings.set_boolean('only-topbar', w.active));
    rowOnly.add_suffix(swOnly);
    rowOnly.activatable_widget = swOnly;
    group.add(rowOnly);

    const rowSmooth = new Adw.ActionRow({ title: _('Smooth tick (align to second)') });
    const swSmooth = new Gtk.Switch({ active: settings.get_boolean('smooth-second') });
    swSmooth.connect('notify::active', w => settings.set_boolean('smooth-second', w.active));
    rowSmooth.add_suffix(swSmooth);
    rowSmooth.activatable_widget = swSmooth;
    group.add(rowSmooth);

    const rowIcon = new Adw.ActionRow({
      title: _('Show panel access icon'),
      subtitle: _('Digital clock icon in the top bar — click for preferences, presets, and copy time'),
    });
    const swIcon = new Gtk.Switch({ active: settings.get_boolean('show-panel-icon') });
    swIcon.connect('notify::active', w => settings.set_boolean('show-panel-icon', w.active));
    rowIcon.add_suffix(swIcon);
    rowIcon.activatable_widget = swIcon;
    group.add(rowIcon);

    const rowClockMenu = new Adw.ActionRow({
      title: _('Right-click clock for quick menu'),
      subtitle: _('Right-click or middle-click the formatted clock. Left-click still opens the GNOME calendar.'),
    });
    const swClockMenu = new Gtk.Switch({ active: settings.get_boolean('clock-secondary-opens-menu') });
    swClockMenu.connect('notify::active', w => settings.set_boolean('clock-secondary-opens-menu', w.active));
    rowClockMenu.add_suffix(swClockMenu);
    rowClockMenu.activatable_widget = swClockMenu;
    group.add(rowClockMenu);

    pageSettings.add(group);

    const groupPresets = new Adw.PreferencesGroup({
      title: _('Format presets'),
      description: _('One-click formats — uses your system locale and timezone worldwide'),
    });
    const presetGrid = new Gtk.FlowBox({
      selection_mode: Gtk.SelectionMode.NONE,
      column_spacing: 8,
      row_spacing: 8,
      max_children_per_line: 3,
      homogeneous: true,
    });
    const applyPreset = preset => {
      applyPresetToSettings(settings, preset);
      entry.text = settings.get_string('format-string');
      if (typeof spin.set_value === 'function')
        spin.set_value(settings.get_int('update-interval'));
      swOnly.active = settings.get_boolean('only-topbar');
      swSmooth.active = settings.get_boolean('smooth-second');
      refreshPreview();
    };
    for (const preset of FORMAT_PRESETS) {
      const btn = new Gtk.Button({
        label: _(preset.label),
        tooltip_text: preset.fmt,
      });
      btn.connect('clicked', () => applyPreset(preset));
      const boxChild = new Gtk.FlowBoxChild();
      boxChild.child = btn;
      presetGrid.append(boxChild);
    }
    const presetRow = new Adw.ActionRow({ title: _('Apply preset') });
    presetRow.add_suffix(presetGrid);
    groupPresets.add(presetRow);
    pageSettings.add(groupPresets);

    const groupReset = new Adw.PreferencesGroup();
    const rowReset = new Adw.ActionRow({ title: _('Reset to defaults') });
    const btnReset = new Gtk.Button({ label: _('Reset') });
    btnReset.connect('clicked', () => {
      try {
        settings.reset('format-string');
        settings.reset('update-interval');
        settings.reset('smooth-second');
        settings.reset('only-topbar');
        settings.reset('show-panel-icon');
        settings.reset('clock-secondary-opens-menu');
        entry.text = settings.get_string('format-string');
        if (typeof spin.set_value === 'function')
          spin.set_value(settings.get_int('update-interval'));
        swOnly.active = settings.get_boolean('only-topbar');
        swSmooth.active = settings.get_boolean('smooth-second');
        swIcon.active = settings.get_boolean('show-panel-icon');
        swClockMenu.active = settings.get_boolean('clock-secondary-opens-menu');
        refreshPreview();
      } catch (_) {}
    });
    rowReset.add_suffix(btnReset);
    groupReset.add(rowReset);
    pageSettings.add(groupReset);

    const pageAbout = new Adw.PreferencesPage({
      title: _('About'),
      icon_name: 'help-about-symbolic',
    });

    const groupInfo = new Adw.PreferencesGroup({ title: _('Extension') });
    groupInfo.add(new Adw.ActionRow({
      title: _('Name'),
      subtitle: metadata.name || 'Numeric Clock',
    }));
    groupInfo.add(new Adw.ActionRow({
      title: _('Version'),
      subtitle: metadata['version-name'] || String(metadata.version ?? ''),
    }));
    groupInfo.add(new Adw.ActionRow({
      title: _('Developer'),
      subtitle: AUTHOR,
    }));
    groupInfo.add(new Adw.ActionRow({
      title: _('Contact'),
      subtitle: EMAIL,
    }));
    groupInfo.add(new Adw.ActionRow({
      title: _('Description'),
      subtitle: _('International numeric top-bar clock — configurable date/time format, panel icon, and live preview.'),
    }));
    pageAbout.add(groupInfo);

    const groupLinks = new Adw.PreferencesGroup({ title: _('Links') });
    const addLinkRow = (title, uri) => {
      const row = new Adw.ActionRow({ title });
      row.activatable = true;
      row.connect('activated', () => {
        try { Gio.AppInfo.launch_default_for_uri(uri, null); } catch (_) {}
      });
      groupLinks.add(row);
    };
    addLinkRow(_('GitHub repository'), REPO_URL);
    addLinkRow(_('README and documentation'), `${REPO_URL}#readme`);
    addLinkRow(_('Report an issue'), `${REPO_URL}/issues`);
    addLinkRow(_('Latest release'), `${REPO_URL}/releases/latest`);

    const rowDonate = new Adw.ActionRow({ title: _('Donate via PayPal') });
    rowDonate.activatable = true;
    rowDonate.connect('activated', () => {
      try { Gio.AppInfo.launch_default_for_uri('https://www.paypal.com/donate/?hosted_button_id=4HM44VH47LSMW', null); } catch (_) {}
    });
    groupLinks.add(rowDonate);

    const rowEmail = new Adw.ActionRow({ title: EMAIL });
    rowEmail.activatable = true;
    rowEmail.connect('activated', () => {
      try { Gio.AppInfo.launch_default_for_uri(`mailto:${EMAIL}`, null); } catch (_) {}
    });
    groupLinks.add(rowEmail);
    pageAbout.add(groupLinks);

    window.add(pageSettings);
    window.add(pageAbout);
  }
}
