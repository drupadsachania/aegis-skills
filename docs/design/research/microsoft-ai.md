# Research: Microsoft AI (microsoft.ai)

Status: inspiration only. Method: live site in the in-app browser plus the saved copy `D:\Downloads\Home _ Microsoft AI.html` and `index-xB6vPeVl.css` (194 KB; read with grep), 2026-10-11. The live pane was ~539 px wide (mobile layout), so desktop is read from CSS. Note: our current cream look already derives from this site (`#FEF9ED`, `#5D524B`, `#F7ECD9` appear verbatim as its tokens). We keep those neutral colours as common-sense warm paper tones but do NOT use its Bradford LL serif (commercial), its marks, imagery, or copy.

## 1. Palette

`:root` / `web-application`: `--text-color #5d524b`, `--background-color #fef9ed`, `--accent #f7ecd9` (Humanist Review also).

Most-used literals in the CSS (count): `#5d524b` x74, `#fef9ed` x23, `#000` x12, `#f7ecd9` x14, `#a67c52` x13 (tan accent), `#2d2319` x6 (deep brown), `#f5eee0`, `#f7f1e3`, `#fbf4e5`, `#f2ead9`, `#ede5d3`, `#fbf0dc` (card), `#2a1816`.

| Role | Value |
|---|---|
| Page paper | `#fef9ed` |
| Card / button fill | `#f7ecd9`, `#fbf0dc`, `#f7f1e3` |
| Text | `#5d524b` (warm taupe; 7.2:1 on paper), deep `#2d2319` |
| Accent (tan) | `#a67c52` |
| Hero | full-bleed warm peach/coral photographic gradient behind white serif |
| Tailwind palette leftovers | amber/red/lime oklch ramps (`--color-amber-400 oklch(82.8% .189 84.429)`) |

Section rhythm: coral hero -> paper `#fef9ed` long body -> illustrated city "locations" block -> paper. Section background change animates: `web-application { transition: background-color 1.1s cubic-bezier(.43,.195,.02,1) }` (the page tints as you scroll between blocks).

## 2. Typography

| Role | Family | Open alt | Values |
|---|---|---|---|
| Display / body serif | Bradford LL 450 (also 600) | Newsreader, Source Serif 4, EB Garamond | H1 67 px at 539 px viewport: lh 77 px (1.15), tracking -0.03em (-2.01 px); italic first line "Humanist" |
| `.text-large` | Bradford | same | 30 px lh 1.2, -0.01em (mobile 18 px lh 1.167) |
| `.text-body` | Bradford 450 | same | 24 px lh 1.25 -0.01em (mobile 18 px / 1.33 / -0.02em) |
| UI / buttons | Red Hat Mono 500 | Red Hat Mono (open, SIL OFL) | 16 px lh 1 (mobile 12 px); `max(10px, 16*unit)` |
| Caption | Red Hat Mono 400 | same | 16 px tracking +0.05em lh 1.4 (mobile 12 px) |
| Headline (mono) | Red Hat Mono 400 | same | 15 px tracking +0.1em (mobile 0, 12 px) |
| Metanav title | Red Hat Mono 500 | same | `max(12px, 15*unit)` lh 1; description 13 px lh 1.6 |

Sizing system: `--unit-fx = 100vw / 1728`; every size is `calc(N * var(--unit-fx-type))`, i.e. proportional to a 1728 px design; `max()` floors keep minimums (10-12 px). Vertical rhythm 11 px (`--vertical-rhythm`). Pattern: **serif for voice, mono for machinery**.

## 3. Layout

- 1728 px reference grid: `--col calc(112*unit)`, `--gutter calc(26*unit)`, 24-col variant `--col24 50 / --gutter24 20`. `--max-width: 1728`.
- Hero: full-viewport (`100svh`) photographic gradient with centered 2-line serif H1 and a subline; a floating cream "pill" header card sits over it (cream `#fef9ed`, radius ~6 px at mobile, logo "MAI" left, 2-line hamburger right).
- Cards: flat `#fbf0dc` rows, radius 0, padded `6fx / 18fx`; arrow-in-circle affordance.
- Sticky sections (`.sticky`) for scroll-pinned narrative blocks; a `block-locations` with `mb-[150vh]` for scroll-driven map/illustration choreography (unverified detail).
- Illustrations: warm hand-composed city scenes (illustration style: cropped, warm, paper-cut). We must not reuse; we may copy the idea (one signature illustration style).

## 4. Navigation

- Global header is `position: fixed`, transparent, height ~93 px; inside it a cream card with logo + burger.
- Burger animation is bespoke keyframes: two lines scaleX in (`burger_line1_start`), slide out `translate(115%) scaleX(.15)` (`burger_line1_end`), close state rotates lines +-45 deg (`burger_close_line1/2`, 50% keyframe at translateY(0) rotate(45deg)).
- Active/hover underline: `.anim--underline::before` scaleX with `transform-origin` flip (see Humanist) at 250 ms.
- Above the page is Microsoft's own UHF header/footer (not part of the design language; ignore).

## 5. Interactions and transitions (focus)

Easing tokens (all `--alias-*`): `easeOut cubic-bezier(.43,.195,.02,1)`, `easeIn (.98,0,.57,0)`, `easeOutQuint (.23,1,.32,1)`, `easeOut2 (.9,.1,.15,1.05)` (slight overshoot), `easeOut3 (.63,.195,.01,1)`, `easeOutSnap (.835,.085,.005,1)`, `easeOutUnspun (.745,.065,.17,1)`, `easeOutCubic (.215,.61,.355,1)`.

| Pattern | Trigger | Duration | Easing | Technique |
|---|---|---|---|---|
| Split-text line reveal | `.in-view` on block | 1.3 s, delay `line-index*70ms + --delay*1s` | easeOut | custom element `<split-text by="lines">` wraps each line in `.line-wrapper{clip-path:inset(-.25em 0)}` + `.line{opacity:0; transform:translateY(100%)}`; `.ready.in-view` transitions to `opacity:1; translateY(0)`. `.is-resizing` disables transitions during re-split |
| Split by words | same | 1.3 s, delay `word-index*50ms + delay` | easeOut | `[data-word] > span` |
| Split by letters | same | 1.3 s, delay `letter-index*30ms + line-index*.15s` | easeOut | `[data-letter]` |
| List marker colour | in-view | 1.3 s, delay line-index*70ms | easeOut | `li::marker{color}` fades in with the text |
| Fade-in | in-view | `--animation-duration`, `--animation-delay` (JS/inline) | easeOut | `.in-view .fade-in{opacity:1; transition: all ...}` |
| Scale-in / fade-in-and-scale-out | in-view | 2.3 s | easeOut | scale 1.x -> 1 on media |
| Scale-out-and-slide-up | in-view | 2.3 s | easeOutSlow | image mask-like reveal |
| Blur focus | in-view | 1.8 s | easeOut | `.blur-focus` filter blur -> 0 |
| Primary button | hover | 600 ms | easeOutCubic | pill `border-radius:2em`, height 3 em, padding 1em 3em; `::before` (back square) and `::after` (arrow mask) sit at `left:100%` as a detached 3 em square beside the pill; on hover fg/bg colours swap (`--button-front-color` <-> `--button-back-color`) and the square's radius goes `3px` -> `100%` (becomes a circle) |
| Secondary button | hover | 600 ms | easeOutCubic | 1 px outline pill, height 3.5 em |
| Section background tint | scroll | 1.1 s | easeOut | `transition: background-color` on app root while blocks flip a data attribute/var |
| Language-search check | select | 450 ms | `cubic-bezier(.34,1.56,.64,1)` (spring) | transform scale + `stroke-dashoffset .35s .15s` draw-on checkmark |
| Underline start/end | hover | 1.8 s in (hero links) | easeOut | `@keyframes scaleXIn/scaleXOut`, `.is-active` toggles |
| Fade (slides) | active | 2 s | easeOut | `fadein/fadeout` keyframes |
| Spinner | loading | n/a | linear | `animate-spin` |

Reduced motion: only `.languages-search__check` and a `motion-reduce:transition-none` utility are handled. The split-text reveal is **not** disabled (content starts `opacity:0` until JS marks `.ready`) - a weakness. Scroll: `scroll-behavior: smooth` with `auto !important` overrides inside certain contexts.

JS technique: IntersectionObserver (or equivalent) toggles `.in-view` on block elements; a `split-text` web component measures lines and assigns CSS variables `--line-index`, `--word-index`, `--letter-index`; delays are pure CSS `calc()` from those variables. Custom elements (`<block-home>`, `<app-header>`, `<core-tabs>`) per section.

## 6. Micro-details

- Eyebrow = mono, tracked, uppercase captions; headings = serif sentence case; italic for emphasis ("Humanist" in italic in the H1).
- Pill with detached arrow-square CTA - memorable, owned shape.
- Warm photographic gradient hero with white serif text over it (needs a contrast overlay - unverified whether present).
- Hairline-free; separation comes from flat tint changes between sections.
- Tiny floating card header over hero.

## 7. What to borrow

- Pill CTA with detached arrow square that morphs to a circle (600 ms easeOutCubic) - reimplement in our own geometry (we will keep the arrow-after-label idea, not the exact construction).
- Per-line clip-path reveal with 70 ms stagger, but at 700-800 ms, not 1.3 s.
- CSS variable index technique (`--line-index`) for stagger without JS timers.
- Serif voice + mono machinery, the cream floating header card, section-tint transitions, draw-on checkmark.
- `max(12px, N*unit)` floors on fluid type.

## 8. What NOT to copy

- Bradford LL, logos, illustrations, hero photography, copy, "MAI" mark.
- 2.3 s scale-ins and 1.8 s blurs: too slow for a product UI.
- Hiding content at `opacity:0` without a reduced-motion or no-JS fallback.
- Viewport-proportional type without rem clamps (zoom/reflow failure).
- `easeOut2` overshoot on anything but celebratory moments.
