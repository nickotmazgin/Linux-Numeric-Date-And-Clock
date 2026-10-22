// Stand-in for resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js
// so prefs.js can be rendered outside GNOME Shell (demo video only).
import Gio from 'gi://Gio';

export const gettext = s => s;

export class ExtensionPreferences {
  constructor(dir) {
    this.dir = dir;
    const [, bytes] = Gio.File.new_for_path(`${dir}/metadata.json`).load_contents(null);
    this.metadata = JSON.parse(new TextDecoder().decode(bytes));
  }

  getSettings() {
    const src = Gio.SettingsSchemaSource.new_from_directory(`${this.dir}/schemas`,
      Gio.SettingsSchemaSource.get_default(), false);
    return new Gio.Settings({ settings_schema: src.lookup(this.metadata['settings-schema'], false) });
  }
}
