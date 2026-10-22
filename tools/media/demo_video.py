#!/usr/bin/env python3
"""Narrated 1080p demo video for Numeric Clock — without touching your desktop.

  python3 tools/media/demo_video.py          # dist/media/numeric-clock-v<version>-demo.mp4

1. The tour runs in an isolated nested GNOME Shell (its own D-Bus session,
   settings database and extensions folder), driven by tools/media/showcase/
   extension.js, which only calls Numeric Clock's own functions. No pointer or
   keyboard events are generated, so nothing reaches your real session.
   ffmpeg records just that window (x11grab), so keep it uncovered while it runs.
2. Preferences are rendered off-screen (showcase/prefs_render.js) and shown as
   smooth scrolls over the full page.
3. Narration: Kokoro-82M (Apache-2.0) via kokoro-onnx (MIT), run locally.
   Music: make_music.py synthesises an original track (no samples), free to use.

Needs GNOME Shell on X11, ffmpeg, xdotool, xwininfo, python3-pil, and the media
venv described in tools/media/README.md (without it: music only, no voice).
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

MEDIA = Path(__file__).resolve().parent
REPO = MEDIA.parents[1]
sys.path.insert(0, str(MEDIA))

from narration import NARRATION, SPEED, VOICE  # noqa: E402

UUID = 'numeric-clock@nickotmazgin'
TOOLS = Path(os.environ.get('NC_MEDIA_TOOLS', Path.home() / '.cache' / 'clipflow-pro-media-tools'))
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
CLIENT = (1600, 900)          # nested stage; fits a 1920x1080 screen with its frame
OUT_W, OUT_H, FPS = 1920, 1080, 30
MUSIC_GAIN = 0.045
BG = (24, 27, 36)
CAPTIONS = {
    'clock': 'Numeric date and time · ticks on the second',
    'tooltip': 'Hover: the time and what each click does',
    'menu': 'Left-click: quick menu · presets · style · Preferences · About · Donate',
    'presets': 'Quick presets: ISO 8601 · week number · 12-hour · international',
    'styles': 'Menu style: System · Light · Dark',
    'copy': 'Middle-click: copy the current time',
    'clockmenu': 'Right-click the clock: same menu · left-click: GNOME calendar',
    'prefs': 'Right-click the icon: Preferences',
    'format': 'Any strftime format · live preview · format codes',
    'behavior': 'Interval · smooth tick · menu style · panel icon clicks',
    'presets_tab': 'Presets with live samples',
    'about': 'GNOME Shell 45–51 · Wayland and X11',
}


def log(msg):
    print(f'[demo] {msg}', flush=True)


def meta():
    return json.loads((REPO / 'src' / 'metadata.json').read_text())


def version():
    return meta()['version-name'].split()[0]


def shell_range():
    sv = meta()['shell-version']
    return f'{sv[0]}–{sv[-1]}'


def probe_len(path: Path) -> float:
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0',
                                 str(path)], capture_output=True, text=True, check=True).stdout.strip())


# ------------------------------------------------------------------ narration

def speak() -> tuple[dict, dict]:
    """Narration WAVs (cached by text) and their lengths; empty without Kokoro."""
    py = TOOLS / 'venv' / 'bin' / 'python'
    if not (py.exists() and (TOOLS / 'kokoro-v1.0.onnx').exists()):
        log('Kokoro not installed: music only, no narration')
        return {}, {}
    cache = TOOLS / 'tts-cache' / f'{VOICE}-{SPEED}'
    cache.mkdir(parents=True, exist_ok=True)
    files, todo = {}, {}
    for key, text in NARRATION.items():
        h = hashlib.sha1(text.encode()).hexdigest()[:12]
        files[key] = cache / f'{h}.wav'
        if not files[key].exists():
            todo[h] = text
    if todo:
        log(f'speaking {len(todo)} line(s) with Kokoro ({VOICE})')
        lines = cache / 'todo.json'
        lines.write_text(json.dumps(todo), encoding='utf-8')
        subprocess.run([str(py), str(MEDIA / 'tts_kokoro.py'), str(lines), str(cache), VOICE, str(SPEED)],
                       check=True, env=dict(os.environ, NC_MEDIA_TOOLS=str(TOOLS)), stdout=subprocess.DEVNULL)
        lines.unlink()
    return files, {k: probe_len(p) for k, p in files.items()}


def hold(key, lengths, minimum=3.0):
    return max(minimum, lengths.get(key, 0) + 0.7)


# ---------------------------------------------------------------- nested tour

def prepare_nested(work: Path, lengths: dict) -> dict:
    subprocess.run([str(REPO / 'tools' / 'build.sh')], check=True, stdout=subprocess.DEVNULL)
    zip_path = REPO / 'dist' / f"{UUID}.v{meta()['version']}.shell-extension.zip"
    ext = work / 'data' / 'gnome-shell' / 'extensions'
    (ext / UUID).mkdir(parents=True)
    subprocess.run(['unzip', '-q', str(zip_path), '-d', str(ext / UUID)], check=True)
    subprocess.run(['glib-compile-schemas', str(ext / UUID / 'schemas')], check=True)
    show = ext / 'numeric-clock-showcase@local'
    show.mkdir()
    shutil.copy2(MEDIA / 'showcase' / 'extension.js', show / 'extension.js')
    major = subprocess.run(['gnome-shell', '--version'], capture_output=True, text=True).stdout.split()[2].split('.')[0]
    (show / 'metadata.json').write_text(json.dumps({'uuid': 'numeric-clock-showcase@local', 'name': 'showcase',
                                                    'description': 'test only', 'shell-version': [major]}))
    (work / 'config').mkdir()
    (work / 'run.sh').write_text(f'''set -e
gsettings set org.gnome.shell disable-user-extensions false
gsettings set org.gnome.shell enabled-extensions "['{UUID}','numeric-clock-showcase@local']"
gsettings set org.gnome.desktop.interface clock-show-seconds false
sleep 1
[ -s "$XDG_CONFIG_HOME/dconf/user" ] || {{ echo "ISOLATION FAILED"; exit 1; }}
MUTTER_DEBUG_DUMMY_MODE_SPECS={CLIENT[0]}x{CLIENT[1]} timeout 300 gnome-shell --nested --wayland || true
''')
    return dict(os.environ, XDG_DATA_HOME=str(work / 'data'), XDG_CONFIG_HOME=str(work / 'config'),
                NC_SHOW_DURATIONS=json.dumps(lengths))


def find_stage(timeout=60):
    """Screen rectangle of the nested Shell's stage (its client window, no frame)."""
    end = time.time() + timeout
    while time.time() < end:
        tree = subprocess.run(['xwininfo', '-root', '-tree'], capture_output=True, text=True).stdout
        for line in tree.splitlines():
            m = re.search(r'\s(\d+)x(\d+)\+-?\d+\+-?\d+\s+\+(-?\d+)\+(-?\d+)\s*$', line)
            if m and (int(m.group(1)), int(m.group(2))) == CLIENT:
                x, y = int(m.group(3)), int(m.group(4))
                sw, sh = (int(n) for n in subprocess.run(['xdotool', 'getdisplaygeometry'], capture_output=True,
                                                         text=True, check=True).stdout.split())
                if x >= 0 and y >= 0 and x + CLIENT[0] <= sw and y + CLIENT[1] <= sh:
                    return x, y
        time.sleep(0.4)
    raise RuntimeError('nested window not found fully on screen')


def record_tour(work: Path, env: dict, raw: Path):
    logf = work / 'log.txt'
    proc = subprocess.Popen(['dbus-run-session', '--', 'bash', str(work / 'run.sh')], env=env,
                            stdout=open(logf, 'w'), stderr=subprocess.STDOUT, start_new_session=True)
    rec = None
    try:
        x, y = find_stage()
        log(f'recording the nested stage {CLIENT[0]}x{CLIENT[1]} at {x},{y} — keep that window uncovered')
        rec = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'x11grab', '-draw_mouse', '0',
                                '-framerate', str(FPS), '-video_size', f'{CLIENT[0]}x{CLIENT[1]}',
                                '-i', f"{os.environ.get('DISPLAY', ':0')}+{x},{y}",
                                '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '12', '-pix_fmt', 'yuv420p',
                                str(raw)], stdin=subprocess.PIPE)
        rec_start = time.time() * 1e6
        while proc.poll() is None:
            text = logf.read_text(errors='replace')
            if 'NCSHOW DONE' in text or 'NCSHOW FAIL' in text or 'ISOLATION FAILED' in text:
                break
            time.sleep(0.5)
        time.sleep(0.5)
    finally:
        if rec and rec.poll() is None:
            rec.communicate(b'q', timeout=30)
        try:
            os.killpg(proc.pid, signal.SIGTERM)
            proc.wait(timeout=15)
        except (ProcessLookupError, subprocess.TimeoutExpired):
            with __import__('contextlib').suppress(ProcessLookupError):
                os.killpg(proc.pid, signal.SIGKILL)
        # A killed nested shell can leave GNOME's crash guard behind; it would
        # disable every extension at your next real login.
        guard = Path(f'/run/user/{os.getuid()}/gnome-shell-disable-extensions')
        if guard.exists() and guard.stat().st_mtime > time.time() - 900:
            guard.unlink()
    text = logf.read_text(errors='replace')
    if 'NCSHOW DONE' not in text:
        raise RuntimeError(f'tour did not finish; see {logf}')
    scenes = [json.loads(line.split('SCENE', 1)[1]) for line in text.splitlines() if 'NCSHOW SCENE' in line]
    return [{'key': s['key'], 't': (s['t'] - rec_start) / 1e6} for s in scenes]


# --------------------------------------------------------------- preferences

def render_prefs(work: Path) -> dict:
    ext = work / 'prefs-ext'
    ext.mkdir()
    for name in ('metadata.json', 'presets.js'):
        shutil.copy2(REPO / 'src' / name, ext / name)
    shutil.copytree(REPO / 'src' / 'schemas', ext / 'schemas')
    subprocess.run(['glib-compile-schemas', str(ext / 'schemas')], check=True)
    for name in ('shim.js', 'prefs_render.js'):
        shutil.copy2(MEDIA / 'showcase' / name, ext / name)
    src = (REPO / 'src' / 'prefs.js').read_text()
    (ext / 'prefs.js').write_text(src.replace('resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js',
                                              './shim.js'))
    out = work / 'prefs-out'
    out.mkdir()
    (work / 'empty-config').mkdir()
    # An empty config dir keeps your own GTK colour overrides out of the render.
    env = dict(os.environ, XDG_CONFIG_HOME=str(work / 'empty-config'), GSETTINGS_BACKEND='memory')
    for attempt in range(3):
        with open(work / 'prefs-render.log', 'w') as logf:
            try:
                subprocess.run(['gjs', '-m', str(ext / 'prefs_render.js'), str(out)], timeout=60, env=env,
                               stdout=logf, stderr=subprocess.STDOUT)
            except subprocess.TimeoutExpired:
                pass
        if (out / 'settings.json').exists() and (out / 'about.json').exists():
            break
        log(f'Preferences render attempt {attempt + 1} failed; see {work / "prefs-render.log"}')
    else:
        raise RuntimeError('Preferences could not be rendered')
    pages = {}
    for page in ('settings', 'about'):
        m = json.loads((out / f'{page}.json').read_text())
        imgs = [Image.open(out / f'{page}-{i}.png').convert('RGBA') for i in range(len(m['offsets']))]
        sc = imgs[0].width / 600
        top, h = round(m['top'] * sc), round(m['height'] * sc)
        tall = Image.new('RGBA', (imgs[0].width, round(m['offsets'][-1] * sc) + h))
        for im, off in zip(imgs, m['offsets']):
            tall.paste(im.crop((0, top, im.width, top + h)), (0, round(off * sc)))
        tall.save(work / f'{page}-content.png')
        imgs[0].crop((0, 0, imgs[0].width, top)).save(work / f'{page}-header.png')
        pages[page] = {'content': work / f'{page}-content.png', 'header': work / f'{page}-header.png',
                       'height': tall.height, 'view': h}
    return pages


def backdrop(work: Path, frame: Path | None) -> Path:
    """Blurred, darkened frame of the tour (or a plain colour) behind the window."""
    path = work / 'backdrop.png'
    if frame and frame.exists():
        im = Image.open(frame).convert('RGB').resize((OUT_W, OUT_H)).filter(ImageFilter.GaussianBlur(28))
        im = Image.blend(im, Image.new('RGB', im.size, BG), 0.45)
    else:
        im = Image.new('RGB', (OUT_W, OUT_H), BG)
    im.save(path)
    return path


def window_frame(work: Path, page: dict, view_h: int, scale: float) -> tuple[Path, int, int, int, int]:
    """Rounded mask + shadow for the prefs window; returns (shadow png, x, y, w, h)."""
    w = round(Image.open(page['header']).width * scale)
    hh = round(Image.open(page['header']).height * scale)
    h = hh + round(view_h * scale)
    x, y = (OUT_W - w) // 2, (OUT_H - h) // 2 - 30
    shadow = Image.new('RGBA', (OUT_W, OUT_H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((x, y + 10, x + w, y + h + 10), 18, fill=(0, 0, 0, 150))
    shadow = shadow.filter(ImageFilter.GaussianBlur(22))
    path = work / f'shadow-{w}x{h}.png'
    shadow.save(path)
    return path, x, y, w, h


def pan_clip(work: Path, name: str, page: dict, y0: int, y1: int, seconds: float, bg: Path, caption: str | None):
    """Prefs window over the backdrop, scrolling its content from y0 to y1 (px of the tall image)."""
    view = min(page['view'], page['height'], 1150)
    scale = 960 / (Image.open(page['header']).height + view)
    shadow, x, y, w, h = window_frame(work, page, view, scale)
    hh = round(Image.open(page['header']).height * scale)
    y1 = max(0, min(y1, page['height'] - view))
    y0 = max(0, min(y0, y1))
    lead, tail = 0.6, 0.6
    span = max(0.1, seconds - lead - tail)
    # smoothstep(0..1) of the time between lead and seconds - tail
    p = f'clip((t-{lead})/{span:.3f},0,1)'
    yexpr = f'{y0}+({y1 - y0})*({p})*({p})*(3-2*({p}))'
    cw = Image.open(page['header']).width
    out = work / f'{name}.mp4'
    fc = [f'[2:v]crop={cw}:{view}:0:\'{yexpr}\',scale={w}:{h - hh}:flags=lanczos[body]',
          f'[3:v]scale={w}:{hh}:flags=lanczos[head]',
          '[0:v][1:v]overlay=0:0[b0]',
          f'[b0][body]overlay={x}:{y + hh}[b1]',
          f'[b1][head]overlay={x}:{y}[b2]']
    last = 'b2'
    if caption:
        fc.append(caption_filter(work, name, last, caption, 0, seconds))
        last = 'cap'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-loop', '1', '-framerate', str(FPS), '-i', str(bg),
                    '-loop', '1', '-framerate', str(FPS), '-i', str(shadow),
                    '-loop', '1', '-framerate', str(FPS), '-i', str(page['content']),
                    '-loop', '1', '-framerate', str(FPS), '-i', str(page['header']),
                    '-filter_complex', ';'.join(fc), '-map', f'[{last}]', '-t', f'{seconds:.3f}',
                    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', str(FPS),
                    str(out)], check=True)
    return out


# -------------------------------------------------------------------- render

def caption_filter(work: Path, name: str, src: str, text: str, start: float, end: float, out='cap', size=38):
    tf = work / f'cap-{name}-{start:.2f}.txt'
    tf.write_text(text, encoding='utf-8')
    return (f"[{src}]drawtext=fontfile={FONT}:textfile={tf}:fontsize={size}:fontcolor=white:"
            f"box=1:boxcolor=black@0.62:boxborderw=18:x=(w-text_w)/2:y=h-text_h-56:"
            f"enable='between(t,{start:.2f},{end:.2f})'[{out}]")


# Where the "camera" looks in each scene of the 1600x900 tour: (x, y, w, h), 16:9.
# None shows the whole desktop. Cuts happen at scene changes.
CAMERA = {
    'title': None,
    'clock': (400, 0, 800, 450),
    'tooltip': (400, 0, 1200, 675),
    'menu': (400, 0, 1200, 675),
    'presets': (400, 0, 1200, 675),
    'styles': (400, 0, 1200, 675),
    'copy': (200, 0, 1200, 675),
    'clockmenu': (200, 0, 1200, 675),
    'prefs': None,
}


def tour_clip(work: Path, raw: Path, scenes: list, title: str) -> tuple[Path, float]:
    """The recorded tour from the title scene on, one camera framing per scene, with captions."""
    t0 = next(s['t'] for s in scenes if s['key'] == 'title') - 0.2
    t_end = next(s['t'] for s in scenes if s['key'] == 'nested-end')
    keys = [s for s in scenes if s['key'] != 'nested-end']
    parts = []
    for i, sc in enumerate(keys):
        start = (t0 if i == 0 else sc['t'])
        stop = keys[i + 1]['t'] if i + 1 < len(keys) else t_end
        cam = CAMERA.get(sc['key'])
        vf = f'crop={cam[2]}:{cam[3]}:{cam[0]}:{cam[1]},' if cam else ''
        fc = [f'[0:v]{vf}scale={OUT_W}:{OUT_H}:flags=lanczos,setsar=1[v0]']
        text = title if sc['key'] == 'title' else CAPTIONS.get(sc['key'])
        last = 'v0'
        if text:
            fc.append(caption_filter(work, sc['key'], last, text, 0, stop - start - 0.15, 'c',
                                     size=46 if sc['key'] == 'title' else 38))
            last = 'c'
        seg = work / f'tour-{i:02d}.mp4'
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{start:.3f}', '-i', str(raw),
                        '-t', f'{stop - start:.3f}', '-filter_complex', ';'.join(fc), '-map', f'[{last}]',
                        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14', '-pix_fmt', 'yuv420p',
                        '-r', str(FPS), str(seg)], check=True)
        parts.append(seg)
    out = work / 'tour.mp4'
    concat(parts, out)
    return out, t0


def end_card(work: Path, seconds: float, bg: Path) -> Path:
    """Collage plus the repository address."""
    card = Image.open(bg).convert('RGB')
    collage = Image.open(REPO / 'screenshots' / 'collage.jpg').convert('RGB')
    collage.thumbnail((1500, 760), Image.Resampling.LANCZOS)
    card.paste(collage, ((OUT_W - collage.width) // 2, 70))
    path = work / 'end.png'
    card.save(path)
    lines = work / 'end.txt'
    lines.write_text('Free and open source · github.com/nickotmazgin/Linux-Numeric-Date-And-Clock',
                     encoding='utf-8')
    out = work / 'end.mp4'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-loop', '1', '-framerate', str(FPS), '-i', str(path),
                    '-vf', f"drawtext=fontfile={FONT}:textfile={lines}:fontsize=40:fontcolor=white:box=1:"
                           "boxcolor=black@0.62:boxborderw=18:x=(w-text_w)/2:y=h-text_h-70,"
                           f"fade=t=in:st=0:d=0.5,fade=t=out:st={seconds - 1:.2f}:d=1",
                    '-t', f'{seconds:.3f}', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16',
                    '-pix_fmt', 'yuv420p', '-r', str(FPS), str(out)], check=True)
    return out


def concat(parts: list[Path], dest: Path):
    inputs = []
    for p in parts:
        inputs += ['-i', str(p)]
    fc = ''.join(f'[{i}:v]' for i in range(len(parts))) + f'concat=n={len(parts)}:v=1:a=0[v]'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex', fc, '-map', '[v]',
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
                    '-movflags', '+faststart', '-r', str(FPS), str(dest)], check=True)


def mix_audio(silent: Path, events: list, dest: Path, work: Path):
    """Narration over the original music bed, ducked under speech, at -14 LUFS."""
    length = probe_len(silent)
    music = work / 'music.wav'
    subprocess.run([sys.executable, str(MEDIA / 'make_music.py'), str(music), f'{length:.2f}', '17'],
                   check=True, stdout=subprocess.DEVNULL)
    inputs = ['-i', str(silent), '-i', str(music)]
    chains = [f'[1:a]volume={MUSIC_GAIN}[bed]']
    voices = []
    for i, (start, wav) in enumerate(events):
        inputs += ['-i', str(wav)]
        ms = int(start * 1000)
        chains.append(f'[{i + 2}:a]aresample=44100,aformat=channel_layouts=stereo,adelay={ms}|{ms}[v{i}]')
        voices.append(f'[v{i}]')
    if voices:
        chains.append(f"{''.join(voices)}amix=inputs={len(voices)}:normalize=0,asplit=2[vo][sc]")
        chains.append('[bed][sc]sidechaincompress=threshold=0.015:ratio=8:attack=20:release=450[duck]')
        chains.append('[duck][vo]amix=inputs=2:normalize=0[a]')
    else:
        chains.append('[bed]volume=3[a]')
    mixed = work / 'mix.wav'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex', ';'.join(chains),
                    '-map', '[a]', '-t', f'{length:.2f}', str(mixed)], check=True)
    target = 'I=-14:TP=-1.5:LRA=11'
    probe = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(mixed), '-af', f'loudnorm={target}:print_format=json',
                            '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = json.loads(probe[probe.rindex('{'):probe.rindex('}') + 1])
    norm = (f"loudnorm={target}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
            f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:"
            f"offset={m['target_offset']}:linear=true,aresample=48000")
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(silent), '-i', str(mixed), '-af', norm,
                    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest',
                    '-movflags', '+faststart', str(dest)], check=True)


# ---------------------------------------------------------------------- main

def main():
    files, lengths = speak()
    dest = REPO / 'dist' / 'media' / f'numeric-clock-v{version()}-demo.mp4'
    title = f'Numeric Clock {version()} — GNOME Shell {shell_range()}'
    work = Path(tempfile.mkdtemp(prefix='numeric-clock-demo-'))
    try:
        log('rendering Preferences off-screen')
        pages = render_prefs(work)
        raw = work / 'raw.mp4'
        log('recording the tour in a nested GNOME Shell (your desktop is not used)')
        scenes = record_tour(work, prepare_nested(work, lengths), raw)
        tour, t0 = tour_clip(work, raw, scenes, title)
        events = [(s['t'] - t0, files[s['key']]) for s in scenes if s['key'] in files]
        frame = work / 'frame.png'
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', '2', '-i', str(tour), '-frames:v', '1',
                        str(frame)], check=True)
        bg = backdrop(work, frame)
        cursor = probe_len(tour)
        parts = [tour]
        s_page, a_page = pages['settings'], pages['about']
        sh = s_page['height']
        # Format codes → behavior/appearance/clicks → presets → about
        plan = [('format', s_page, 0, int(sh * 0.20)), ('behavior', s_page, int(sh * 0.30), int(sh * 0.58)),
                ('presets_tab', s_page, int(sh * 0.62), sh), ('about', a_page, 0, a_page['height'])]
        for key, page, y0, y1 in plan:
            secs = hold(key, lengths, 4.0)
            parts.append(pan_clip(work, key, page, y0, y1, secs, bg, CAPTIONS.get(key)))
            if key in files:
                events.append((cursor + 0.3, files[key]))
            cursor += probe_len(parts[-1])
        end_secs = hold('end', lengths, 5.0) + 1.0
        parts.append(end_card(work, end_secs, bg))
        if 'end' in files:
            events.append((cursor + 0.4, files['end']))
        silent = work / 'silent.mp4'
        log('encoding')
        concat(parts, silent)
        dest.parent.mkdir(parents=True, exist_ok=True)
        mix_audio(silent, events, dest, work)
        log(f'video -> {dest.relative_to(REPO)} ({probe_len(dest):.1f}s)')
    except BaseException:
        log(f'kept {work} for debugging')
        raise
    shutil.rmtree(work, ignore_errors=True)


if __name__ == '__main__':
    main()
