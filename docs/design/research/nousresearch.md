# Research: Nous Research (nousresearch.com)

Status: inspiration only. Same method and caveats as `hermes-agent.md` (narrow ~539 px pane for screenshots, CSS read directly, hover read from rules, 2026-10-11). Nous Research and Hermes share one CSS system (identical `--hermes-*`, `--hw-*`, `--nw-*` tokens), so motion tokens are documented once in `hermes-agent.md`; this file records what is specific to the corporate site. No copying of the fox/wing marks, imagery, copy or the Rules / Aeonik fonts.

## 1. Palette

Two themes, switched by `html[data-research-theme="dark"|"light"]`. The page loaded in dark.

| Role | Dark | Light |
|---|---|---|
| Stage / page | `#0d0d24` (`--nw-theme-paper`, `--nw-stage`) | paper `#f2f2f2` / `--nw-theme-white #fafafe` |
| Raised back | `#171738` | n/a (unverified) |
| Text | `#e5e5ee`; headings `#f2f2f2` | ink `#0000f2` / `#000091` |
| Link | `#8080ff` | blue |
| Hairline | `#ffffff1a` | n/a |
| Focus | `#8888ff` | n/a |
| Composer (search) | paper `#252539`, text `#b4b4ca`, line `#3333f5`, key wash `#ffffff0d` | n/a |
| Glitch accents | dark `#080819`, line `#aaaaff40` | n/a |
| Footer block | blue `rgb(0 0 145)` (`#000091`) | n/a |

Hero art is monochrome that fills with colour on hover (see motion). Page height 7,064 px at pane width; sections: sticky nav stage (104 px), mission band (1,690 px), art strip, footer-soften (1,299 px).

## 2. Typography

| Role | Family | Open alt | Values |
|---|---|---|---|
| Hero wordmark | Rules Gothic Compressed, uppercase, giant | Big Shoulders Display | fluid, set by viewport unit (`--nw-u`) |
| Section H3 | Rules Gothic Compressed 400 | Antonio | 40 px / lh 44 px (mobile width) |
| Body | Rules Variable / Aeonik | IBM Plex Sans | 14-15 px / lh 21 px |
| Eyebrow | sans 700 UPPERCASE | IBM Plex Sans 700 | 10 px, tracking 0.036-0.044em, lh 14 px, e.g. "OPEN SOURCE - MIT LICENSE" |
| Article serif (blog) | EB Garamond 400/500 (loaded) | Newsreader, EB Garamond (open) | unverified sizes |

Paragraph colour is a notch below heading colour (`#e5e5ee` vs `#f2f2f2`) - a cheap hierarchy trick.

## 3. Layout

- Full-bleed bands with an inset (`--nw-band-inset`), content blocks built from a custom unit `--nw-u` (viewport-proportional), i.e. type and spacing scale with viewport width instead of breakpoints.
- Hero = enormous uppercase wordmark, then a two-line lede, then a prompt-like "composer" bar acting as search/ask (Cmd+K badge shown). Beneath: three numbered pillars each with a big H3 and a 14 px paragraph.
- A viewport frame border (same `.hw-frame` as Hermes) rings the page.
- Footer: tall blue block, link columns RESEARCH / PRODUCTS / RESOURCES / PLATFORM, "OPEN SOURCE - MIT LICENSE".

## 4. Navigation

- Fixed stage bar, 104 px tall at mobile width, background `#0d0d24`, logo mark left, hamburger right (3-line icon).
- A Cmd+K "composer" (`nw-composer-*`) is a command bar: key chips `Cmd` `K`, results panel with fast hover (`background/color/opacity 150 ms`), results list entrance uses `--nw-ease-results`.
- Sub-nav triggers use `scaleX` underline (220 ms decelerate). Mobile menu: submenu links fade colour with a 160 ms delay so items cascade.
- A corner "page fold" button (top-right, 32 x 32, 12 px folded-corner icon) is the theme toggle: the icon's front leaf scales 1.15 from the top-right corner on hover (200 ms ease), back leaf rotated 180 deg. No theme-crossfade animation was found (unverified).
- The root element carries class `lenis` -> smooth (inertial) scrolling library; we do not need this.

## 5. Interactions and transitions

| Pattern | Trigger | Duration | Easing | Technique |
|---|---|---|---|---|
| In-view reveal (`.nw-mission-reveal`) | scroll into view | 480 ms (+ per-item `--nw-reveal-delay`) | `cubic-bezier(0,0,.2,1)` | `[data-pending]` attribute sets `opacity:0; translate:0 8px`; IntersectionObserver removes the attribute; transitions `opacity` and the individual `translate` property. 13 items on the home page |
| Colour reveal on hover | hover / `[data-color-active]` | 2.33 s in, 1.27 s out | `ease` | mono image layer + colour layer; hover sets colour layer `opacity:.9` and swaps `--nw-color-reveal-duration`; `transition-property: opacity, filter` |
| Promo underline | hover | 450 ms | ease | `background-size 0%->100% 1px` |
| Promo sweep | loop | 3.5 s | linear | `translateX(-100% -> 100%)` pseudo |
| Menu fade/scale | open | 180 ms opacity + 360 ms scale | decelerate | `opacity` + `scale` |
| Theme fold hover | hover | 200 ms | ease | transform on two stacked icons |
| Caret | idle | 1 s-ish | `0-70-100: 1; 20-50: 0` | `@keyframes caret-blink` in composer |
| Conversation rows | mount | unverified | n/a | `conversation-rise {from{opacity:0; transform:translateY(16px)}}` + `conversation-fade` (a "chat transcript" example block that replays) |
| Dialog | open | 150 ms fade, 200 ms panel | ease-out | overlay `modalFade`; panel `modalEnter` translateX(110% -> 0) (right drawer) |
| Table / switch / legend micro | hover / toggle | 100 / 150 / 120 ms | ease-out | background, `inset-inline-start`, opacity |

Reduced motion: `.nw-mission-reveal, .nw-mission-reveal[data-pending] {opacity:1; transition:none; translate:none}` - content is never hidden for reduced-motion users; the underline `::after` and composer transitions are set to `none`; hover effects only inside `@media (hover:hover) and (pointer:fine)`; touch gets a separate `(hover:none) and (pointer:coarse)` treatment (`data-color-active` is set by JS on tap/in-view instead of hover).

Technique to remember: **`data-pending` attribute reveal**. Server HTML is fully visible; JS adds `data-pending` before first paint only to elements below the fold, then removes it per element via IntersectionObserver. If JS fails, nothing is hidden.

## 6. Micro-details

- Eyebrow strap above the H1, one line, uppercase 10 px, tracked.
- Key-chip UI (`Cmd` `K`) in the composer: rounded 4 px, wash `#ffffff0d`.
- Hairline `#ffffff1a` dividers on dark; no shadows.
- Image treatment: art sits in a frame with monochrome default state.

## 7. What to borrow

- `data-pending` reveal pattern (480 ms, 8 px, decelerate, per-item delay var) - safest reveal model; reduced-motion = no hiding at all.
- Instant hover-in, slow hover-out (700 ms) on nav links for a "settling" feel.
- Cmd+K command bar for docs search (Aegis skills are many: 24 skills, search matters).
- Touch-vs-hover split for effects.
- Paragraph text one step dimmer than headings.
- Corner theme-fold affordance: a small, distinctive toggle rather than a generic sun/moon (we can keep sun/moon but add a 200 ms scale hover).

## 8. What NOT to copy

- Smooth-scroll hijack (Lenis): can break anchor links, find-in-page and AT; we skip it.
- 2.33 s colour reveal: far too slow for utility UI; at most for editorial art.
- Giant viewport-unit type with no clamps: hurts zoom/reflow (WCAG 1.4.4, 1.4.10). Use `clamp()` with rem.
- 10 px eyebrows: below our 12 px floor.
- Marks, mission copy, art, fonts.
