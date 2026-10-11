# Research: Hermes Agent (hermes-agent.nousresearch.com)

Status: inspiration only. Method: in-app browser, computed styles, `document.styleSheets` iteration (custom properties, transitions, `@keyframes`, media queries) on 2026-10-11. The browser pane renders at a narrow responsive width (about 539 px) so screenshots are mobile-width; desktop values below come from the CSS itself (custom properties, `@media` rules) and from a 1280 px emulation, not from desktop screenshots. Hover states were read from CSS rules, not watched live. Anything not read from CSS is marked "unverified".

We take ideas only. We do not copy images, the three.js hero artwork, logos, the Nous/Hermes names, any copy, or the proprietary fonts (Rules / Aeonik are commercial; the page loads a "TRIAL" Aeonik build).

Pages covered: landing `/`, docs (Docusaurus) incl. `/docs/user-guide/features/web-dashboard`.

## 1. Palette

Landing is a saturated flat-colour system built on one hue with tonal ladders (`--hermes-blue-dark-N` / `-light-N` = the blue mixed with black/white at N%).

| Role | Value | Notes |
|---|---|---|
| Brand blue (page bg) | `#0000f2` | `--hermes-color-blue`; body bg |
| Paper | `#f2f2f2` | `--hermes-color-white`; text on blue, alternate section bg |
| Ink on paper | `#0000f2` / `rgb(0 0 145)` (`#000091`) | blue text on paper; deep blue for secondary |
| Neutral | `#616191` | `--hermes-color-neutral` |
| Accent / selection | `#f2f200` (yellow) | `--selection-bg`, text-selection only |
| Spectrum (unused chrome) | red `#f20000`, orange `#f27900`, neon `#79f200`, green `#00f279`, cyan `#00f2f2`, indigo `#7900f2`, magenta `#f200f2`, pink `#f20079` | all share the "f2" channel cap |
| Status | destructive `#f0949e`, success `#8cc4a7`, warning `#ddba7d` | pastel on blue |
| Dark panel (Nous theme) | paper `#0d0d24`, back `#171738`, text `#e5e5ee`, link `#8080ff`, line `#ffffff1a`, focus `#8888ff` | `--nw-theme-*` |
| Docs (Docusaurus) | bg `#1b1b1d`, nav `rgba(7,7,13,.93)`, code bg `rgb(10 10 18)`, text `#e8e4dc`, primary `gold` (`#ffd700`) | gold links, 6% gold hairline borders |

Section rhythm (landing): blue hero -> blue "downloads" -> paper `#f2f2f2` features -> paper FAQ -> paper pricing -> blue footer. Alternation is by full-bleed colour blocks, no gradients.

A fixed 5 px (`calc(2.5 * var(--vsq))`, `--vsq: calc(.5vw + .5vh)`) frame border is drawn around the whole viewport (`.hw-frame`, `z-index:100`), tinted with the brand colour. It is the signature device.

## 2. Typography

| Role | Family | Open alternative | Size / weight / tracking |
|---|---|---|---|
| Display / H1 | Rules Gothic Condensed (wt 200), "cap-trim" | Big Shoulders Display, Oswald, Antonio | 108 px hero token (`--hpv2-type-hero`); measured 77 px / lh 1 / -0.02em (-1.54 px) at pane width |
| H2 | Rules Gothic Condensed 400 | same | 80 px, lh 1, -0.02em (token h2 36 px / 1.1 on small) |
| H3 / feature title | Rules Gothic Compressed 500 | Big Shoulders, League Gothic | 42 px / lh 1.1 |
| Body | Aeonik Fono Pro (trial) | IBM Plex Sans, Inter | 14-16 px, lh 1.5-1.6 |
| Mono / labels | Rules Condensed, UPPERCASE | Red Hat Mono, JetBrains Mono | 14 px tracking +0.1em (1.4 px); buttons 15 px +0.02em (0.3 px) |
| Meta | Aeonik Fono | IBM Plex Mono | 9-13 px (`legend` 9, `info` 10, `meta` 12, `small` 13) |
| Docs | Inter + JetBrains Mono | (already open) | body 16 px / 26.4; h1 32 px 600; h2 24 px 600; code 14.4 px |

Details worth keeping: `text-box-trim` / cap-trim pseudo-elements (`::before/::after` with negative margins as fallback) so big headings sit on the grid without extra leading. Everything in nav and buttons is uppercase mono-ish with tracking, which reads as "terminal label".

## 3. Layout

- Hero grid: 2 equal columns (`minmax(0,1fr)` x2), gap 30 px, min-height 520 px; collapses to 1 column below 768 px with gap 32 px. Copy left, three.js line-art canvas right.
- Spacing tokens are tiny and coarse: 2/4/8/12/16/24/32/40 px; section vertical 56 px (`--space-section-v: 3.5rem`); FAQ section `py-[60px]`.
- Three equal OS download cards, then a 6-feature grid (numbered "#1 CONNECT" eyebrow + 42 px title + one-sentence copy), then 5-item FAQ accordion, then a 4-tier pricing row with a "MOST POPULAR" tag.
- Cards: nearly square. Buttons radius 3 px (`br3px`); segmented OS switcher uses 4 px end radii. Borders are 0.5 px hairlines (`--hermes-outline-w:.5px`, inset box-shadow, never a real border). Shadows are hard and tiny: `0 4px 2px` menu, `0 2px 8px` lift, `inset 0 1px 4px` press.
- Footer: big blue block, four link columns, "MIT LICENSE" line (licence is a first-class footer item).

## 4. Navigation

- Landing nav: centered logotype (two-line stack) with a row of uppercase links either side (Nous, Hermes, Docs ... Community, Portal) and an "Install" ghost button (bg `rgba(242,242,242,.2)`, 8.75 px padding). Social icons sit under the logo. Static (not sticky) on landing.
- Mobile: links replaced by a 44 x 44 px "Open menu" button (`size-11`), `aria-expanded` + `aria-controls`.
- Nous theme nav: sub-nav link transition `color .7s, background-color .7s` (slow fade out) with instant hover-in; trigger label gets a `scaleX` underline (see motion).
- Docs: Docusaurus navbar, sticky, `backdrop-filter: blur(12px)`, 1 px gold-8% bottom border, height 3.75 rem; sidebar 300 px; active menu link gold text on `rgba(255,215,0,.08)`.
- Primary CTA pattern: two buttons side by side (filled paper "Download", translucent ghost "Deploy to cloud") then a terminal-style install box with a macOS / Linux / Windows segmented switcher and a copy button.

## 5. Interactions and transitions (focus)

Tokens (from `:root`): durations `hint .18s`, `quick .15s`, `fast .25s`, `medium .35s`, `reveal .48s`, `menu-scale .36s`, `nav-underline .22s`, `fold-hover .2s`, `underline .42s`, `promo-underline .45s`, `menu-delay .16s`. Easings `decelerate cubic-bezier(0,0,.2,1)`, `smooth-out cubic-bezier(.22,1,.36,1)`, `arrival cubic-bezier(.16,1,.3,1)`, `fold cubic-bezier(.65,0,.35,1)`, `departure cubic-bezier(.4,0,1,1)`, `position cubic-bezier(.2,.8,.2,1)`, `results cubic-bezier(.22,1,.36,1)`.

| Pattern | Trigger | Duration | Easing | Technique |
|---|---|---|---|---|
| Button hover colour | hover/focus | 150 ms | `cubic-bezier(0,0,.2,1)` | `transition: background-color, box-shadow` |
| Button "orbiting arc" border | hover (pointer: fine, no-preference) | 2.23 s loop | linear | `.hermes-button-hover-border` masked ring (`mask: ... content-box exclude`), inner `::before` 300% square with conic-like `linear-gradient(160deg, ...)` translated `-10%,-10%` -> `-50%,-50%` (`@keyframes hermes-button-border`), `will-change: transform`; static ring on `:focus-visible` |
| Editorial underline grow | hover/focus-visible | 220 ms | smooth-out | `background-size: 0% 1px -> 100% 1px` on span (`.hermes-button[data-variant=editorial-disclosure]`); press = `box-shadow: 0 0 0 1px inset` |
| Nav label underline | hover / `aria-expanded=true` | 220 ms | decelerate | `::after` height 1 px, `transform: scaleX(0->1)`, `transform-origin: 0 50%`, bottom -4 px |
| Sub-nav link fade-out | un-hover | 700 ms | default | `transition: color .7s, background-color .7s` only on `:not(:hover):not(:focus-visible)` (instant in, slow out) |
| Menu open | click | 360 ms scale + 180 ms opacity | decelerate | `opacity` + `scale` transition, 160 ms stagger delay on submenu items |
| Sheet / side panel | open / close | 250 ms in, 150 ms out | ease-out / ease-in | `@keyframes hpv2-sheet-in {from{opacity:0;transform:translateX(100%)}}`, `data-state=open|closed` (Radix-style) |
| Toast | mount / unmount | n/a (unverified) | n/a | `toast-in {from{opacity:0;transform:translateX(1rem)}}` |
| Rise-in (claim card) | mount | 450 ms | ease-out | `@keyframes hpv2-claim-rise {from{opacity:0;transform:translateY(8px)}}` `backwards` fill |
| Slide-down / slide-up / fade-in utilities | mount | 600 / 600 / 500 ms | ease-out | 6 px `translateY` + opacity, `animation-fill-mode: both` |
| Attention pulse | needs-attention state | 1.2 s x 3 | ease-out | `hpv2-attention-pulse` grows a coloured ring `0 0 0 6px -> 14px` fading; plays 3 times, then rests |
| Terminal spinner | busy | 800 ms | `steps` via keyframes | `::after {content}` cycles braille frames `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏` at 10 % steps |
| Cursor blink | group hover | 1 s | `step-end` infinite | `@keyframes blink {50%{opacity:0}}` |
| Ambient frame glow | always | 42 s loop | ease-in-out | `.hw-frame-ambient` 4 edge strips, gradient pseudo `translate` (`hw-frame-arc`) + `hw-frame-bloom` opacity 0.48 -> 0.9 at 80 %; paused when scrolled out (`animation-paused`) |
| Scroll cue | scroll | in 160 ms / out 600 ms | ease-out | `.hw-frame-scroll.is-scrolling {opacity:.45}` radial-gradient glow on the left/right frame edges at `--scroll-y` (JS sets the CSS variable) |
| Click cue | click | n/a | n/a | `.hw-frame-click` radial gradient at `--cue-x/--cue-y` (JS sets) |
| Page transition | route change | 250 ms | ease-out | View Transitions: `::view-transition-old(page){animation: fade-out .25s}` / `new(page){fade-in .25s}`; only when `.hermes-web` is present |
| Veil | overlay | 350 ms | default | `opacity .35s, visibility linear .35s` |
| Table row hover | hover | 100 ms | default | `background-color .1s`; switch thumb `inset-inline-start .15s ease-out` |
| Promo sweep | loop | 3.5 s | linear | `::before` translateX(-100% -> 100%) |
| Hatch crawl | decorative | unverified | n/a | `hpv2-hatch-crawl` translates `-1ch` for a marching hatch pattern |

Other techniques: hero is a three.js r185 canvas (`data-engine`) - not for us. Docs copy button: icon swap with `transition: all 200ms ease` and 75 ms delay on the success tick. Docs navbar-sidebar: `transform translate3d(-100%,0,0)` + opacity/visibility, 200 ms ease-in-out. Docs links use `cubic-bezier(.08,.52,.52,1)` at 200 ms.

Reduced motion: `@media (prefers-reduced-motion: reduce)` sets `*, ::before, ::after {transition-duration: .01ms}`, disables the frame ambient and arc animations (`opacity:0; animation:none`), hides click/scroll cues, and sets nav transitions to `none`. Hover-only effects are additionally gated by `@media (hover: hover)`, `(hover: hover) and (pointer: fine)`, and `(hover:hover) and (prefers-reduced-motion: no-preference)`. This layering is the model to copy.

Loading / skeleton: `surfacePulse {50% {opacity:.5}}` (generic pulse), plus the braille spinner. Micro-motion is almost entirely opacity and 6-8 px translate; nothing bounces.

Landing has no scroll-reveal animation on feature cards (all static; verified in computed `transition: all`/`opacity: 1`). Hermes' character comes from the frame, the type, and the buttons, not from reveals.

## 6. Dashboard documentation (Hermes web dashboard page)

Source: `/docs/user-guide/features/web-dashboard`. Useful as a product-pattern reference for the Themis dashboard:

- Information architecture: one machine-level dashboard with a left sidebar of pages: Status, Chat, Config, API Keys, Sessions, Logs, Analytics, Cron, Profiles, Skills, MCP, Webhooks, Pairing, Channels, System. Profile switcher in the sidebar; selection stored in the URL (`?profile=name`) so deep links survive refresh.
- Status page auto-refreshes every 5 s; shows version, gateway state (PID, connected platforms), active sessions (last 5 min), 20 recent sessions with model / message count / tokens.
- Resource-pressure banner: only the single most severe warning shows (disk critical > memory critical > OOM restart > disk elevated > memory elevated); dismissals scoped to the boot; escalation re-opens it; a stale heartbeat renders nothing instead of a false alarm.
- Managed-target banner: an amber banner names a non-default profile whenever it is the write target, so "where will this write?" is never ambiguous.
- Chat tab embeds the real TUI via xterm.js (WebGL) over a PTY WebSocket, keepalive every 20 s, session switcher in a thin right rail that folds into a slide-over on narrow screens.
- Local-first: binds 127.0.0.1:9119, "no data leaves localhost"; non-loopback bind always requires an auth provider.
- REST API is documented inline per endpoint (method + path headings).

## 7. Micro-details

- Eyebrows: `#1 CONNECT` numbered verb labels above feature titles.
- Uppercase condensed mono labels with 0.1em tracking for all chrome.
- Terminal motifs: install one-liner box with OS switcher, copy button, braille spinner, blinking cursor.
- Hairlines at 0.5 px via inset box-shadow; 3 px button radius; hard small shadows.
- Pricing tier tag "MOST POPULAR" with a `//` separator.

## 8. What to borrow (Kairos / Aegis / Themis)

1. Layered motion gating: reduce -> kill; hover only on `(hover:hover)`; infinite loops only on fine pointers and only on hover.
2. Fast colour transitions (150 ms), 220 ms underline growth, 360 ms menu, 250/150 ms enter/exit asymmetry (leave faster than enter).
3. Underline-grow link and a quiet hover-border affordance on primary buttons (a slow-rotating hairline ring) as an optional Themis flourish.
4. Terminal motifs: braille spinner for "agent is working", install box with copy, cursor blink only on group hover.
5. Attention pulse that plays three times then rests (approval needed in Themis).
6. Single most-severe banner, scoped dismissal, amber "write target" banner (Themis environment / tenant context).
7. Numbered verb eyebrows, uppercase tracked mono labels.
8. View Transitions for route fades (250 ms) where supported.
9. Docs: sticky blurred navbar (12 px blur) and a hairline border tinted with the accent at about 8 %.

## 9. What NOT to copy

- Saturated electric blue everywhere, the viewport frame glow, the three.js hero, fully condensed display faces, brand names, marks, copy, imagery, pricing tier names.
- Aeonik / Rules fonts (commercial). Use Newsreader, IBM Plex Sans, Red Hat Mono.
- Infinite ambient animation (42 s frame bloom): costs paint and adds noise; skip or make it opt-in.
- The 3 px radius and 0.5 px hairlines: too hard for our warm editorial look; we keep 12-28 px radii.
- Static, non-reveal landing: we may add gentle reveals (see `motion.md`) but never as the only way to read content.
