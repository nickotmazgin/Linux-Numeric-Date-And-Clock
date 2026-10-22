# Contributing to Numeric Clock

Bug reports, ideas and pull requests are welcome. For security issues, see
[SECURITY.md](SECURITY.md) instead of opening a public issue.

## Layout

| Path | What it is |
| ---- | ---------- |
| `src/extension.js` | Clock takeover, panel icon and quick menu |
| `src/prefs.js` | Preferences window (Settings and About pages) |
| `src/presets.js` | Format presets and formatting helpers shared by both |
| `src/schemas/` | GSettings schema |
| `src/icons/` | Symbolic panel icon (16 px grid) |
| `tools/build.sh` | Builds `dist/numeric-clock@nickotmazgin.v<version>.shell-extension.zip` |
| `tools/validate.sh` | Checks the built zip against `src/metadata.json` |
| `tools/nested-smoke-test.sh` | Runs the built zip in an isolated nested GNOME Shell |
| `tools/media/` | Narrated demo video, made in a nested shell ([README](tools/media/README.md)) |

## Development loop

```bash
./tools/build.sh && ./tools/validate.sh
./tools/nested-smoke-test.sh    # drive the clock in a nested shell; prints PASSED/FAILED
npx -y eslint@9 .               # lint (same as CI)
```

To try a build on your own desktop:

```bash
gnome-extensions install --force dist/numeric-clock@nickotmazgin.v*.shell-extension.zip
```

GNOME Shell caches extension code, so restart the shell to load it
(X11: Alt+F2, `r`, Enter; Wayland: log out and back in). The nested smoke test needs no
restart and never touches your real settings.

Preferences run in their own process, so `gnome-extensions prefs numeric-clock@nickotmazgin`
shows `prefs.js` changes right away.

## Pull requests

- Keep the zip file list in `tools/build.sh` and `tools/validate.sh` in sync with `src/`.
- Never ship `schemas/gschemas.compiled`.
- Add a `## v<version> — <date>` entry to `CHANGELOG.md` when you bump `version-name`.
- CI must pass: Validate, Lint (ESLint + ShellCheck) and CodeQL.
