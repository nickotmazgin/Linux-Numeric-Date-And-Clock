// SPDX-License-Identifier: MIT
// Numeric Clock — GNOME 45+ (ESM)
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

const HOOKED = Symbol('nc-hooked');
const TIME_RE = /(^|\s)\d{1,2}:\d{2}(:\d{2})?(\s|$)/i;
const MONTHS = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i;
const DAYS   = /\b(sun|mon|tue|wed|thu|fri|sat)\b/i;

function formatNow(fmt) {
  const dt = GLib.DateTime.new_now_local();
  try { return dt.format(fmt); }
  catch { return dt.format('%d/%m/%Y %H:%M:%S'); }
}

function looksLikeClock(txt) {
  if (!txt) return false;
  const s = String(txt);
  return TIME_RE.test(s) || MONTHS.test(s) || DAYS.test(s);
}

function allStageLabels() {
  const out = [];
  (function walk(a) {
    if (!a || typeof a.get_children !== 'function') return;
    for (const c of a.get_children()) {
      if (c instanceof St.Label) out.push(c);
      walk(c);
    }
  })(global.stage);
  return out;
}

function shellMajor() {
  try {
    const ver = Config.PACKAGE_VERSION || '';
    const major = parseInt(String(ver).split('.')[0], 10);
    if (Number.isFinite(major) && major > 0)
      return major;
  } catch (_e) {}
  return 46;
}

/** GNOME 45+ MetaStage uses child-*; older shells use actor-*. Never connect actor-* on 45+. */
function connectStageSignal(stage, addedOrRemoved, callback) {
  if (!stage || typeof stage.connect !== 'function')
    return 0;
  const modern = addedOrRemoved === 'removed' ? 'child-removed' : 'child-added';
  const legacy = addedOrRemoved === 'removed' ? 'actor-removed' : 'actor-added';
  const sig = shellMajor() >= 45 ? modern : legacy;
  try {
    return stage.connect(sig, callback);
  } catch (_e) {
    return 0;
  }
}

function disconnectStageSignal(stage, id) {
  if (!stage || !id) return;
  try { stage.disconnect(id); } catch {}
}

function copyTextToClipboard(text) {
  try {
    St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, String(text || ''));
    Main.notify('Numeric Clock', 'Time copied to clipboard');
  } catch (e) {
    console.error('[Numeric Clock] clipboard error:', e);
  }
}

const NumericClockIndicator = GObject.registerClass(
class NumericClockIndicator extends PanelMenu.Button {
  _init(settings, extensionPath, openPrefs) {
    super._init(0.0, 'Numeric Clock');
    this._settings = settings;
    this._openPrefs = openPrefs;
    this._timeLabel = null;
    this._menuTimerId = 0;

    const iconPath = GLib.build_filenamev([extensionPath, 'icons', 'numeric-clock-symbolic.svg']);
    const icon = new St.Icon({
      gicon: Gio.Icon.new_for_string(iconPath),
      style_class: 'system-status-icon numeric-clock-icon',
    });
    this.add_child(icon);
    this._buildMenu();

    this._settingsChangedIds = [
      this._settings.connect('changed::format-string', () => this._refreshMenuTime()),
      this._settings.connect('changed::show-panel-icon', () => this._syncVisibility()),
    ];
    this._syncVisibility();
  }

  destroy() {
    this._clearMenuTimer();
    for (const id of this._settingsChangedIds || []) {
      try { this._settings.disconnect(id); } catch {}
    }
    this._settingsChangedIds = [];
    super.destroy();
  }

  _syncVisibility() {
    const show = this._settings.get_boolean('show-panel-icon');
    this.visible = show;
  }

  _clearMenuTimer() {
    if (this._menuTimerId) {
      GLib.source_remove(this._menuTimerId);
      this._menuTimerId = 0;
    }
  }

  _refreshMenuTime() {
    if (!this._timeLabel?.label) return;
    this._timeLabel.label.text = formatNow(this._settings.get_string('format-string'));
  }

  _startMenuTimer() {
    this._clearMenuTimer();
    this._refreshMenuTime();
    this._menuTimerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
      this._refreshMenuTime();
      return GLib.SOURCE_CONTINUE;
    });
  }

  _applyPreset(fmt, interval, smooth, onlyTopbar) {
    this._settings.set_string('format-string', fmt);
    this._settings.set_int('update-interval', interval);
    this._settings.set_boolean('smooth-second', smooth);
    if (onlyTopbar !== undefined)
      this._settings.set_boolean('only-topbar', onlyTopbar);
    this._refreshMenuTime();
    Main.notify('Numeric Clock', 'Format preset applied');
  }

  _buildMenu() {
    this.menu.removeAll();
    this._timeLabel = new PopupMenu.PopupMenuItem('', { reactive: false, can_focus: false });
    this._timeLabel.label.clutter_text.ellipsize = 3;
    this.menu.addMenuItem(this._timeLabel);

    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    const prefsItem = new PopupMenu.PopupMenuItem('Open Preferences');
    prefsItem.connect('activate', () => this._openPrefs());
    this.menu.addMenuItem(prefsItem);

    const copyItem = new PopupMenu.PopupMenuItem('Copy current time');
    copyItem.connect('activate', () => {
      copyTextToClipboard(formatNow(this._settings.get_string('format-string')));
    });
    this.menu.addMenuItem(copyItem);

    const presets = new PopupMenu.PopupSubMenuMenuItem('Quick presets');
    const addPreset = (label, fmt, interval, smooth, onlyTopbar) => {
      const item = new PopupMenu.PopupMenuItem(label);
      item.connect('activate', () => this._applyPreset(fmt, interval, smooth, onlyTopbar));
      presets.menu.addMenuItem(item);
    };
    addPreset('Default (DD/MM/YYYY + seconds)', '%d/%m/%Y %H:%M:%S', 1, true);
    addPreset('Weekday + seconds', '%A %d/%m/%Y %H:%M:%S', 1, true);
    addPreset('Top bar only (DD/MM + seconds)', '%d/%m/%Y %H:%M:%S', 1, true, true);
    this.menu.addMenuItem(presets);

    this.menu.connect('open-state-changed', (_menu, open) => {
      if (open)
        this._startMenuTimer();
      else
        this._clearMenuTimer();
    });
  }
});

export default class NumericClockExtension extends Extension {
  constructor(uuid) {
    super(uuid);
    this._settings = null;
    this._indicator = null;
    this._timeoutId = 0;
    this._msTimeoutId = 0;
    this._stageAddedId = 0;
    this._stageRemovedId = 0;
    this._settingsChangedIds = [];
    this._textSignalIds = []; // [ [actor, id], ... ]
  }

  _collectClockLabels() {
    const set = new Set();
    const dm = Main.panel && Main.panel.statusArea ? Main.panel.statusArea.dateMenu : null;
    if (dm) {
      if (dm._clockDisplay instanceof St.Label) set.add(dm._clockDisplay);
      if (dm._clock        instanceof St.Label) set.add(dm._clock);
      if (dm._time         instanceof St.Label) set.add(dm._time);
    }
    if (this._settings && this._settings.get_boolean('only-topbar'))
      return Array.from(set);
    for (const lab of allStageLabels()) {
      const cls  = (typeof lab.get_style_class_name === 'function' ? lab.get_style_class_name() : '') || '';
      const name = (typeof lab.get_name === 'function' ? lab.get_name() : '') || '';
      const lcCls  = cls.toLowerCase();
      const lcName = name.toLowerCase();
      const txt  = typeof lab.get_text === 'function' ? lab.get_text() : '';
      if (lcCls.includes('clock') || lcName.includes('clock') ||
          lcCls.includes('date')  || lcName.includes('date')  ||
          looksLikeClock(txt))
        set.add(lab);
    }
    return Array.from(set);
  }

  _forcePlain(lab) {
    const ct = lab && lab.clutter_text;
    if (ct && typeof ct.set_use_markup === 'function')
      ct.set_use_markup(false);
  }

  _applyTo(lab) {
    if (!lab) return;
    this._forcePlain(lab);
    if (typeof lab.set_text === 'function')
      lab.set_text(formatNow(this._settings.get_string('format-string')));

    const ct = lab && lab.clutter_text;
    if (ct && !ct[HOOKED] && typeof ct.connect === 'function') {
      ct[HOOKED] = true;
      const id = ct.connect('notify::text', () => {
        this._forcePlain(lab);
        if (typeof lab.set_text === 'function')
          lab.set_text(formatNow(this._settings.get_string('format-string')));
      });
      this._textSignalIds.push([ct, id]);
    }
  }

  _updateAllNow() {
    for (const lab of this._collectClockLabels())
      this._applyTo(lab);
  }

  _restartTimer() {
    if (this._timeoutId) {
      GLib.source_remove(this._timeoutId);
      this._timeoutId = 0;
    }
    if (this._msTimeoutId) {
      GLib.source_remove(this._msTimeoutId);
      this._msTimeoutId = 0;
    }
    const sec = Math.max(1, this._settings.get_int('update-interval'));
    this._updateAllNow();
    const smooth = !!this._settings.get_boolean('smooth-second');
    if (smooth && sec === 1) {
      const now = GLib.DateTime.new_now_local();
      const delayMs = 1000 - Math.floor(now.get_microsecond() / 1000);
      this._msTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delayMs, () => {
        this._updateAllNow();
        this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, sec, () => {
          this._updateAllNow();
          return GLib.SOURCE_CONTINUE;
        });
        this._msTimeoutId = 0;
        return GLib.SOURCE_REMOVE;
      });
    } else {
      this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, sec, () => {
        this._updateAllNow();
        return GLib.SOURCE_CONTINUE;
      });
    }
  }

  _syncIndicator() {
    if (!this._indicator) return;
    const show = this._settings.get_boolean('show-panel-icon');
    this._indicator.visible = show;
  }

  enable() {
    this._settings = this.getSettings();

    this._indicator = new NumericClockIndicator(
      this._settings,
      this.path,
      () => this.openPreferences(),
    );
    Main.panel.addToStatusArea('numeric-clock-access', this._indicator, 1, 'right');

    this._settingsChangedIds.push(
      this._settings.connect('changed::format-string', () => this._updateAllNow()),
      this._settings.connect('changed::update-interval', () => this._restartTimer()),
      this._settings.connect('changed::smooth-second', () => this._restartTimer()),
      this._settings.connect('changed::only-topbar', () => this._updateAllNow()),
      this._settings.connect('changed::show-panel-icon', () => this._syncIndicator()),
    );
    this._stageAddedId = connectStageSignal(global.stage, 'added', () => this._updateAllNow());
    this._stageRemovedId = connectStageSignal(global.stage, 'removed', () => this._updateAllNow());
    this._restartTimer();
    this._syncIndicator();
  }

  disable() {
    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }

    if (this._timeoutId) GLib.source_remove(this._timeoutId);
    this._timeoutId = 0;
    if (this._msTimeoutId) GLib.source_remove(this._msTimeoutId);
    this._msTimeoutId = 0;

    for (const id of this._settingsChangedIds) {
      try { this._settings.disconnect(id); } catch {}
    }
    this._settingsChangedIds = [];

    if (this._stageAddedId)   { disconnectStageSignal(global.stage, this._stageAddedId);   this._stageAddedId = 0; }
    if (this._stageRemovedId) { disconnectStageSignal(global.stage, this._stageRemovedId); this._stageRemovedId = 0; }

    for (const [actor, id] of this._textSignalIds) {
      try { actor.disconnect(id); } catch {}
      try { delete actor[HOOKED]; } catch {}
    }
    this._textSignalIds = [];

    this._restoreDefaultClocks();
    this._settings = null;
  }

  _restoreDefaultClocks() {
    const dm = Main.panel?.statusArea?.dateMenu;
    if (dm) {
      for (const method of ['_updateClock', '_updateClockDisplay', '_update']) {
        if (typeof dm[method] === 'function') {
          try { dm[method](); break; } catch {}
        }
      }
    }
    for (const lab of this._collectClockLabels()) {
      if (!lab || typeof lab.set_text !== 'function') continue;
      try {
        const ct = lab.clutter_text;
        if (ct && ct[HOOKED]) delete ct[HOOKED];
      } catch {}
    }
  }
}
