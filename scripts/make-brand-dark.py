"""Derive the dark-theme brand files and the favicon set from the owner's dark artwork.

  python scripts/make-brand-dark.py

Reads  design/brand/source/{aegis,themis}-lockup-dark.webp   (opaque artwork on black / navy)
       design/brand/source/{aegis,themis}-mark.png            (transparent light-theme masters)
Writes apps/web/public/brand/*-dark-*.webp, *-icon-*.webp and the favicon set in apps/web/public/.

The dark artwork has no alpha channel. Themis sits on pure black, so its alpha is the brightest channel
(a glow fades out instead of ending in a black halo). Aegis sits on a navy gradient, so the background is
the dark region connected to the image border; enclosed dark areas (shadows in the face) stay opaque.
"""
import os
import numpy as np
from collections import deque
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'design', 'brand', 'source')
BRAND = os.path.join(ROOT, 'apps', 'web', 'public', 'brand')
PUBLIC = os.path.join(ROOT, 'apps', 'web', 'public')
WEBP = dict(format='WEBP', quality=72, alpha_quality=80, method=6)


def smoothstep(x, a, b):
    t = np.clip((x - a) / float(b - a), 0, 1)
    return t * t * (3 - 2 * t)


def key_black(rgb):
    """Pure-black background: alpha = brightest channel, colour = channel / brightest channel."""
    c = rgb.astype(np.float32) / 255.0
    raw = c.max(axis=2)
    alpha = np.clip(raw * 1.1, 0, 1)
    colour = np.where(raw[..., None] > 0.004, np.clip(c / np.maximum(raw[..., None], 1e-4), 0, 1), 0)
    return Image.fromarray(np.dstack([colour * 255, alpha * 255]).astype(np.uint8), 'RGBA')


def border_connected(mask):
    """Pixels of `mask` that touch the image border through other `mask` pixels (4-connected flood fill)."""
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if mask[y, x] and not seen[y, x]:
                seen[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if mask[y, x] and not seen[y, x]:
                seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    return seen


def key_navy(rgb):
    """Navy background: transparent where the pixel is dark AND connected to the image border."""
    c = rgb.astype(np.float32)
    mx = c.max(axis=2)
    bg = border_connected(mx < 82)
    alpha = np.where(bg, smoothstep(mx, 50, 82), 1.0)
    soft = Image.fromarray((alpha * 255).astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(0.7))
    return Image.fromarray(np.dstack([c, np.array(soft, dtype=np.float32)]).astype(np.uint8), 'RGBA')


def tight(img, pad=0):
    a = np.array(img)[..., 3]
    ys, xs = np.where(a > 12)
    box = (max(xs.min() - pad, 0), max(ys.min() - pad, 0), min(xs.max() + 1 + pad, img.width), min(ys.max() + 1 + pad, img.height))
    return img.crop(box)


def split_mark_and_word(img):
    """Return (mark, wordmark) by cutting at the widest empty band in the lower half."""
    a = np.array(img)[..., 3] > 12
    rows = a.sum(axis=1)
    h = img.height
    best, y0 = 0, None
    run = 0
    for y in range(int(h * 0.6), int(h * 0.97)):
        if rows[y] == 0:
            run += 1
            if run > best:
                best, y0 = run, y - run + 1
        else:
            run = 0
    cut = y0 + best // 2 if y0 is not None and best > 6 else int(h * 0.82)
    return img.crop((0, 0, img.width, cut)), img.crop((0, cut, img.width, h)), cut


def fit(img, w):
    h = round(img.height * w / img.width)
    return img.resize((w, h), Image.LANCZOS)


def save(img, name, folder=BRAND, limit=115 * 1024):
    """Write a WebP; lower the quality in steps until it is under `limit` (the site guard allows 120 KB)."""
    p = os.path.join(folder, name)
    opts = dict(WEBP)
    while True:
        img.save(p, **opts)
        if os.path.getsize(p) <= limit or opts['quality'] <= 40:
            break
        opts['quality'] -= 6
        opts['alpha_quality'] = max(opts['alpha_quality'] - 6, 40)
    print('wrote', os.path.relpath(p, ROOT), os.path.getsize(p) // 1024, 'KB', img.size, 'q', opts['quality'])


def square(mark, size, pad=0.06):
    s = int(size * (1 - 2 * pad))
    m = mark.copy(); m.thumbnail((s, s), Image.LANCZOS)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.paste(m, ((size - m.width) // 2, (size - m.height) // 2), m)
    return out


def main():
    marks = {}
    for brand, keyer in (('themis', key_black), ('aegis', key_navy)):
        src = Image.open(os.path.join(SRC, f'{brand}-lockup-dark.webp')).convert('RGB')
        keyed = keyer(np.array(src))
        mark, word, cut = split_mark_and_word(keyed)
        mark = tight(mark, 4)
        full = tight(keyed, 4)
        marks[brand] = mark
        save(fit(full, 640), f'{brand}-lockup-dark-640.webp')
        save(fit(mark, 320), f'{brand}-mark-dark-320.webp')
        save(fit(mark, 640), f'{brand}-mark-dark-640.webp')
        # small icons: dark and light, square canvas so they sit like the old SVGs did
        save(square(mark, 96), f'{brand}-icon-dark-96.webp')
        light = Image.open(os.path.join(SRC, f'{brand}-mark.png')).convert('RGBA')
        save(square(tight(light, 2), 96), f'{brand}-icon-96.webp')

    # favicon set: the dark Aegis mark on a navy rounded tile, so it reads in light and dark browser tabs
    def tile(size, radius=0.22):
        t = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        d = ImageDraw.Draw(t)
        d.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * radius), fill=(5, 20, 38, 255))
        m = square(marks['aegis'], size, pad=0.10)
        t.alpha_composite(m)
        return t
    for name, size in (('favicon-32.png', 32), ('icon-192.png', 192), ('icon-512.png', 512)):
        tile(size).save(os.path.join(PUBLIC, name), optimize=True)
    tile(180, 0.0).convert('RGB').save(os.path.join(PUBLIC, 'apple-touch-icon.png'), optimize=True)
    tile(256).save(os.path.join(PUBLIC, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
    print('wrote favicon set')


if __name__ == '__main__':
    main()
