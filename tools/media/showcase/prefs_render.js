// Renders the Numeric Clock preferences pages for the demo video.
// Runs in plain gjs with a stand-in for the Shell's ExtensionPreferences (shim.js),
// so no window on your desktop is scrolled or clicked. demo_video.py copies this
// file next to prefs.js and runs:  gjs -m prefs_render.js <out-dir>
// (A static import: a top-level await would stall the promise jobs inside app.run.)
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

import Prefs from './prefs.js';

const [outDir] = ARGV;
const extDir = GLib.path_get_dirname(GLib.filename_from_uri(import.meta.url)[0]);

const pages = w => {
  const out = [];
  (function walk(x) {
    for (let c = x.get_first_child(); c; c = c.get_next_sibling()) {
      if (c instanceof Adw.PreferencesPage) out.push(c);
      walk(c);
    }
  })(w);
  return out;
};
const find = (w, type) => {
  if (w instanceof type) return w;
  for (let c = w.get_first_child(); c; c = c.get_next_sibling()) {
    const r = find(c, type);
    if (r) return r;
  }
  return null;
};

const app = new Adw.Application({ application_id: 'local.numeric_clock.prefs_render', flags: Gio.ApplicationFlags.NON_UNIQUE });
app.connect('activate', () => {
  Adw.StyleManager.get_default().color_scheme = Adw.ColorScheme.FORCE_LIGHT;
  const win = new Adw.PreferencesWindow({ application: app });
  new Prefs(extDir).fillPreferencesWindow(win);
  const snap = name => {
    const p = new Gtk.WidgetPaintable({ widget: win });
    const s = new Gtk.Snapshot();
    s.scale(2, 2);
    p.snapshot(s, win.get_width(), win.get_height());
    win.get_native().get_renderer().render_texture(s.to_node(), null).save_to_png(`${outDir}/${name}.png`);
  };
  const wait = ms => new Promise(r => GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => { r(); return GLib.SOURCE_REMOVE; }));
  // Scroll the page in steps and save one slice per step; demo_video.py stitches
  // them into one tall image using the offsets written to <page>.json.
  const slices = async page => {
    const sw = [...(function* all(w) {
      for (let c = w.get_first_child(); c; c = c.get_next_sibling()) {
        if (c instanceof Gtk.ScrolledWindow && c.get_mapped()) yield c;
        yield* all(c);
      }
    })(win)][0];
    const [, rect] = sw.compute_bounds(win);
    const adj = sw.vadjustment;
    const meta = { top: rect.origin.y, height: rect.size.height, offsets: [] };
    for (let i = 0, v = 0; ; i++) {
      adj.value = v;
      await wait(350);
      snap(`${page}-${i}`);
      meta.offsets.push(adj.value);
      if (adj.value >= adj.upper - adj.page_size - 1) break;
      v = adj.value + adj.page_size * 0.8;
    }
    GLib.file_set_contents(`${outDir}/${page}.json`, JSON.stringify(meta));
  };
  win.default_width = 600;
  win.default_height = 860;
  win.present();
  (async () => {
    await wait(900);
    win.set_focus(null);
    find(win, Adw.ExpanderRow).expanded = true;
    await wait(500);
    await slices('settings');
    win.set_visible_page(pages(win).find(p => p.title === 'About'));
    await wait(600);
    await slices('about');
    app.quit();
  })().catch(e => { logError(e); app.quit(); });
});
app.run([]);
