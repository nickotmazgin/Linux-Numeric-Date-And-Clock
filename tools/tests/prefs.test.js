import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
// Preferences behaviour checks, run by tools/prefs-test.sh (plain gjs, no GNOME Shell).
import Prefs from './prefs.js';
const dir = GLib.path_get_dirname(GLib.filename_from_uri(import.meta.url)[0]);
const app = new Adw.Application({ application_id: 'local.nc.ptest', flags: Gio.ApplicationFlags.NON_UNIQUE });
const ok = (n, c, d = '') => print(`${c ? 'PASS' : 'FAIL'} ${n} ${d}`);
const find = (w, t) => { if (w instanceof t) return w; for (let c = w.get_first_child(); c; c = c.get_next_sibling()) { const r = find(c, t); if (r) return r; } return null; };
app.connect('activate', () => {
  const p = new Prefs(dir);
  const win = new Adw.PreferencesWindow({ application: app });
  p.fillPreferencesWindow(win);
  const s = p.getSettings();
  win.present();
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, 800, () => {
    const row = find(win, Adw.EntryRow);
    ok('nothing focused on open', !(win.get_focus() && row.is_ancestor && win.get_focus().is_ancestor(row)), `${win.get_focus()}`);
    const saved = s.get_string('format-string');
    row.text = '\\\\';
    ok('typing does not save', s.get_string('format-string') === saved, s.get_string('format-string'));
    row.emit('apply');
    ok('no-% format refused', s.get_string('format-string') === saved);
    row.text = '';
    row.emit('apply');
    ok('empty refused', s.get_string('format-string') === saved);
    row.text = '%H:%M';
    row.emit('apply');
    ok('valid format applied', s.get_string('format-string') === '%H:%M');
    s.set_string('format-string', '%Y-%m-%d');
    ok('external change shown', row.text === '%Y-%m-%d', row.text);
    s.reset('format-string');
    ok('reset shown', row.text === '%d/%m/%Y %H:%M:%S', row.text);
    app.quit();
    return GLib.SOURCE_REMOVE;
  });
});
app.run([]);
