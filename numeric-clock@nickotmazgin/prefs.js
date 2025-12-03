const ExtensionUtils = imports.misc.extensionUtils;
/* prefs.js — GNOME 42–45, works with GTK3 or GTK4 */
'use strict';
const { Gio, Gtk } = imports.gi;


function getSettings() {
    return ExtensionUtils.getSettings();
}

/* GNOME calls this if present; keep it as a function (even if empty) */
function init() {}

/* Legacy prefs entrypoint: must return a Gtk.Widget */
function buildPrefsWidget() {
  try { Gtk.init(); } catch (e) {}  // harmless if already initialized
  const settings = getSettings();

  const grid = new Gtk.Grid({
    margin_top: 12, margin_bottom: 12,
    margin_start: 12, margin_end: 12,
    row_spacing: 12, column_spacing: 12,
  });

  // ---- Format string ----
  const fmtLabel = new Gtk.Label({ label: 'Format string', halign: Gtk.Align.START });
  const fmtEntry = new Gtk.Entry({ hexpand: true });
  fmtEntry.set_text(settings.get_string('format-string'));
  fmtEntry.connect('changed', w => settings.set_string('format-string', w.get_text()));

  // ---- Update interval ----
  const intLabel = new Gtk.Label({ label: 'Update interval (seconds)', halign: Gtk.Align.START });
  const adj = new Gtk.Adjustment({
    lower: 1, upper: 60, step_increment: 1, page_increment: 5,
    value: settings.get_int('update-interval'),
  });
  const spin = new Gtk.SpinButton({ adjustment: adj });
  if (spin.set_digits) spin.set_digits(0);

  // GTK3 vs GTK4 getter
  function getSpinInt(s) {
    if (typeof s.get_value_as_int === 'function') return s.get_value_as_int();
    if (typeof s.get_value === 'function')       return Math.round(s.get_value());
    return 1;
  }
  spin.connect('value-changed', w => settings.set_int('update-interval', getSpinInt(w)));

  // Layout
  grid.attach(fmtLabel, 0, 0, 1, 1);
  grid.attach(fmtEntry, 1, 0, 1, 1);
  grid.attach(intLabel, 0, 1, 1, 1);
  grid.attach(spin,     1, 1, 1, 1);

  // Do NOT call show_all() (GTK3-only). Returning the widget is enough.
  return grid;
}
