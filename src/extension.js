// SPDX-License-Identifier: MIT
// Numeric Clock — GNOME 45+ (ESM)
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

const HOOKED = Symbol('nc-hooked');
const TIME_RE = /(^|\s)\d{1,2}:\d{2}(:\d{2})?(\s|$)/i;
const MONTHS = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i;
const DAYS   = /\b(sun|mon|tue|wed|thu|fri|sat)\b/i;

function formatNow(fmt) {
  const dt = GLib.DateTime.new_now_local();
  try { return dt.format(fmt); }
  catch { return dt.format('%d/%m/%Y %H:%M'); }
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

export default class NumericClockExtension extends Extension {
  constructor(uuid) {
    super(uuid);
    this._settings = null;
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
    try {
      if (this._settings && this._settings.get_boolean('only-topbar'))
        return Array.from(set);
    } catch {}
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

  enable() {
    this._settings = this.getSettings();

    this._settingsChangedIds.push(
      this._settings.connect('changed::format-string', () => this._updateAllNow()),
      this._settings.connect('changed::update-interval', () => this._restartTimer()),
    );
    this._stageAddedId   = global.stage.connect('actor-added',   () => this._updateAllNow());
    this._stageRemovedId = global.stage.connect('actor-removed', () => this._updateAllNow());
    this._restartTimer();
  }

  disable() {
    if (this._timeoutId) GLib.source_remove(this._timeoutId);
    this._timeoutId = 0;
    if (this._msTimeoutId) GLib.source_remove(this._msTimeoutId);
    this._msTimeoutId = 0;

    for (const id of this._settingsChangedIds) {
      try { this._settings.disconnect(id); } catch {}
    }
    this._settingsChangedIds = [];

    if (this._stageAddedId)   { try { global.stage.disconnect(this._stageAddedId); } catch {}   this._stageAddedId = 0; }
    if (this._stageRemovedId) { try { global.stage.disconnect(this._stageRemovedId); } catch {} this._stageRemovedId = 0; }

    for (const [actor, id] of this._textSignalIds) {
      try { actor.disconnect(id); } catch {}
      try { delete actor[HOOKED]; } catch {}
    }
    this._textSignalIds = [];

    this._settings = null;
  }
}
