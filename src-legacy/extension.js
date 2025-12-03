/* SPDX-License-Identifier: MIT */
/* Numeric Clock (Wayland/Xorg, GNOME 42–44) — by Nick Otmazgin */
'use strict';

const { Gio, GLib, St } = imports.gi;
const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;

/* ---- debug (quiet in release) ---- */
const DEBUG = false;
function debug(msg) { if (DEBUG) log(`[numeric-clock] ${msg}`); }

let settings = null;
let _timeoutId = 0;
let _msTimeoutId = 0;
let _settingsChangedIds = [];
let _stageAddedId = 0;
let _stageRemovedId = 0;
let _textSignalIds = [];   // [ [actor, id], ... ]

/* mark actors we’ve already hooked so we don’t double-connect */
const HOOKED = Symbol('nc-hooked');

const MONTHS = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec';
const DAYS   = 'sun|mon|tue|wed|thu|fri|sat';
const TIME_RE = /(^|\s)\d{1,2}:\d{2}(:\d{2})?(\s|$)/;

function _formatNow(fmt) {
  try { return GLib.DateTime.new_now_local().format(fmt); }
  catch (_) { return GLib.DateTime.new_now_local().format('%d/%m/%Y %H:%M'); }
}

function _textLooksLikeClock(txt) {
  if (!txt) return false;
  const s = String(txt).toLowerCase();
  return TIME_RE.test(s) ||
         new RegExp('\\b(' + MONTHS + ')\\b').test(s) ||
         new RegExp('\\b(' + DAYS   + ')\\b').test(s);
}

function _allStageLabels() {
  const out = [];
  (function walk(a){
    if (!a || typeof a.get_children !== 'function') return;
    const kids = a.get_children();
    for (let i = 0; i < kids.length; i++) {
      const c = kids[i];
      if (c instanceof St.Label) out.push(c);
      walk(c);
    }
  })(global.stage);
  return out;
}

function _collectClockLabels() {
  const set = new Set();

  // GNOME top-bar DateMenu fields (when present)
  const dm = (Main.panel && Main.panel.statusArea) ? Main.panel.statusArea.dateMenu : null;
  if (dm) {
    if (dm._clockDisplay instanceof St.Label) set.add(dm._clockDisplay);
    if (dm._clock        instanceof St.Label) set.add(dm._clock);
    if (dm._time         instanceof St.Label) set.add(dm._time);
  }

  try {
    if (settings && settings.get_boolean('only-topbar'))
      return Array.from(set);
  } catch (_) {}

  // Any label that looks like a clock (covers Zorin taskbar etc.)
  const all = _allStageLabels();
  for (let i = 0; i < all.length; i++) {
    const lab = all[i];
    try {
      const cls  = (typeof lab.get_style_class_name === 'function' ? lab.get_style_class_name() : '').toLowerCase();
      const name = (typeof lab.get_name              === 'function' ? lab.get_name()              : '').toLowerCase();
      const txt  =  typeof lab.get_text              === 'function' ? lab.get_text()              : '';
      if (cls.indexOf('clock') !== -1 || name.indexOf('clock') !== -1 ||
          cls.indexOf('date')  !== -1 || name.indexOf('date')  !== -1 ||
          _textLooksLikeClock(txt))
        set.add(lab);
    } catch (_) {}
  }
  return Array.from(set);
}

function _forcePlain(lab) {
  try {
    const ct = lab && lab.clutter_text;
    if (ct && typeof ct.set_use_markup === 'function')
      ct.set_use_markup(false);
  } catch (_) {}
}

function _applyTo(lab) {
  try {
    if (!lab) return;

    _forcePlain(lab);
    if (typeof lab.set_text === 'function')
      lab.set_text(_formatNow(settings.get_string('format-string')));

    // If something rewrites it (e.g., Zorin), re-apply once it changes.
    const ct = lab && lab.clutter_text;
    if (ct && !ct[HOOKED] && typeof ct.connect === 'function') {
      ct[HOOKED] = true;
      const id = ct.connect('notify::text', () => {
        try {
          _forcePlain(lab);
          if (typeof lab.set_text === 'function')
            lab.set_text(_formatNow(settings.get_string('format-string')));
        } catch (_) {}
      });
      _textSignalIds.push([ct, id]);
    }
  } catch (_) {}
}

function _updateAllNow() {
  let n = 0;
  const labs = _collectClockLabels();
  for (let i = 0; i < labs.length; i++) {
    _applyTo(labs[i]);
    n++;
  }
  debug('tick — touched ' + n + ' label(s)');
}

function _tickOnceAndReschedule() {
  _updateAllNow();
  const sec = Math.max(1, settings.get_int('update-interval'));
  if (_timeoutId) { GLib.source_remove(_timeoutId); _timeoutId = 0; }
  _timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, sec, () => {
    _tickOnceAndReschedule();
    return GLib.SOURCE_REMOVE; // one-shot, we reschedule manually
  });
}

function _restartTimer() {
  if (_timeoutId) {
    GLib.source_remove(_timeoutId);
    _timeoutId = 0;
  }
  if (_msTimeoutId) { GLib.source_remove(_msTimeoutId); _msTimeoutId = 0; }
  try {
    const sec = Math.max(1, settings.get_int('update-interval'));
    const smooth = !!settings.get_boolean('smooth-second');
    if (smooth && sec === 1) {
      const now = GLib.DateTime.new_now_local();
      const delayMs = 1000 - Math.floor(now.get_microsecond() / 1000);
      _msTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delayMs, () => {
        _tickOnceAndReschedule();
        _msTimeoutId = 0;
        return GLib.SOURCE_REMOVE;
      });
    } else {
      _tickOnceAndReschedule();
    }
  } catch (_) { _tickOnceAndReschedule(); }
}

/* GNOME entry points */
function init() {}

function enable() {
  settings = ExtensionUtils.getSettings();

  _settingsChangedIds = [];
  _settingsChangedIds.push(settings.connect('changed::format-string', _updateAllNow));
  _settingsChangedIds.push(settings.connect('changed::update-interval', _restartTimer));

  _stageAddedId   = global.stage.connect('actor-added',   _updateAllNow);
  _stageRemovedId = global.stage.connect('actor-removed', _updateAllNow);

  _restartTimer();
}

function disable() {

  if (_timeoutId) { GLib.source_remove(_timeoutId); _timeoutId = 0; }
  if (_msTimeoutId) { GLib.source_remove(_msTimeoutId); _msTimeoutId = 0; }

  for (let i = 0; i < _settingsChangedIds.length; i++) {
    try { settings.disconnect(_settingsChangedIds[i]); } catch (_) {}
  }
  _settingsChangedIds = [];

  if (_stageAddedId)   { try { global.stage.disconnect(_stageAddedId); }   catch (_) {} _stageAddedId   = 0; }
  if (_stageRemovedId) { try { global.stage.disconnect(_stageRemovedId); } catch (_) {} _stageRemovedId = 0; }

  for (let i = 0; i < _textSignalIds.length; i++) {
    const pair = _textSignalIds[i];
    try { pair[0].disconnect(pair[1]); } catch (_) {}
    try { delete pair[0][HOOKED]; } catch (_) {}
  }
  _textSignalIds = [];
  settings = null;
}
