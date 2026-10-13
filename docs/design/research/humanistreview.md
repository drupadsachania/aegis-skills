# Research: The Humanist Review (humanistreview.ai)

Status: inspiration only. Method as in the other notes (in-app browser at ~539 px pane width, CSS fetched from `/wp-content/themes/wp-base-theme/dist/assets/index-DnjB2Z6h.css` with `fetch`, 2026-10-11). It shares the base theme of microsoft.ai (same `--alias-*` easings, `split-text`, `.in-view` machinery, Bradford LL + Red Hat Mono), so see `microsoft-ai.md` for those; this file records the editorial/magazine specifics. No reuse of imagery, the mark, Bradford LL, or text.

## 1. Palette

`--background-color: var(--Color-Off-White)`, `--text-color: var(--Color-Scheme-1-Text)`, `--accent #f7ecd9`.

| Token | Value | Use |
|---|---|---|
| Off-White | `#faf8f3` | page / header card |
| Body band | `rgb(242 239 232)` = `#f2efe8` | main background (computed on `body`) |
| Cream | `#f7f1ea` | |
| Pink (sand) | `#f1e5d4` | |
| Stone | `#b2a496` | muted line / meta |
| Peach | `#fadbc9` | |
| Warm Pink | `#f4a499` | hero/side bleed (visible as page-edge colour) |
| Dark Purple | `#4d2a33` | arrow hover fill, focus outline, dark accent |
| Black / text | `#1c1718` | headings and body |
| Section tints | `rgb(255 236 231)` (`#ffece7`), `rgb(255 241 210)` (`#fff1d2`), `rgb(210 208 204)` (`#d2d0cc`) | alternating issue sections |
| Card ring | `0 0 0 3px #f2efe8, 0 0 0 5px var(--accent, currentColor)` | hover ring in the article's own accent colour |

Section rhythm: off-white header -> hero essay (white) -> peach `#ffece7` -> butter `#fff1d2` -> grey `#d2d0cc` -> `#f2efe8` long archive. Each issue/article carries its own accent colour (`--accent` per card) - a **per-item accent** idea that maps well to Aegis gold / Themis blue per page.

## 2. Typography

| Role | Family | Open alt | Values (at 539 px pane) |
|---|---|---|---|
| Hero essay H2 | Bradford LL 450 | Newsreader | 28 px / lh 30.8 / -0.02em |
| Card titles | Bradford 450 | Newsreader | h4 24 px / 26.4 / -0.02em; h8 20 px / 22 / -0.02em |
| Footer links | Bradford 400 | same | 18 px / 25.2 / -0.01em |
| Section titles (issue) | Bradford 400 | same | 24 px / 33.6 |
| Labels / bylines | Red Hat Mono 500 | Red Hat Mono | 12 px, tracking +0.19em (2.28 px), UPPERCASE, lh 17.4 |
| Nameplate | Bradford, uppercase, tracked, centred | Newsreader caps | ~22 px |
| Buttons | Red Hat Mono 500 | same | 14 px lh 1 |
| Text scale tokens | `--Text-Sizes-XXL 32 / XL 24 / L 20 / M 16 / S 14 / XS 12 / XXS 10` | | 7-step type ladder |

Negative tracking scales with size: -0.02em (>=20 px), -0.01em (18 px). Serif headlines are tight (lh ~1.1); mono labels are wide (+0.19em). Link style for CTAs: serif italic, underlined ("Read the essay").

## 3. Layout

- Magazine grid: image thumbnail + text row cards (thumbnail ~48 x 64 art left, title/dek/byline right), long vertical archive. Hero is a centred title + mono dek + underlined serif CTA.
- Header: a floating off-white card (search icon left, centred uppercase nameplate, hamburger right), radius small (~8 px), over the coloured page edge.
- Slideshow hero (`block-home-slideshow`) with 48 px circular glass arrows.
- Page 7,647 px long at pane width. Footer columns EXPLORE / LINKS with mono headings (12 px, +0.19em).

## 4. Navigation

- `app-header` is `position: relative` (does not stick), nameplate centred, search at left, burger right. Same burger keyframes as MAI.
- Link hover: `.anim--underline::before` 1 px line, `scaleX(0 -> 1)`, `transform-origin` flips from right (`100% 0`) to left (`0 0`) on hover so the line enters from the left and exits to the right; 250 ms `cubic-bezier(.22,1,.36,1)`.
- Footer headings and links carry `slide-up` classes (reveal on enter).

## 5. Interactions and transitions

| Pattern | Trigger | Duration | Easing | Technique |
|---|---|---|---|---|
| Card hover: ring | hover | 550 ms | `cubic-bezier(.22,1,.36,1)` | `box-shadow: 0 0 0 3px paper, 0 0 0 5px accent` from `0 0 #0000` |
| Card hover: image zoom | hover | 600 ms | `cubic-bezier(.22,1,.36,1)` | `.article-card__zoom img {transform: scale(1.05)}` inside overflow-hidden frame |
| Card hover: title underline | hover | 450 ms | default | `text-decoration: underline transparent -> currentColor`, `text-underline-offset .18em`, thickness 1 px |
| Link underline wipe | hover | 250 ms | `(.22,1,.36,1)` | pseudo-element scaleX with origin flip |
| Slideshow bg shift | slide change | 800 ms | easeOut `(.43,.195,.02,1)` | `transform` on background and `[data-image]` layers; `data-motion=off` kills it |
| "Read now" reveal | slide hover | 400 ms opacity, 500 ms transform | `(.22,1,.36,1)` | `opacity:0; translateY(12px)` -> `1; 0` |
| Arrow button | hover | 300 ms | default | `background/color/opacity/transform`; hover fill `#4d2a33` with `#faf8f3` icon; `backdrop-filter: blur(6px)` on `#ffffff8c` bg; focus ring 2 px `#4d2a33` offset 2 px |
| Share button | hover | 250 ms | default | opacity only |
| Coming-soon label | state | 450 ms | default | opacity |
| Block reveals | in-view | 1.8-2.3 s | easeOut | `.blur-focus`, `.scale-in`, `.fade-in`, `.slide-up` (see MAI) |
| Page-edge colour | hero | n/a | n/a | the page's edge shows the active slide's colour (unverified mechanism) |

Reduced motion: `(prefers-reduced-motion: reduce)` present in the CSS (unverified scope; slideshow exposes `data-motion=off`). `(hover:hover)` gating present.

## 6. Micro-details

- Per-item accent ring (3 px paper gap + 2 px accent) - a "double border" focus/hover that works on any background and doubles as a focus indicator.
- Sentence-case serif headlines + uppercase mono byline = clear author/title hierarchy.
- Glass arrow controls (blur 6 px, 55 % white) -> solid dark on hover.
- Underlined italic serif link as the only CTA style on editorial pages.
- Warm, textural thumbnails (a cut-paper leaf, a pink mark) - an illustration style we can emulate with our own shapes, not their artwork.

## 7. What to borrow

- Double-ring hover/focus (`0 0 0 3px bg, 0 0 0 5px accent`): great for cards in both themes and meets 3:1 focus appearance when the accent is >=3:1.
- Image zoom 1.05 over 600 ms inside clipped frame, ring 550 ms, underline fade 450 ms - one coordinated "card hover" at the same easing `(.22,1,.36,1)`.
- Underline wipe with origin flip (250 ms).
- Serif headline / mono label pairing and the 7-step size ladder.
- Per-item accent colour (Aegis gold vs Themis blue per page or card).
- Section tint alternation to separate content blocks instead of borders.

## 8. What NOT to copy

- Brand name, nameplate, imagery, essay copy, Bradford LL.
- 1.8-2.3 s reveals and blur-in; hover transforms >= 600 ms for utility UI.
- Non-sticky header on long docs pages (we want a persistent nav on docs).
- Tracking +0.19em at 12 px for long labels (reads slowly); cap at +0.12em for ours.
