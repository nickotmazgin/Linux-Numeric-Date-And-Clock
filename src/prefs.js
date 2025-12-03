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
    const entry = new Gtk.Entry({ hexpand: true, placeholder_text: '%A %d/%m/%Y %H:%M' });
    entry.text = settings.get_string('format-string');
    entry.connect('changed', w => settings.set_string('format-string', w.text));
    rowFmt.add_suffix(entry);
    rowFmt.activatable_widget = entry;
    group.add(rowFmt);

    // Live preview
    const rowPreview = new Adw.ActionRow({ title: _('Preview') });
    const preview = new Gtk.Label({ hexpand: true, selectable: true, xalign: 1 });
    function formatNow(fmt) {
      try { return GLib.DateTime.new_now_local().format(fmt); }
      catch (_) { return GLib.DateTime.new_now_local().format('%d/%m/%Y %H:%M'); }
    }
    function refreshPreview() {
      preview.label = formatNow(settings.get_string('format-string'));
    }
    refreshPreview();
    settings.connect('changed::format-string', refreshPreview);
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
    const rowPresets = new Adw.ActionRow({ title: _('Presets') });
    const btnDefault = new Gtk.Button({ label: _('Default') });
    const btnSeconds = new Gtk.Button({ label: _('Seconds') });
    btnDefault.connect('clicked', () => {
      settings.set_string('format-string', '%A %d/%m/%Y %H:%M');
      settings.set_int('update-interval', 60);
      entry.text = settings.get_string('format-string');
      if (typeof spin.set_value === 'function') spin.set_value(60);
      refreshPreview();
    });
    btnSeconds.connect('clicked', () => {
      settings.set_string('format-string', '%A %d/%m/%Y %H:%M:%S');
      settings.set_int('update-interval', 1);
      entry.text = settings.get_string('format-string');
      if (typeof spin.set_value === 'function') spin.set_value(1);
      refreshPreview();
    });
    const btnBox = new Gtk.Box({ spacing: 6 });
    btnBox.append(btnDefault);
    btnBox.append(btnSeconds);
    rowPresets.add_suffix(btnBox);
    group.add(rowPresets);

    // Reset button
    const rowReset = new Adw.ActionRow({ title: _('Reset to defaults') });
    const btnReset = new Gtk.Button({ label: _('Reset') });
    btnReset.connect('clicked', () => {
      try {
        settings.reset('format-string');
        settings.reset('update-interval');
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
