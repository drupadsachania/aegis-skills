# Logo assets

Inventory of the Aegis and Themis logos, where each file is used, and how the raster files were made. Usage rules (clear space, minimum sizes, dark-theme plate, do-not list) are in `DESIGN.md` section 2.1; colour mapping is in section 2.2.

## Important limitation: no vector masters of the full artwork

The full Aegis (shield with Gorgon head) and Themis (scales) artwork exists only as raster images supplied by the owner. **Vector masters of that artwork do not exist yet.** The two SVG files in `apps/web/public/brand/` are *simplified* icons drawn for small sizes (up to about 64 px); they are not a tracing of the artwork and look different from it. A designer should vectorise the full artwork (SVG, with a one-colour and a reversed version) before any print, signage, merchandise or large-format use. Until then do not enlarge the WebP files beyond roughly 2x their listed width.

## How the raster logos were derived

1. The owner's artwork was supplied as images on a light background.
2. The background was keyed out to transparency (done before this repository received the files) to give four transparent PNG masters, drawn for **light** backgrounds: `aegis-mark`, `aegis-lockup` (mark plus AEGIS wordmark), `themis-mark`, `themis-lockup`. They are kept at full resolution (about 760 x 670-780 px, 166-334 KB) in `design/brand/source/`, together with the two original gradient "tile" images (`aegis-tile.webp`, `themis-tile.webp`).
3. The web files were produced from those masters with Pillow (Lanczos resize, WebP quality 70, alpha quality 70). Keyed artwork can carry faint edge fringes that show on dark backgrounds; together with the dark brown ink, that is why the dark theme uses a cream plate.
4. The simplified SVG icons (`aegis-icon.svg`, `themis-icon.svg`) are no longer used on the website. They remain for the Themis dashboard (`@brand` alias) and the ChatGPT plugin logo. The site's small icons are now the 96 px WebP marks below.
4a. **Dark artwork (2026-10-13).** The owner supplied dark-theme artwork: silver and gold Aegis on navy, glowing blue Themis on black (`design/brand/source/*-lockup-dark.webp`, opaque). `scripts/make-brand-dark.py` keys the background to transparency (Themis: alpha is the brightest channel; Aegis: the dark region connected to the border) and writes the `*-dark-*` files, the 96 px icons and the favicon set. Re-run it from those masters; never from the WebP outputs.
5. (Superseded, see the inventory.) The old `favicon.svg` and `favicon.ico` were a simplified Aegis shield (a thick ink outline, a gold inner outline and a diamond, on a cream rounded plate) drawn for 16-32 px, because the thin strokes of `aegis-icon.svg` do not survive at that size. `apple-touch-icon.png` is the Aegis mark on a cream plate. `og.png` is built from the two lockups plus a line of Georgia text rendered as pixels (the font is not shipped).

## Inventory

All paths are under `apps/web/public/` unless noted. Sizes are the committed file sizes.

| File | Pixels | Size | Use |
|---|---|---|---|
| `brand/{aegis,themis}-icon-96.webp` | 96 x 96 | 2-3 KB | Header, footer and eyebrows, light theme. Shown at 20-34 px. |
| `brand/{aegis,themis}-icon-dark-96.webp` | 96 x 96 | 3-4 KB | Same places, dark theme. |
| `brand/{aegis,themis}-mark-dark-{320,640}.webp` | 320 / 640 wide | 30-110 KB | Home cards, dark theme. |
| `brand/{aegis,themis}-lockup-dark-640.webp` | 640 wide | 85-115 KB | `/themis` hero, dark theme. |
| `brand/aegis-icon.svg`, `brand/themis-icon.svg` | 512 viewBox | 1-2 KB | Not used on the website any more. Kept for the Themis dashboard and the ChatGPT plugin logo. |
| `brand/aegis-mark-320.webp` | 320 x 278 | 21 KB | Home Aegis card (1x of the srcset). |
| `brand/aegis-mark-640.webp` | 640 x 555 | 55 KB | 2x of the srcset; use for any mark wider than 160 px. |
| `brand/aegis-lockup-640.webp` | 640 x 652 | 60 KB | Mark plus AEGIS wordmark; docs, social, partner pages. |
| `brand/themis-mark-320.webp` | 320 x 280 | 11 KB | Home Themis card. |
| `brand/themis-mark-640.webp` | 640 x 560 | 28 KB | 2x of the srcset. |
| `brand/themis-lockup-640.webp` | 640 x 657 | 32 KB | `/themis` hero; mark plus THEMIS wordmark. |
| `favicon.ico`, `favicon-32.png`, `icon-192.png`, `icon-512.png` | 16/32/48, 32, 192, 512 | 1-60 KB | Browser tab and app icons: the dark Aegis mark on a navy rounded tile, so it reads in light and dark tabs. Below about 32 px the face is not legible; the shield outline carries it. |
| `apple-touch-icon.png` | 180 x 180 | 20-40 KB | iOS home screen. Opaque navy tile. |
| `og.png` | 1200 x 630 | 193 KB | Open Graph / Twitter card. Both lockups on cream with the tagline. Crawlers only; visitors never download it. |
| `packages/themis-app/ui/public/favicon.svg` | 512 viewBox | 1.5 KB | Dashboard tab icon: the Themis icon on a cream plate. |
| `design/brand/source/*.png`, `*.webp` | about 760-890 px | 51-334 KB | Masters and originals. Not served. Re-run the optimisation from these, never from the WebP files. |

Before optimisation the site would have shipped four PNGs of 166-334 KB (about 1.0 MB for the four) plus two 52-72 KB tiles; it now ships at most two marks and one lockup per page (roughly 25-120 KB depending on the page).

## Regenerating

The optimised files are committed. To regenerate them, resize the masters in `design/brand/source/` to 640 and 320 px wide (marks) and 640 px wide (lockups) and save as WebP, quality about 70 with alpha quality about 70, then keep each file under 120 KB (checked by `apps/web/tests/pages/brand-images.test.js`).

## Where they are wired

- `apps/web/components/Brand.js`: `BrandIcon`, `BrandIcons` (96 px WebP marks) and `Logo` (raster, explicit size, lazy or eager). Each renders a light and a dark image; CSS shows the one for the theme (`.theme-light-only`, `.theme-dark-only`). The dark image is lazy, so the first switch to dark shows a short pop-in.
- `apps/web/pages/_document.js`: favicon and touch-icon links. `apps/web/components/Layout.js`: Open Graph and Twitter tags.
- `apps/web/styles/globals.css`: `.brand-icon`, `.logo-plate` (layout only; the dark theme no longer uses a cream plate), `.twin-logo`, `.page-head-logo`.
- `packages/themis-app/ui`: the `@brand` alias in `vite.config.mts` points at `apps/web/public/brand`.
