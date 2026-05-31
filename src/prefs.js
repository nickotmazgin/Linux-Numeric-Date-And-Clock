// Numeric Clock prefs — GNOME 45+ (ESM)
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gettext from 'gettext';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class NumericClockPrefs extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings();
    window.default_width = 520;
    window.default_height = 360;

    const page = new Adw.PreferencesPage();
    const _ = Gettext.domain('numeric-clock').gettext;
    const group = new Adw.PreferencesGroup({ title: _('Numeric Clock') });

    const rowFmt = new Adw.ActionRow({ title: _('Format string') });
    const entry = new Gtk.Entry({ hexpand: true, placeholder_text: '%d/%m/%Y %H:%M:%S' });
    entry.text = settings.get_string('format-string');
    entry.connect('changed', w => settings.set_string('format-string', w.text));
    rowFmt.add_suffix(entry);
    rowFmt.activatable_widget = entry;
    group.add(rowFmt);

    // Live preview (ticks every second when format shows seconds)
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

    // Only top bar toggle
    const rowOnly = new Adw.ActionRow({ title: _('Only override top bar DateMenu') });
    const swOnly = new Gtk.Switch({ active: settings.get_boolean('only-topbar') });
    swOnly.connect('notify::active', w => settings.set_boolean('only-topbar', w.active));
    rowOnly.add_suffix(swOnly);
    rowOnly.activatable_widget = swOnly;
    group.add(rowOnly);

    // Smooth seconds toggle
    const rowSmooth = new Adw.ActionRow({ title: _('Smooth tick (align to second)') });
    const swSmooth = new Gtk.Switch({ active: settings.get_boolean('smooth-second') });
    swSmooth.connect('notify::active', w => settings.set_boolean('smooth-second', w.active));
    rowSmooth.add_suffix(swSmooth);
    rowSmooth.activatable_widget = swSmooth;
    group.add(rowSmooth);

    // Presets
    const rowPresets = new Adw.ActionRow({
      title: _('Presets'),
      subtitle: _('Quick formats for any timezone — uses your system clock (e.g. Asia/Jerusalem)'),
    });
    const btnDefault = new Gtk.Button({ label: _('Default') });
    const btnSeconds = new Gtk.Button({ label: _('Seconds') });
    const btnIsrael = new Gtk.Button({ label: _('DD/MM + seconds') });
    btnDefault.connect('clicked', () => {
      settings.set_string('format-string', '%d/%m/%Y %H:%M:%S');
      settings.set_int('update-interval', 1);
      settings.set_boolean('smooth-second', true);
      entry.text = settings.get_string('format-string');
      if (typeof spin.set_value === 'function') spin.set_value(1);
      refreshPreview();
    });
    btnSeconds.connect('clicked', () => {
      settings.set_string('format-string', '%A %d/%m/%Y %H:%M:%S');
      settings.set_int('update-interval', 1);
      settings.set_boolean('smooth-second', true);
      entry.text = settings.get_string('format-string');
      if (typeof spin.set_value === 'function') spin.set_value(1);
      refreshPreview();
    });
    btnIsrael.connect('clicked', () => {
      settings.set_string('format-string', '%d/%m/%Y %H:%M:%S');
      settings.set_int('update-interval', 1);
      settings.set_boolean('smooth-second', true);
      settings.set_boolean('only-topbar', true);
      entry.text = settings.get_string('format-string');
      if (typeof spin.set_value === 'function') spin.set_value(1);
      refreshPreview();
    });
    const btnBox = new Gtk.Box({ spacing: 6 });
    btnBox.append(btnDefault);
    btnBox.append(btnSeconds);
    btnBox.append(btnIsrael);
    rowPresets.add_suffix(btnBox);
    group.add(rowPresets);

    // Reset button
    const rowReset = new Adw.ActionRow({ title: _('Reset to defaults') });
    const btnReset = new Gtk.Button({ label: _('Reset') });
    btnReset.connect('clicked', () => {
      try {
        settings.reset('format-string');
        settings.reset('update-interval');
        settings.reset('smooth-second');
        entry.text = settings.get_string('format-string');
        if (typeof spin.set_value === 'function') spin.set_value(settings.get_int('update-interval'));
        refreshPreview();
      } catch (_) {}
    });
    rowReset.add_suffix(btnReset);
    group.add(rowReset);

    // Support group
    const support = new Adw.PreferencesGroup({ title: _('Support') });
    const rowDonate = new Adw.ActionRow({ title: _('Donate via PayPal') });
    const btnDonate = new Gtk.Button({ label: _('Donate') });
    btnDonate.connect('clicked', () => {
      try { Gio.AppInfo.launch_default_for_uri('https://www.paypal.com/donate/?hosted_button_id=4HM44VH47LSMW', null); } catch {}
    });
    rowDonate.add_suffix(btnDonate);
    rowDonate.activatable_widget = btnDonate;
    support.add(rowDonate);

    page.add(group);
    page.add(support);
    window.add(page);
  }
}
