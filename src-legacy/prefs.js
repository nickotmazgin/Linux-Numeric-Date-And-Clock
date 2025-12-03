const ExtensionUtils = imports.misc.extensionUtils;
/* prefs.js — GNOME 42–45, works with GTK3 or GTK4 */
'use strict';
const { Gio, Gtk, GLib } = imports.gi;
const Gettext = imports.gettext;
const _ = Gettext.domain('numeric-clock').gettext;


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
  const fmtLabel = new Gtk.Label({ label: _('Format string'), halign: Gtk.Align.START });
  const fmtEntry = new Gtk.Entry({ hexpand: true });
  fmtEntry.set_text(settings.get_string('format-string'));
  fmtEntry.connect('changed', w => settings.set_string('format-string', w.get_text()));

  // ---- Update interval ----
  const intLabel = new Gtk.Label({ label: _('Update interval (seconds)'), halign: Gtk.Align.START });
  const adj = new Gtk.Adjustment({
    lower: 1, upper: 300, step_increment: 1, page_increment: 5,
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

  // ---- Live preview ----
  const prevLabel = new Gtk.Label({ label: _('Preview'), halign: Gtk.Align.START });
  const preview = new Gtk.Label({ halign: Gtk.Align.END, hexpand: true });
  function formatNow(fmt) {
    try { return GLib.DateTime.new_now_local().format(fmt); }
    catch (e) { return GLib.DateTime.new_now_local().format('%d/%m/%Y %H:%M'); }
  }
  function refreshPreview() {
    preview.set_label(formatNow(settings.get_string('format-string')));
  }
  refreshPreview();
  settings.connect('changed::format-string', refreshPreview);

  // ---- Reset button ----
  const resetLabel = new Gtk.Label({ label: _('Reset to defaults'), halign: Gtk.Align.START });
  const resetBtn = new Gtk.Button({ label: _('Reset') });
  resetBtn.connect('clicked', () => {
    try {
      settings.reset('format-string');
      settings.reset('update-interval');
      fmtEntry.set_text(settings.get_string('format-string'));
      if (typeof spin.set_value === 'function') spin.set_value(settings.get_int('update-interval'));
      refreshPreview();
    } catch (e) {}
  });

  // Layout
  grid.attach(fmtLabel, 0, 0, 1, 1);
  grid.attach(fmtEntry, 1, 0, 1, 1);
  grid.attach(intLabel, 0, 1, 1, 1);
  grid.attach(spin,     1, 1, 1, 1);
  grid.attach(prevLabel, 0, 2, 1, 1);
  grid.attach(preview,   1, 2, 1, 1);
  grid.attach(resetLabel,0, 3, 1, 1);
  grid.attach(resetBtn,  1, 3, 1, 1);
  grid.attach(onlyLabel, 0, 4, 1, 1);
  grid.attach(onlySwitch,1, 4, 1, 1);
  grid.attach(smoothLabel,0,5,1,1);
  grid.attach(smoothSwitch,1,5,1,1);
  grid.attach(presetsLabel,0,6,1,1);
  grid.attach(btnDefault, 1,6,1,1);
  grid.attach(btnSeconds, 1,7,1,1);

  // ---- Support / Donate ----
  const supportLabel = new Gtk.Label({ label: _('Support'), halign: Gtk.Align.START });
  const donateBtn = new Gtk.Button({ label: _('Donate via PayPal') });
  donateBtn.connect('clicked', () => {
    try { Gio.AppInfo.launch_default_for_uri('https://www.paypal.com/donate/?hosted_button_id=4HM44VH47LSMW', null); } catch (_) {}
  });
  grid.attach(supportLabel, 0, 8, 1, 1);
  grid.attach(donateBtn,   1, 8, 1, 1);

  // Do NOT call show_all() (GTK3-only). Returning the widget is enough.
  return grid;
}
  // ---- Only top bar toggle ----
  const onlyLabel = new Gtk.Label({ label: _('Only override top bar DateMenu'), halign: Gtk.Align.START });
  const onlySwitch = new Gtk.Switch({ active: settings.get_boolean('only-topbar'), halign: Gtk.Align.END });
  onlySwitch.connect('notify::active', w => settings.set_boolean('only-topbar', w.active));

  // ---- Smooth seconds toggle ----
  const smoothLabel = new Gtk.Label({ label: _('Smooth tick (align to second)'), halign: Gtk.Align.START });
  const smoothSwitch = new Gtk.Switch({ active: settings.get_boolean('smooth-second'), halign: Gtk.Align.END });
  smoothSwitch.connect('notify::active', w => settings.set_boolean('smooth-second', w.active));

  // ---- Presets ----
  const presetsLabel = new Gtk.Label({ label: _('Presets'), halign: Gtk.Align.START });
  const btnDefault = new Gtk.Button({ label: _('Default') });
  const btnSeconds = new Gtk.Button({ label: _('Seconds') });
  btnDefault.connect('clicked', () => {
    settings.set_string('format-string', '%A %d/%m/%Y %H:%M');
    if (typeof spin.set_value === 'function') spin.set_value(60);
    settings.set_int('update-interval', 60);
    refreshPreview();
  });
  btnSeconds.connect('clicked', () => {
    settings.set_string('format-string', '%A %d/%m/%Y %H:%M:%S');
    if (typeof spin.set_value === 'function') spin.set_value(1);
    settings.set_int('update-interval', 1);
    refreshPreview();
  });
