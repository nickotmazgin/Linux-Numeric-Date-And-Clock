// SPDX-License-Identifier: MIT
// Numeric Clock — GNOME 45+ (ESM)
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Pango from 'gi://Pango';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import { FORMAT_PRESETS, applyPresetToSettings, formatNow } from './presets.js';

// Labels outside the top bar DateMenu are only taken over when they look like a
// clock as a whole ("Wed 13:17", "22/10 1:17 PM") or carry a "clock" style
// class / name. GNOME's own clock writes "13\u200e\u223624" (LRM + RATIO).
const CLOCK_NAME_RE = /(^|[-_\s])clock([-_\s]|$)/i;
const CLOCK_TEXT_RE = /^[\p{L}\p{N}\s,./-]{0,24}?\d{1,2}\u200e?[:\u2236]\d{2}(\u200e?[:\u2236]\d{2})?(\s?[ap]\.?m\.?)?$/iu;
// When not limited to the top bar, look for new clock labels every few ticks.
const RESCAN_TICKS = 5;

function looksLikeClock(lab) {
  const cls = lab.get_style_class_name?.() || '';
  const name = lab.get_name?.() || '';
  if (CLOCK_NAME_RE.test(cls) || CLOCK_NAME_RE.test(name))
    return true;
  const txt = (lab.get_text?.() || '').trim();
  return txt.length > 0 && txt.length <= 40 && CLOCK_TEXT_RE.test(txt);
}

// Collect St.Labels under the stage, skipping whole subtrees in `skip`
// (calendar popup, notifications, our own menu) so their text is never touched.
function stageLabels(skip) {
  const out = [];
  (function walk(a) {
    for (const c of a.get_children()) {
      if (skip.has(c)) continue;
      if (c instanceof St.Label) out.push(c);
      walk(c);
    }
  })(global.stage);
  return out;
}

// Clutter 14 (GNOME 46) renamed actor-added/-removed to child-added/-removed.
function connectFirst(obj, signals, callback) {
  for (const sig of signals) {
    if (GObject.signal_lookup(sig, obj.constructor.$gtype))
      return obj.connect(sig, callback);
  }
  return 0;
}

function copyTextToClipboard(text) {
  try {
    St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, String(text || ''));
    Main.notify(_('Numeric Clock'), _('Time copied to clipboard'));
  } catch (e) {
    console.error('[Numeric Clock] clipboard error:', e);
  }
}

function menuItemWithIcon(label, iconName) {
  const item = new PopupMenu.PopupMenuItem(label);
  if (iconName) {
    item.insert_child_at_index(
      new St.Icon({ icon_name: iconName, style_class: 'popup-menu-icon' }),
      0,
    );
  }
  return item;
}

// Hover tooltip for the panel icon, styled like the dash labels.
class Tooltip {
  constructor(actor, textFn) {
    this._actor = actor;
    this._textFn = textFn;
    this._label = null;
    this._timeoutId = 0;
    actor.connect('notify::hover', () => (actor.hover ? this._schedule() : this.hide()));
    actor.connect('button-press-event', () => {
      this.hide();
      return Clutter.EVENT_PROPAGATE;
    });
  }

  _schedule() {
    this.hide();
    this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 450, () => {
      this._timeoutId = 0;
      this._show();
      return GLib.SOURCE_REMOVE;
    });
  }

  _show() {
    const actor = this._actor;
    if (!actor.mapped || actor.menu?.isOpen)
      return;
    this._label = new St.Label({ style_class: 'dash-label numeric-clock-tooltip', text: this._textFn() });
    Main.uiGroup.add_child(this._label);
    const [x, y] = actor.get_transformed_position();
    const [w, h] = actor.get_transformed_size();
    const [, lw] = this._label.get_preferred_width(-1);
    const [, lh] = this._label.get_preferred_height(-1);
    const monitor = Main.layoutManager.findMonitorForActor(actor) ?? Main.layoutManager.primaryMonitor;
    const gap = 6;
    let lx = Math.round(x + w / 2 - lw / 2);
    lx = Math.max(monitor.x + gap, Math.min(lx, monitor.x + monitor.width - lw - gap));
    let ly = Math.round(y + h + gap);
    if (ly + lh > monitor.y + monitor.height)
      ly = Math.round(y - lh - gap);
    this._label.set_position(lx, ly);
  }

  hide() {
    if (this._timeoutId) {
      GLib.source_remove(this._timeoutId);
      this._timeoutId = 0;
    }
    this._label?.destroy();
    this._label = null;
  }
}

const NumericClockIndicator = GObject.registerClass(
class NumericClockIndicator extends PanelMenu.Button {
  _init(settings, extensionPath, openPrefs) {
    super._init(0.0, _('Numeric Clock'));
    this.add_style_class_name('numeric-clock-panel');
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
    this._tooltip = new Tooltip(this,
      () => `${_('Numeric Clock')} — ${formatNow(this._settings.get_string('format-string'))}`);
    this._buildMenu();

    this._settingsChangedIds = [
      this._settings.connect('changed::format-string', () => this._refreshMenuTime()),
      this._settings.connect('changed::show-panel-icon', () => this._syncVisibility()),
    ];
    this._syncVisibility();
  }

  destroy() {
    this._clearMenuTimer();
    this._tooltip.hide();
    for (const id of this._settingsChangedIds || []) {
      try { this._settings.disconnect(id); } catch {}
    }
    this._settingsChangedIds = [];
    super.destroy();
  }

  _syncVisibility() {
    this.visible = this._settings.get_boolean('show-panel-icon');
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

  // With the panel icon hidden, anchor the menu to the clock that was clicked.
  openQuickMenu(anchor) {
    this.menu.sourceActor = this.visible || !anchor ? this : anchor;
    this.menu.toggle();
  }

  _buildMenu() {
    this.menu.removeAll();
    this._timeLabel = new PopupMenu.PopupMenuItem('', { reactive: false, can_focus: false });
    this._timeLabel.label.clutter_text.ellipsize = Pango.EllipsizeMode.END;
    this.menu.addMenuItem(this._timeLabel);

    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    const copyItem = menuItemWithIcon(_('Copy current time'), 'edit-copy-symbolic');
    copyItem.connect('activate', () => {
      copyTextToClipboard(formatNow(this._settings.get_string('format-string')));
    });
    this.menu.addMenuItem(copyItem);

    const presets = new PopupMenu.PopupSubMenuMenuItem(_('Quick presets'), true);
    if (presets.icon)
      presets.icon.icon_name = 'document-edit-symbolic';
    for (const preset of FORMAT_PRESETS) {
      const item = new PopupMenu.PopupMenuItem(_(preset.label));
      item.connect('activate', () => {
        applyPresetToSettings(this._settings, preset);
        this._refreshMenuTime();
        Main.notify(_('Numeric Clock'), `${_('Format preset applied')}: ${_(preset.label)}`);
      });
      presets.menu.addMenuItem(item);
    }
    this.menu.addMenuItem(presets);

    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    const prefsItem = menuItemWithIcon(_('Preferences'), 'preferences-system-symbolic');
    prefsItem.connect('activate', () => this._openPrefs());
    this.menu.addMenuItem(prefsItem);

    this.menu.connect('open-state-changed', (_menu, open) => {
      if (open) {
        this._tooltip.hide();
        this._startMenuTimer();
      } else {
        this._clearMenuTimer();
      }
    });
  }
});

export default class NumericClockExtension extends Extension {
  enable() {
    this._settings = this.getSettings();
    // Hooked label -> { ct, textId, clickId, destroyId, reactive }
    this._labels = new Map();
    this._timeoutId = 0;
    this._ticks = 0;
    this._rescanIdleId = 0;
    this._applying = false;

    this._indicator = new NumericClockIndicator(
      this._settings,
      this.path,
      () => this.openPreferences(),
    );
    Main.panel.addToStatusArea('numeric-clock-access', this._indicator, 1, 'right');

    this._settingsChangedIds = [
      this._settings.connect('changed::format-string', () => this._updateAll()),
      this._settings.connect('changed::update-interval', () => this._restartTimer()),
      this._settings.connect('changed::smooth-second', () => this._restartTimer()),
      this._settings.connect('changed::only-topbar', () => {
        this._unhookAll();
        this._restoreDateMenu();
        this._restartTimer();
      }),
    ];
    // Stage children come and go with panels and docks; look again once idle.
    this._stageSignalIds = [['child-added', 'actor-added'], ['child-removed', 'actor-removed']]
      .map(names => connectFirst(global.stage, names, () => this._queueRescan()))
      .filter(id => id);
    this._restartTimer();
  }

  disable() {
    this._clearTimer();
    if (this._rescanIdleId) {
      GLib.source_remove(this._rescanIdleId);
      this._rescanIdleId = 0;
    }
    for (const id of this._stageSignalIds)
      global.stage.disconnect(id);
    this._stageSignalIds = null;
    for (const id of this._settingsChangedIds)
      this._settings.disconnect(id);
    this._settingsChangedIds = null;

    this._unhookAll();
    this._labels = null;
    this._indicator.destroy();
    this._indicator = null;
    this._restoreDateMenu();
    this._settings = null;
  }

  _dateMenu() {
    return Main.panel?.statusArea?.dateMenu ?? null;
  }

  _candidateLabels() {
    const out = [];
    const dm = this._dateMenu();
    if (dm?._clockDisplay instanceof St.Label)
      out.push(dm._clockDisplay);
    if (this._settings.get_boolean('only-topbar'))
      return out;
    const skip = new Set([this._indicator.menu.actor, Main.messageTray]);
    if (dm?.menu?.actor)
      skip.add(dm.menu.actor);
    for (const lab of stageLabels(skip)) {
      if (!this._labels.has(lab) && looksLikeClock(lab))
        out.push(lab);
    }
    return out;
  }

  _scan() {
    for (const lab of this._candidateLabels())
      this._hook(lab);
  }

  _queueRescan() {
    if (this._rescanIdleId || this._settings.get_boolean('only-topbar'))
      return;
    this._rescanIdleId = GLib.idle_add(GLib.PRIORITY_LOW, () => {
      this._rescanIdleId = 0;
      this._scan();
      this._updateAll();
      return GLib.SOURCE_REMOVE;
    });
  }

  _hook(lab) {
    if (this._labels.has(lab)) return;
    const ct = lab.clutter_text;
    const entry = { ct, textId: 0, clickId: 0, destroyId: 0, reactive: lab.reactive };
    // Plain text only: never let a format string inject Pango markup.
    ct.set_use_markup(false);
    // The shell rewrites the clock text on its own schedule; put ours back.
    entry.textId = ct.connect('notify::text', () => {
      if (!this._applying)
        this._apply(lab);
    });
    entry.destroyId = lab.connect('destroy', () => this._labels?.delete(lab));
    if (Main.panel.contains(lab)) {
      lab.reactive = true;
      entry.clickId = lab.connect('button-press-event', (_actor, event) => {
        if (!this._settings.get_boolean('clock-secondary-opens-menu'))
          return Clutter.EVENT_PROPAGATE;
        const btn = event.get_button();
        if (btn === Clutter.BUTTON_SECONDARY || btn === Clutter.BUTTON_MIDDLE) {
          this._indicator.openQuickMenu(lab);
          return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
      });
    }
    this._labels.set(lab, entry);
    this._apply(lab);
  }

  _unhookAll() {
    for (const [lab, e] of this._labels) {
      e.ct.disconnect(e.textId);
      lab.disconnect(e.destroyId);
      if (e.clickId) {
        lab.disconnect(e.clickId);
        lab.reactive = e.reactive;
      }
    }
    this._labels.clear();
  }

  _apply(lab) {
    const text = formatNow(this._settings.get_string('format-string'));
    if (lab.get_text() === text) return;
    this._applying = true;
    try {
      lab.set_text(text);
    } finally {
      this._applying = false;
    }
  }

  _updateAll() {
    for (const lab of this._labels.keys())
      this._apply(lab);
  }

  _tick() {
    if (this._ticks++ % RESCAN_TICKS === 0 || this._labels.size === 0)
      this._scan();
    this._updateAll();
  }

  _clearTimer() {
    if (this._timeoutId) {
      GLib.source_remove(this._timeoutId);
      this._timeoutId = 0;
    }
  }

  _restartTimer() {
    this._clearTimer();
    this._ticks = 0;
    this._tick();
    const sec = Math.max(1, this._settings.get_int('update-interval'));
    if (this._settings.get_boolean('smooth-second'))
      this._scheduleAligned(sec);
    else
      this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, sec, () => {
        this._tick();
        return GLib.SOURCE_CONTINUE;
      });
  }

  // Fire just after each whole-second boundary. timeout_add_seconds() is not
  // used here because GLib shifts it by a per-session offset, which would make
  // the displayed seconds lag the real ones by up to a second.
  _scheduleAligned(sec) {
    const ms = Math.floor(GLib.get_real_time() / 1000) % 1000;
    this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, sec * 1000 - ms + 5, () => {
      this._tick();
      this._scheduleAligned(sec);
      return GLib.SOURCE_REMOVE;
    });
  }

  // Put the stock GNOME clock text back right away instead of at its next tick.
  _restoreDateMenu() {
    const dm = this._dateMenu();
    if (dm?._clockDisplay && typeof dm._clock?.clock === 'string')
      dm._clockDisplay.text = dm._clock.clock;
  }
}
