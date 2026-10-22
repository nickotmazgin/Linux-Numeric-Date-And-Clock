# Support

Thanks for using Numeric Clock!

> **Compatibility:** GNOME Shell **45–51** on **Wayland and X11/Xorg**. GNOME 42–44 support has ended; upgrade to GNOME **45** or newer.

## Documentation

- [README.md](../README.md) — features, install, format examples and troubleshooting
- [CHANGELOG.md](../CHANGELOG.md) — what changed in each release
- [CONTRIBUTING.md](../CONTRIBUTING.md) — building and testing
- [PRIVACY.md](../PRIVACY.md) — local only, no network, no telemetry

## Getting help

1. Search [existing issues](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/issues) and [discussions](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/discussions)
2. Questions, format help and preset ideas → [Discussions](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/discussions)
3. Bugs → [new issue](https://github.com/nickotmazgin/Linux-Numeric-Date-And-Clock/issues/new/choose)

When reporting a bug, include your GNOME Shell version (`gnome-shell --version`), the extension
version (`gnome-extensions info numeric-clock@nickotmazgin`), your session type (Wayland or X11),
your format string, and any log lines:

```bash
journalctl --user -b 0 -o cat | grep -i "numeric.clock"
```

## Troubleshooting

**The clock shows the default format instead of mine.** The format string is invalid or empty —
Preferences marks it red. See the format codes list in Preferences.

**Seconds jump or lag.** Set *Update interval* to `1` and turn on *Smooth tick*.

**Another panel or dock clock is not formatted.** Turn off *Only change the top bar clock*.

**Extension not showing after install.** Enable it, then restart GNOME Shell
(Wayland: log out and back in; X11: `Alt+F2`, `r`, Enter):

```bash
gnome-extensions enable numeric-clock@nickotmazgin
```

## Security

Report vulnerabilities privately — see [SECURITY.md](../SECURITY.md).

## Show your support

⭐ Star the repository · share it · [donate via PayPal](https://www.paypal.com/donate/?hosted_button_id=4HM44VH47LSMW)
