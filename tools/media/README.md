# Demo video

```bash
python3 tools/media/demo_video.py    # dist/media/numeric-clock-v<version>-demo.mp4 (1080p, ~80 s)
```

Your desktop is never driven. The tour runs in an isolated nested GNOME Shell
(its own D-Bus session, settings database and extensions folder), steered by
[`showcase/extension.js`](showcase/extension.js), which only calls Numeric Clock's
own functions (open the menu, apply a preset, switch the menu style, copy the
time, open Preferences). No pointer or keyboard events are generated: on X11,
GNOME's virtual input devices would reach your real session.

ffmpeg records just the nested stage with `x11grab`, so keep that window
uncovered for the two minutes it runs. Each scene gets its own "camera" framing
(`CAMERA` in `demo_video.py`) so the menus are readable at 1080p.

Preferences are rendered off-screen by [`showcase/prefs_render.js`](showcase/prefs_render.js)
(plain gjs with [`showcase/shim.js`](showcase/shim.js) standing in for GNOME
Shell), stitched into one tall page, and shown as smooth scrolls. An empty
`XDG_CONFIG_HOME` keeps your own GTK colour overrides out of the render.

## Narration and music

Both are free to use anywhere (YouTube, social networks), with no fee or attribution required:

- **Voice:** [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) (Apache-2.0) via
  [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx) (MIT), run locally.
  Edit the lines in [`narration.py`](narration.py); each scene lasts as long as its line.
- **Music:** [`make_music.py`](make_music.py) synthesises an original track
  (no samples, no third-party audio).

The voice model is shared with ClipFlow Pro and EaseHub in
`~/.cache/clipflow-pro-media-tools` (about 350 MB). One-time setup:

```bash
D=~/.cache/clipflow-pro-media-tools; mkdir -p "$D" && cd "$D"
python3 -m venv venv && ./venv/bin/pip install kokoro-onnx soundfile
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
```

Without it, the video is still made, with music and no narration.

Needs: GNOME Shell on X11, `ffmpeg`, `xdotool`, `xwininfo`, `python3-pil`, `gjs`.
The finished video lands in `dist/` (git-ignored); publish it as a release asset or on YouTube.
