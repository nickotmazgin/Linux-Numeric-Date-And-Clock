/* SPDX-License-Identifier: MIT */
/* Numeric Clock (Wayland) — by Nick Otmazgin */
'use strict';

const { Gio, GLib, St } = imports.gi;
const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;

/* ---- debug (quiet in release) ---- */
const DEBUG = false;
function debug(msg) { if (DEBUG) log(`[numeric-clock] ${msg}`); }

let settings = null;
let _timeoutId = 0;
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
         new RegExp(`\\b(${MONTHS})\\b`).test(s) ||
         new RegExp(`\\b(${DAYS})\\b`).test(s);
}

function _allStageLabels() {
  const out = [];
  (function walk(a){
    if (!a || typeof a.get_children !== 'function') return;
    for (const c of a.get_children()) {
      if (c instanceof St.Label) out.push(c);
      walk(c);
    }
  })(global.stage);
  return out;
}

function _collectClockLabels() {
  const set = new Set();

  // GNOME top-bar DateMenu fields (when present)
  const dm = Main.panel?.statusArea?.dateMenu;
  if (dm) {
    if (dm._clockDisplay instanceof St.Label) set.add(dm._clockDisplay);
    if (dm._clock        instanceof St.Label) set.add(dm._clock);
    if (dm._time         instanceof St.Label) set.add(dm._time);
  }

  // Any label that looks like a clock (covers Zorin taskbar etc.)
  for (const lab of _allStageLabels()) {
    try {
      const cls  = (lab.get_style_class_name?.() || '').toLowerCase();
      const name = (lab.get_name?.() || '').toLowerCase();
      const txt  = lab.get_text?.() || '';
      if (cls.includes('clock') || name.includes('clock') ||
          cls.includes('date')  || name.includes('date')  ||
          _textLooksLikeClock(txt))
        set.add(lab);
    } catch (_) {}
  }
  return Array.from(set);
}

function _forcePlain(lab) {
  try {
    if (lab?.clutter_text && typeof lab.clutter_text.set_use_markup === 'function')
      lab.clutter_text.set_use_markup(false);
  } catch (_) {}
}

function _applyTo(lab) {
  try {
    if (!lab) return;

    _forcePlain(lab);
    if (lab.set_text)
      lab.set_text(_formatNow(settings.get_string('format-string')));

    // If something rewrites it (e.g., Zorin), re-apply once it changes.
    if (lab.clutter_text && typeof lab.clutter_text.connect === 'function' && !lab.clutter_text[HOOKED]) {
      lab.clutter_text[HOOKED] = true;
      const id = lab.clutter_text.connect('notify::text', () => {
        try {
          _forcePlain(lab);
          lab.set_text(_formatNow(settings.get_string('format-string')));
        } catch (_) {}
      });
      _textSignalIds.push([lab.clutter_text, id]);
    }
  } catch (_) {}
}

function _updateAllNow() {
  let n = 0;
  for (const lab of _collectClockLabels()) {
    _applyTo(lab);
    n++;
  }
  debug(`tick — touched ${n} label(s)`);
}

function _tickOnceAndReschedule() {
  _updateAllNow();
  const sec = Math.max(1, settings.get_int('update-interval'));
  _timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, sec, () => {
    _tickOnceAndReschedule();
    return GLib.SOURCE_REMOVE;
  });
}

function _restartTimer() {
  if (_timeoutId) { GLib.source_remove(_timeoutId); _timeoutId = 0; }
  _tickOnceAndReschedule();
}

function init() {
  settings = ExtensionUtils.getSettings('org.nick.numericclock');
}

function enable() {
  debug('ENABLED');

  _settingsChangedIds = [];
  _settingsChangedIds.push(settings.connect('changed::format-string', _updateAllNow));
  _settingsChangedIds.push(settings.connect('changed::update-interval', _restartTimer));

  _stageAddedId   = global.stage.connect('actor-added',   _updateAllNow);
  _stageRemovedId = global.stage.connect('actor-removed', _updateAllNow);

  _restartTimer();
}

function disable() {
  debug('DISABLED');

  if (_timeoutId) { GLib.source_remove(_timeoutId); _timeoutId = 0; }

  for (const id of _settingsChangedIds) {
    try { settings.disconnect(id); } catch (_) {}
  }
  _settingsChangedIds = [];

  if (_stageAddedId)   { try { global.stage.disconnect(_stageAddedId); } catch (_) {} _stageAddedId = 0; }
  if (_stageRemovedId) { try { global.stage.disconnect(_stageRemovedId); } catch (_) {} _stageRemovedId = 0; }

  for (const [actor, id] of _textSignalIds) {
    try { actor.disconnect(id); } catch (_) {}
    try { delete actor[HOOKED]; } catch (_) {}
  }
  _textSignalIds = [];
}

