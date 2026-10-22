// Demo-video driver for tools/media/demo_video.py — never shipped in the release zip.
// Runs inside the isolated nested GNOME Shell and walks the Numeric Clock tour,
// logging "NCSHOW SCENE {...}" with a timestamp as each scene starts. It only calls
// the extension's own functions; no pointer or keyboard events are generated.
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

const L = (...a) => console.log('NCSHOW', ...a);
const wait = ms => new Promise(r => GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
  r();
  return GLib.SOURCE_REMOVE;
}));
const DURATIONS = JSON.parse(GLib.getenv('NC_SHOW_DURATIONS') || '{}');

// Mark a scene and return how long it should last: its narration plus a pause.
function scene(key, min = 3) {
  L('SCENE', JSON.stringify({ key, t: GLib.get_real_time() }));
  return Math.max(min, (DURATIONS[key] ?? 0) + 0.7) * 1000;
}

function clearBanners() {
  for (const src of Main.messageTray.getSources())
    src.destroy();
}

async function run() {
  await wait(3000);
  Main.overview.hide();
  await wait(1500);
  const ind = Main.panel.statusArea['numeric-clock-access'];
  const s = ind._settings;
  const dm = Main.panel.statusArea.dateMenu;
  const item = text => ind.menu._getMenuItems().find(i => i.label?.text === text);

  let ms = scene('title', 4);
  await wait(ms);

  ms = scene('clock');
  await wait(ms);

  ms = scene('tooltip');
  ind._tooltip._show();
  await wait(ms);
  ind._tooltip.hide();

  ms = scene('menu');
  ind.runAction('menu');
  await wait(ms);

  ms = scene('presets', 6);
  item('Quick presets').setSubmenuShown(true);
  const step = Math.max(1200, (ms - 1500) / 4);
  await wait(1200);
  for (const label of ['ISO 8601', 'ISO date + week number', 'US date + 12-hour', 'International (DD/MM + seconds)']) {
    s.set_string('format-string', {
      'ISO 8601': '%Y-%m-%d %H:%M:%S',
      'ISO date + week number': '%Y-%m-%d W%V %H:%M',
      'US date + 12-hour': '%m/%d/%Y %I:%M:%S %p',
      'International (DD/MM + seconds)': '%d/%m/%Y %H:%M:%S',
    }[label]);
    await wait(step);
  }
  item('Quick presets').setSubmenuShown(false);

  ms = scene('styles', 6);
  item('Menu style').setSubmenuShown(true);
  await wait(800);
  const per = Math.max(1300, (ms - 800) / 3);
  for (const style of ['light', 'dark', 'system']) {
    s.set_string('menu-style', style);
    await wait(per);
  }
  item('Menu style').setSubmenuShown(false);
  ind.menu.close();
  await wait(400);

  ms = scene('copy');
  ind.runAction('copy');
  await wait(ms);
  clearBanners();

  ms = scene('clockmenu', 6);
  ind.openQuickMenu(dm._clockDisplay);
  await wait(ms / 2);
  ind.menu.close();
  await wait(300);
  dm.menu.open();
  await wait(ms / 2 - 300);
  dm.menu.close();
  await wait(400);

  ms = scene('prefs');
  ind.runAction('preferences');
  await wait(Math.max(ms, 5000));
  L('SCENE', JSON.stringify({ key: 'nested-end', t: GLib.get_real_time() }));
  await wait(500);
  L('DONE');
}

export default class NumericClockShowcase extends Extension {
  enable() {
    run().catch(e => L('FAIL', e, e.stack));
  }

  disable() {}
}
