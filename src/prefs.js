// Numeric Clock prefs — GNOME 45+ (ESM)
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class NumericClockPrefs extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings();
    window.default_width = 520;
    window.default_height = 360;

    const page = new Adw.PreferencesPage();
    const group = new Adw.PreferencesGroup({ title: 'Numeric Clock' });

    const rowFmt = new Adw.ActionRow({ title: 'Format string' });
    const entry = new Gtk.Entry({ hexpand: true });
    entry.text = settings.get_string('format-string');
    entry.connect('changed', w => settings.set_string('format-string', w.text));
    rowFmt.add_suffix(entry);
    rowFmt.activatable_widget = entry;
    group.add(rowFmt);

    const rowInt = new Adw.ActionRow({ title: 'Update interval (seconds)' });
    const adj = new Gtk.Adjustment({ lower: 1, upper: 60, step_increment: 1, page_increment: 5, value: settings.get_int('update-interval') });
    const spin = new Gtk.SpinButton({ adjustment: adj, numeric: true, halign: Gtk.Align.END });
    const getVal = typeof spin.get_value_as_int === 'function'
      ? () => spin.get_value_as_int()
      : () => Math.round(spin.value);
    spin.connect('value-changed', () => settings.set_int('update-interval', getVal()));
    rowInt.add_suffix(spin);
    rowInt.activatable_widget = spin;
    group.add(rowInt);

    page.add(group);
    window.add(page);
  }
}
