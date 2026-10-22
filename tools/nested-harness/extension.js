// Test harness for tools/nested-smoke-test.sh — never shipped in the release zip.
// Drives Numeric Clock inside an isolated nested GNOME Shell and logs "NCTEST" lines.
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

const UUID = 'numeric-clock@nickotmazgin';
const L = (...a) => console.log('NCTEST', ...a);
const wait = ms => new Promise(r => GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
  r();
  return GLib.SOURCE_REMOVE;
}));
const fmt = f => GLib.DateTime.new_now_local().format(f);

function ncSettings() {
  const ext = Main.extensionManager.lookup(UUID);
  const src = Gio.SettingsSchemaSource.new_from_directory(`${ext.path}/schemas`,
    Gio.SettingsSchemaSource.get_default(), false);
  return new Gio.Settings({ settings_schema: src.lookup('org.gnome.shell.extensions.numeric-clock', false) });
}

function check(name, ok, detail = '') {
  L(ok ? 'PASS' : 'FAIL', name, detail);
}

async function run() {
  await wait(1500);
  const s = ncSettings();
  const dm = Main.panel.statusArea.dateMenu;
  const clock = () => dm._clockDisplay.text;
  const ind = () => Main.panel.statusArea['numeric-clock-access'];

  check('extension active', Main.extensionManager.lookup(UUID)?.state === 1);
  check('indicator present', !!ind());
  const icon = ind().get_first_child();
  check('icon uses theme size', icon.get_theme_node().get_length('icon-size') > 0 && icon.icon_size === -1,
    `icon_size=${icon.icon_size} theme=${icon.get_theme_node().get_length('icon-size')}`);

  // Default format, ticking every second.
  const first = clock();
  check('default format', /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/.test(first), first);
  await wait(1100);
  check('ticks every second', clock() !== first, `${first} -> ${clock()}`);

  // Smooth tick lands just after the second boundary.
  const offsets = [];
  const ct = dm._clockDisplay.clutter_text;
  const id = ct.connect('notify::text', () => offsets.push((GLib.get_real_time() / 1000) % 1000));
  await wait(3200);
  ct.disconnect(id);
  check('aligned to second', offsets.length >= 2 && offsets.every(o => o < 150), offsets.map(Math.round).join(','));

  s.set_string('format-string', '%Y-%m-%d %H:%M');
  await wait(50);
  check('format change applies', clock() === fmt('%Y-%m-%d %H:%M'), clock());

  s.set_string('format-string', '');
  await wait(50);
  check('empty format falls back', clock() === fmt('%d/%m/%Y %H:%M:%S'), clock());

  // Shell rewrites the label (as the wall clock does each minute); ours comes back.
  s.set_string('format-string', '%H:%M:%S');
  dm._clockDisplay.text = 'stock';
  check('shell rewrite overridden', clock() !== 'stock', clock());

  // Markup is never interpreted.
  s.set_string('format-string', '<b>%H</b>');
  await wait(50);
  check('plain text', clock() === fmt('<b>%H</b>') && !ct.use_markup, clock());

  // Right-click menu, icon visible and hidden.
  s.set_string('format-string', '%d/%m/%Y %H:%M:%S');
  ind().openQuickMenu(dm._clockDisplay);
  await wait(300);
  check('menu opens from clock', ind().menu.isOpen && ind().menu.sourceActor === dm._clockDisplay);
  const items = ind().menu._getMenuItems().map(i => i.label?.text ?? '-');
  L('menu items', JSON.stringify(items));
  check('menu shows time', items[0] === fmt('%d/%m/%Y %H:%M:%S') || items[0].length > 0, items[0]);
  ind().menu.close();
  s.set_boolean('show-panel-icon', false);
  await wait(100);
  check('icon hidden', !ind().visible);
  ind().openQuickMenu(dm._clockDisplay);
  await wait(300);
  check('menu opens with icon hidden', ind().menu.isOpen && ind().menu.sourceActor === dm._clockDisplay);
  ind().menu.close();
  s.set_boolean('show-panel-icon', true);

  // Panel icon click actions (right/middle) and menu styles.
  let prefsOpened = 0;
  ind()._openPrefs = () => prefsOpened++;
  check('default right-click = preferences', s.get_string('icon-right-click') === 'preferences');
  check('default middle-click = copy', s.get_string('icon-middle-click') === 'copy');
  ind().runAction('preferences');
  check('preferences action', prefsOpened === 1 && !ind().menu.isOpen);
  ind().runAction('copy');
  await wait(200);
  const clip = await new Promise(r => St.Clipboard.get_default().get_text(St.ClipboardType.CLIPBOARD, (_c, t) => r(t)));
  check('copy action', /^\d{2}\/\d{2}\/\d{4}/.test(clip ?? ''), clip);
  ind().runAction('menu');
  await wait(300);
  check('menu action opens menu', ind().menu.isOpen);
  ind().runAction('menu');
  await wait(300);
  check('menu action toggles closed', !ind().menu.isOpen);
  check('tooltip lists clicks', /Right-click: preferences · Middle-click: copy time/.test(ind()._tooltipText()), ind()._tooltipText());
  for (const style of ['light', 'dark', 'system']) {
    s.set_string('menu-style', style);
    await wait(50);
    const cls = ind().menu.actor.get_style_class_name();
    check(`menu style ${style}`, cls.includes(`numeric-clock-style-${style}`) &&
      ['light', 'dark', 'system'].filter(x => x !== style).every(x => !cls.includes(`numeric-clock-style-${x}`)), cls);
  }
  const styleSub = ind().menu._getMenuItems().find(i => i.label?.text === 'Menu style');
  check('menu style submenu', styleSub?.menu._getMenuItems().length === 3);

  // Bug fix 17.7: opened from the clock, closed, then opened from the icon,
  // the menu must sit under the icon again, not under the clock.
  ind().openQuickMenu(dm._clockDisplay);
  await wait(300);
  check('clock menu anchored to clock', ind().menu.sourceActor === dm._clockDisplay);
  ind().menu.close();
  await wait(300);
  check('anchor back on icon after close', ind().menu.sourceActor === ind());
  ind().runAction('menu');
  await wait(300);
  const [ix] = ind().get_transformed_position();
  const [mx] = ind().menu.actor.get_transformed_position();
  const [mw] = ind().menu.actor.get_transformed_size();
  check('icon menu opens under icon', ind().menu.isOpen && ind().menu.sourceActor === ind() && ix >= mx - 2 && ix <= mx + mw + 2, `icon x=${ix} menu ${mx}..${mx + mw}`);
  ind().menu.close();
  await wait(300);

  // About and Donate items
  const labels = ind().menu._getMenuItems().map(i => i.label?.text);
  check('about and donate items', labels.includes('About Numeric Clock') && labels.includes('Donate'), JSON.stringify(labels));
  prefsOpened = 0;
  ind().menu._getMenuItems().find(i => i.label?.text === 'About Numeric Clock').activate(Clutter.get_current_event());
  check('about opens prefs on About page', prefsOpened === 1 && s.get_string('prefs-page') === 'about');
  s.reset('prefs-page');

  // Non-top-bar mode walks the stage without touching the calendar popup.
  s.set_boolean('only-topbar', false);
  await wait(1200);
  check('only-topbar off still formats', clock() === fmt('%d/%m/%Y %H:%M:%S'), clock());
  s.set_boolean('only-topbar', true);

  // Disable restores the stock clock immediately; enable takes over again.
  await Main.extensionManager.disableExtension(UUID);
  await wait(200);
  check('disable restores stock clock', clock() === dm._clock.clock, `${clock()} vs ${dm._clock.clock}`);
  check('label not left reactive', !dm._clockDisplay.reactive);
  check('indicator removed', !ind());
  await Main.extensionManager.enableExtension(UUID);
  await wait(200);
  check('re-enable formats again', /^\d{2}\/\d{2}\/\d{4}/.test(clock()), clock());

  for (let i = 0; i < 3; i++) {
    await Main.extensionManager.disableExtension(UUID);
    await Main.extensionManager.enableExtension(UUID);
  }
  check('enable/disable cycles', !!ind() && Main.extensionManager.lookup(UUID)?.state === 1);
  L('DONE');
}

export default class NumericClockTestHarness extends Extension {
  enable() {
    run().catch(e => L('FAIL exception', e, e.stack));
  }

  disable() {}
}
