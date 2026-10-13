"""Regenerate the README images in docs/assets/readme/.

  python scripts/make-readme-assets.py

hero.png   both logos on the site's cream, so the dark wordmarks stay readable in GitHub's dark theme.
aegis-install.gif   a terminal recording of the real `aegis list` / `aegis install` output (captured by the
                    commands below, with the temp-dir path replaced by ~/my-project so no local path leaks).
"""
import os
import re
import subprocess
import sys
import tempfile
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'assets', 'readme')
BRAND = os.path.join(ROOT, 'apps', 'web', 'public', 'brand')
CLI = os.path.join(ROOT, 'packages', 'aegis', 'cli', 'aegis.js')
os.makedirs(OUT, exist_ok=True)

CREAM = (250, 246, 238)
INK = (42, 36, 28)
GOLD = (196, 138, 22)
BLUE = (31, 111, 214)


def font(name, size):
    for p in (r'C:\Windows\Fonts\%s' % name, '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def hero():
    w, h = 1280, 470
    img = Image.new('RGB', (w, h), CREAM)
    d = ImageDraw.Draw(img)
    for name, cx in (('aegis', 330), ('themis', 950)):
        logo = Image.open(os.path.join(BRAND, name + '-lockup-640.webp')).convert('RGBA')
        logo.thumbnail((380, 380))
        img.paste(logo, (cx - logo.width // 2, 20), logo)
    d.line([(w // 2, 70), (w // 2, h - 70)], fill=(222, 214, 198), width=2)
    f = font('segoeui.ttf', 22)
    for text, cx, col in (('24 defensive security skills', 330, GOLD), ('a governed security-operations agent', 950, BLUE)):
        tw = d.textlength(text, font=f)
        d.text((cx - tw / 2, h - 44), text, font=f, fill=col)
    img.save(os.path.join(OUT, 'hero.png'), optimize=True)


def run(args, cwd, env):
    r = subprocess.run([sys.executable and 'node', CLI] + args, cwd=cwd, env=env, capture_output=True, text=True, encoding='utf-8')
    return (r.stdout + r.stderr).strip('\n')


def terminal_gif():
    tmp = tempfile.mkdtemp(prefix='aegis-demo-')
    env = dict(os.environ, AEGIS_HOME=os.path.join(tmp, 'aegis-home'))
    os.makedirs(env['AEGIS_HOME'], exist_ok=True)
    clean = lambda s: re.sub(re.escape(tmp) + r'[^\s]*', lambda m: '~/my-project' + m.group(0)[len(tmp):].replace('\\', '/'), s)
    steps = [
        ('npx aegis-skills install --platform claude --project', clean(run(['install', '--platform', 'claude', '--project'], tmp, env))),
        ('npx aegis-skills list', clean(run(['list'], tmp, env))),
    ]
    skills = sorted(os.listdir(os.path.join(tmp, '.claude', 'skills')))
    steps.append(('ls .claude/skills | head -6', '\n'.join(skills[:6])))

    mono = font('consola.ttf', 20)
    w, h, pad, lh = 960, 420, 24, 28
    frames, durs = [], []

    def frame(lines, cursor=True):
        img = Image.new('RGB', (w, h), (26, 23, 18))
        d = ImageDraw.Draw(img)
        d.rectangle([0, 0, w, 36], fill=(40, 35, 28))
        for i, c in enumerate(((236, 106, 94), (244, 191, 79), (97, 197, 84))):
            d.ellipse([16 + i * 22, 12, 28 + i * 22, 24], fill=c)
        d.text((w // 2 - 60, 8), 'my-project', font=font('segoeui.ttf', 16), fill=(150, 140, 120))
        y = 36 + pad
        for text, col in lines[-11:]:
            if text.startswith('✓'):
                d.text((pad, y), '✓', font=font('seguisym.ttf', 20), fill=col)
                d.text((pad + d.textlength('✓ ', font=mono), y), text[2:], font=mono, fill=col)
            else:
                d.text((pad, y), text, font=mono, fill=col)
            y += lh
        if cursor and lines:
            last = lines[-1][0]
            x = pad + d.textlength(last, font=mono) + 2
            d.rectangle([x, y - lh + 4, x + 10, y - 6], fill=(220, 210, 190))
        return img

    shown = []
    for cmd, out in steps:
        prompt = '$ '
        for i in range(1, len(cmd) + 1, 3):
            frames.append(frame(shown + [(prompt + cmd[:i], (240, 230, 210))]))
            durs.append(40)
        frames.append(frame(shown + [(prompt + cmd, (240, 230, 210))]))
        durs.append(350)
        shown.append((prompt + cmd, (240, 230, 210)))
        for line in out.split('\n'):
            col = (110, 200, 120) if line.startswith('✓') else (190, 180, 160)
            shown.append((line[:92], col))
            frames.append(frame(shown, cursor=False))
            durs.append(140)
        frames.append(frame(shown, cursor=False))
        durs.append(900)
    durs[-1] = 3500
    pal = frames[0].convert('P', palette=Image.ADAPTIVE, colors=64)
    q = [f.quantize(palette=pal, dither=Image.NONE) for f in frames]
    q[0].save(os.path.join(OUT, 'aegis-install.gif'), save_all=True, append_images=q[1:], duration=durs, loop=0, optimize=True)
    return tmp


if __name__ == '__main__':
    hero()
    t = terminal_gif()
    print('wrote', os.listdir(OUT), 'tmp', t)
