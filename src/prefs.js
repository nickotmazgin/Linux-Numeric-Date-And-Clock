// Numeric Clock prefs — GNOME 45+ (ESM)
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gettext from 'gettext';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const REPO_URL = 'https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock';
const EMAIL = 'nickotmazgin.dev@gmail.com';
const AUTHOR = 'Nick Otmazgin';

export default class NumericClockPrefs extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings();
    const metadata = this.metadata || {};
    window.default_width = 520;
    window.default_height = 420;

    const _ = Gettext.domain('numeric-clock').gettext;

    const pageSettings = new Adw.PreferencesPage({
      title: _('Settings'),
      icon_name: 'preferences-system-symbolic',
    });
    const group = new Adw.PreferencesGroup({ title: _('Numeric Clock') });

    const rowFmt = new Adw.ActionRow({ title: _('Format string') });
    const entry = new Gtk.Entry({ hexpand: true, placeholder_text: '%d/%m/%Y %H:%M:%S' });
    entry.text = settings.get_string('format-string');
    entry.connect('changed', w => settings.set_string('format-string', w.text));
    rowFmt.add_suffix(entry);
    rowFmt.activatable_widget = entry;
    group.add(rowFmt);

    const rowPreview = new Adw.ActionRow({
      title: _('Preview'),
      subtitle: _('Live clock sample — add %S or %T in the format string to show seconds'),
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

    const rowOnly = new Adw.ActionRow({ title: _('Only override top bar DateMenu') });
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

    const rowPresets = new Adw.ActionRow({
      title: _('Presets'),
      subtitle: _('Quick formats for any timezone — uses your system clock (e.g. Asia/Jerusalem)'),
    });
    const btnDefault = new Gtk.Button({ label: _('Default'), tooltip_text: _('%d/%m/%Y %H:%M:%S') });
    const btnSeconds = new Gtk.Button({ label: _('Seconds'), tooltip_text: _('%A %d/%m/%Y %H:%M:%S') });
    const btnDdMm = new Gtk.Button({ label: _('DD/MM + seconds'), tooltip_text: _('%d/%m/%Y %H:%M:%S — top bar only') });
    const applyPreset = (fmt, interval, smooth, onlyTopbar) => {
      settings.set_string('format-string', fmt);
      settings.set_int('update-interval', interval);
      settings.set_boolean('smooth-second', smooth);
      if (onlyTopbar !== undefined)
        settings.set_boolean('only-topbar', onlyTopbar);
      entry.text = settings.get_string('format-string');
      if (typeof spin.set_value === 'function')
        spin.set_value(interval);
      refreshPreview();
    };
    btnDefault.connect('clicked', () => applyPreset('%d/%m/%Y %H:%M:%S', 1, true));
    btnSeconds.connect('clicked', () => applyPreset('%A %d/%m/%Y %H:%M:%S', 1, true));
    btnDdMm.connect('clicked', () => applyPreset('%d/%m/%Y %H:%M:%S', 1, true, true));
    const btnBox = new Gtk.Box({ spacing: 6 });
    btnBox.append(btnDefault);
    btnBox.append(btnSeconds);
    btnBox.append(btnDdMm);
    rowPresets.add_suffix(btnBox);
    group.add(rowPresets);

    const rowReset = new Adw.ActionRow({ title: _('Reset to defaults') });
    const btnReset = new Gtk.Button({ label: _('Reset') });
    btnReset.connect('clicked', () => {
      try {
        settings.reset('format-string');
        settings.reset('update-interval');
        settings.reset('smooth-second');
        settings.reset('only-topbar');
        entry.text = settings.get_string('format-string');
        if (typeof spin.set_value === 'function')
          spin.set_value(settings.get_int('update-interval'));
        refreshPreview();
      } catch (_) {}
    });
    rowReset.add_suffix(btnReset);
    group.add(rowReset);

    pageSettings.add(group);

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
      subtitle: _('Numeric DD/MM/YYYY 24-hour top-bar clock with optional seconds and live preview.'),
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
