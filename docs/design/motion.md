# Kairos motion spec

Tokens live in `design/tokens.json` (generated into `design/tokens.css` as `--k-dur-*`, `--k-ease-*`). Numbers here were derived from the research notes in `docs/design/research/` (Hermes, Nous, Microsoft AI, Humanist Review); we compress their durations for product UI. Principles: motion explains cause and effect, never decorates a task; content is never hidden by motion alone; leaving is faster than entering.

## 1. Tokens

| Token | Value | Use |
|---|---|---|
| `--k-dur-instant` | 80 ms | press feedback, checkbox tick |
| `--k-dur-fast` | 150 ms | hover colour, focus ring, row hover (Hermes/Nous use 150 ms) |
| `--k-dur-base` | 240 ms | underline wipe, tab/pill indicator, toggles, panel exit |
| `--k-dur-moderate` | 360 ms | menus, drawers, accordion, theme crossfade |
| `--k-dur-slow` | 600 ms | card image zoom, ring, button morph (matches MAI/Humanist 550-600) |
| `--k-dur-reveal` | 720 ms | scroll reveal, hero line reveal (MAI uses 1300 ms; too slow) |
| `--k-dur-stagger` | 60 ms | step between siblings or lines (MAI: 70 line, 50 word) |

| Token | Curve | Use |
|---|---|---|
| `--k-ease-standard` | `cubic-bezier(.4,0,.2,1)` | state changes between two visible states |
| `--k-ease-decelerate` | `cubic-bezier(0,0,.2,1)` | things entering (Nous reveal/underline) |
| `--k-ease-accelerate` | `cubic-bezier(.4,0,1,1)` | things leaving (Nous "departure") |
| `--k-ease-smooth` | `cubic-bezier(.22,1,.36,1)` | hover polish: zoom, ring, wipe (Humanist) |
| `--k-ease-arrival` | `cubic-bezier(.16,1,.3,1)` | hero/large entrances (Nous "arrival") |
| `--k-ease-fold` | `cubic-bezier(.65,0,.35,1)` | symmetric moves: indicator slide, theme crossfade |

Rules of thumb: enter = decelerate/arrival, exit = accelerate and about 60% of the enter time, state change = standard or smooth. No bounce/overshoot except a single success tick. Distances: reveal travel 8-12 px (Nous 8 px, Hermes 6-8 px); hover lift 2-3 px; image zoom 1.04-1.05x.

## 2. Reduced motion and gating (mandatory for every pattern)

1. `tokens.css` already collapses every `--k-dur-*` to 0.01 ms under `prefers-reduced-motion: reduce` (safety net; Hermes does the same with `*{transition-duration:.01ms}`).
2. Every transform/opacity animation below lives inside `@media (prefers-reduced-motion: no-preference)`. Outside it, the element simply appears in its final state.
3. Hover-only effects also sit in `@media (hover: hover) and (pointer: fine)`. Touch gets the final state or a tap state (`:active`), never a stuck hover.
4. Never start hidden: the hidden state is only applied by JS (class `js-reveal`) and only to elements below the fold. No JS / reduced motion = visible.
5. Infinite animations (spinners, pulses) must have a static equivalent (text "Working...", static ring).
6. Colour-only and opacity-only fades (<= 150 ms) are allowed under reduce when they carry meaning (focus, selection), see `:focus-visible` below.

## 3. Performance rules

- Animate `transform`, `opacity`, `clip-path`, `filter` (sparingly), `background-color`, `box-shadow` (small elements only). Never `width/height/top/left/margin` on large areas, never `all`.
- `will-change` only on elements that are about to animate (set it in the pre-state, remove after). Never blanket `will-change`.
- One IntersectionObserver per page, `unobserve` after first reveal, `rootMargin: "0px 0px -10% 0px"`, `threshold: 0.12`.
- Scroll-linked work uses `requestAnimationFrame` batching or CSS scroll-driven animation; never read layout in a scroll handler.
- Ambient loops (Hermes' 42 s frame glow) are out of scope; if a page has one, pause it when off-screen and when the tab is hidden.
- Budget: at most 3 concurrent running transitions per viewport on low-end devices; infinite animations only for "something is happening" feedback.

## 4. Patterns (ready-to-use CSS)

Include `design/tokens.css` first. Selectors are namespaced `k-`.

### 4.1 Reveal on scroll (IntersectionObserver class toggle)

Server HTML is fully visible. JS marks below-fold elements `js-reveal`, then adds `is-in` when they enter. (Pattern from Nous `data-pending`; durations ours.)

```css
@media (prefers-reduced-motion: no-preference) {
  .js-reveal {
    opacity: 0;
    translate: 0 12px;
    transition: opacity var(--k-dur-reveal) var(--k-ease-decelerate) var(--k-delay, 0ms),
                translate var(--k-dur-reveal) var(--k-ease-decelerate) var(--k-delay, 0ms);
  }
  .js-reveal.is-in { opacity: 1; translate: 0 0; }
}
```

```js
// Run once, after first paint. Elements already in view are never hidden.
const els = [...document.querySelectorAll('[data-reveal]')]
if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target) }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 })
  for (const el of els) {
    if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('js-reveal'); io.observe(el) }
  }
}
```

### 4.2 Stagger (CSS variable index, no timers)

```html
<ul class="k-stagger"><li style="--i:0">One</li><li style="--i:1">Two</li><li style="--i:2">Three</li></ul>
```

```css
@media (prefers-reduced-motion: no-preference) {
  .k-stagger > .js-reveal { --k-delay: calc(var(--i, 0) * var(--k-dur-stagger)); }
}
```

Cap at 8 items (8 x 60 = 480 ms); beyond that, reveal the group as one.

### 4.3 Staggered line reveal (headlines)

Authors wrap each visual line in `.k-line > span` (explicit lines are robust; automatic line-splitting breaks on resize, so use it only if you also re-split on `resize`). Technique from MAI `split-text by=lines` (clip + translateY(100%)), tuned to 720 ms and 70 ms step.

```html
<h1 class="k-lines js-lines">
  <span class="k-line" style="--line:0"><span>Open defence,</span></span>
  <span class="k-line" style="--line:1"><span>governed by people.</span></span>
</h1>
```

```css
.k-line { display: block; overflow: hidden; padding-block: 0.08em; margin-block: -0.08em; } /* room for descenders */
@media (prefers-reduced-motion: no-preference) {
  .js-lines:not(.is-in) .k-line > span { transform: translateY(105%); opacity: 0; }
  .k-lines .k-line > span {
    display: inline-block;
    transition: transform var(--k-dur-reveal) var(--k-ease-arrival) calc(var(--line) * 70ms),
                opacity var(--k-dur-moderate) var(--k-ease-decelerate) calc(var(--line) * 70ms);
  }
}
```

Add `js-lines` from script only (hidden state exists only when JS adds it), then `is-in` on intersect (same observer as 4.1). Hero H1 may reveal on load: add `is-in` in `requestAnimationFrame` x2.

### 4.4 Hover lift (cards)

```css
.k-card { transition: transform var(--k-dur-base) var(--k-ease-smooth), box-shadow var(--k-dur-base) var(--k-ease-smooth), background-color var(--k-dur-fast) var(--k-ease-standard); }
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  .k-card:hover { transform: translateY(-3px); box-shadow: var(--k-shadow-lift); }
  .k-card:active { transform: translateY(-1px); box-shadow: var(--k-shadow-md); transition-duration: var(--k-dur-instant); }
}
```

Editorial variant (Humanist): double ring + image zoom, all `--k-ease-smooth`:

```css
.k-card--media .k-card__img { overflow: hidden; }
.k-card--media img { transition: transform var(--k-dur-slow) var(--k-ease-smooth); }
.k-card--media { box-shadow: 0 0 0 0 transparent, 0 0 0 0 transparent; transition: box-shadow var(--k-dur-slow) var(--k-ease-smooth); }
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  .k-card--media:hover img { transform: scale(1.04); }
  .k-card--media:hover { box-shadow: 0 0 0 3px var(--k-color-bg), 0 0 0 5px var(--accent, var(--k-color-text)); }
}
```

### 4.5 Link underline wipe (enter from left, exit right)

```css
.k-link { position: relative; text-decoration: none; }
.k-link::after {
  content: ""; position: absolute; inset: auto 0 -0.12em 0; height: 1px; background: currentColor;
  transform: scaleX(0); transform-origin: 100% 50%;
}
@media (prefers-reduced-motion: no-preference) {
  .k-link::after { transition: transform var(--k-dur-base) var(--k-ease-smooth); }
}
.k-link:is(:hover, :focus-visible)::after { transform: scaleX(1); transform-origin: 0 50%; }
/* reduced motion: the underline appears instantly (transition is 0.01ms via tokens), still a valid affordance */
```

### 4.6 Sticky nav: blur and compact on scroll

```css
.k-nav { position: sticky; top: 0; z-index: var(--k-z-nav); background: var(--k-color-nav-bg);
  -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); border-bottom: 1px solid transparent; }
.k-nav[data-scrolled="true"] { border-bottom-color: var(--k-color-line); }
@media (prefers-reduced-motion: no-preference) {
  .k-nav { transition: border-color var(--k-dur-base) var(--k-ease-standard), padding var(--k-dur-base) var(--k-ease-standard); }
}
```

```js
// one passive listener, one attribute, no layout reads
const nav = document.querySelector('.k-nav'); let t = false
addEventListener('scroll', () => { if (!t) { t = true; requestAnimationFrame(() => { nav.dataset.scrolled = scrollY > 8; t = false }) } }, { passive: true })
```

Fallback: browsers without `backdrop-filter` get `--k-color-nav-bg` at opacity 0.78 over content, which still reads (keep the alpha at >= 0.78; text contrast is computed against `--k-color-bg`).

### 4.7 Pill nav indicator slide

A single absolutely positioned pill moves under the active/hovered item. Only `transform` and `width` change.

```html
<nav class="k-pillnav" aria-label="Primary">
  <span class="k-pillnav__ind" aria-hidden="true"></span>
  <a href="/skills" aria-current="page">Skills</a><a href="/themis">Themis</a><a href="/docs">Docs</a>
</nav>
```

```css
.k-pillnav { position: relative; display: inline-flex; gap: var(--k-space-1); padding: var(--k-space-1);
  border: 1px solid var(--k-color-line); border-radius: var(--k-radius-pill); background: var(--k-color-surface); }
.k-pillnav a { position: relative; z-index: 1; padding: 0.5rem 1rem; border-radius: var(--k-radius-pill);
  color: var(--k-color-text-muted); text-decoration: none; }
.k-pillnav a[aria-current="page"], .k-pillnav a:hover { color: var(--k-color-text); }
.k-pillnav__ind { position: absolute; inset: var(--k-space-1) auto var(--k-space-1) 0; width: var(--w, 0); transform: translateX(var(--x, 0));
  border-radius: var(--k-radius-pill); background: var(--k-color-surface-raised); }
@media (prefers-reduced-motion: no-preference) {
  .k-pillnav__ind { transition: transform var(--k-dur-base) var(--k-ease-fold), width var(--k-dur-base) var(--k-ease-fold); }
}
```

```js
const nav = document.querySelector('.k-pillnav'), ind = nav.querySelector('.k-pillnav__ind')
const move = (a) => { ind.style.setProperty('--x', a.offsetLeft - 4 + 'px'); ind.style.setProperty('--w', a.offsetWidth + 'px') }
const current = nav.querySelector('[aria-current]')
nav.querySelectorAll('a').forEach(a => { a.addEventListener('pointerenter', () => move(a)); a.addEventListener('focus', () => move(a)) })
nav.addEventListener('pointerleave', () => current && move(current)); current && move(current)
```

(4 px = `--k-space-1`, the nav padding. `offsetLeft` is read only on pointer events, never on scroll.)

### 4.8 Theme crossfade

Light is the default; the only way to get dark is the toggle, which sets `data-theme="dark"` on `<html>` and stores it. Two tiers:

```js
function setTheme(next) {
  const apply = () => { document.documentElement.dataset.theme = next; try { localStorage.setItem('kairos-theme', next) } catch (e) {} }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!reduce && document.startViewTransition) document.startViewTransition(apply) // 1: browser crossfade
  else apply()                                                                      // 2: instant swap
}
```

```css
@media (prefers-reduced-motion: no-preference) {
  ::view-transition-old(root), ::view-transition-new(root) { animation-duration: var(--k-dur-moderate); animation-timing-function: var(--k-ease-fold); }
  /* Fallback for browsers without view transitions: briefly transition colours */
  :root.k-theme-anim, :root.k-theme-anim *, :root.k-theme-anim *::before, :root.k-theme-anim *::after {
    transition: background-color var(--k-dur-moderate) var(--k-ease-fold), color var(--k-dur-moderate) var(--k-ease-fold), border-color var(--k-dur-moderate) var(--k-ease-fold) !important;
  }
}
```

For the fallback, add `k-theme-anim` to `<html>` for 400 ms around the change and remove it. Do not leave the `*` transition on permanently (it would slow every hover).

### 4.9 Button press and primary-button arrow

```css
.k-btn { transition: background-color var(--k-dur-fast) var(--k-ease-standard), color var(--k-dur-fast) var(--k-ease-standard),
                     box-shadow var(--k-dur-fast) var(--k-ease-standard), transform var(--k-dur-instant) var(--k-ease-standard); }
.k-btn:active { transform: translateY(1px) scale(0.985); box-shadow: var(--k-shadow-press); }
.k-btn__arrow { transition: transform var(--k-dur-base) var(--k-ease-smooth); }
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  .k-btn:hover .k-btn__arrow { transform: translateX(3px); }
}
@media (prefers-reduced-motion: reduce) { .k-btn:active { transform: none; } }
```

### 4.10 Focus ring (never animate away)

```css
:focus-visible { outline: 2px solid var(--k-color-focus); outline-offset: 3px; border-radius: var(--k-radius-xs); }
@media (prefers-reduced-motion: no-preference) { :focus-visible { transition: outline-offset var(--k-dur-fast) var(--k-ease-decelerate); } }
```

### 4.11 Menu / drawer / accordion

```css
@media (prefers-reduced-motion: no-preference) {
  .k-menu[data-state="open"]   { animation: k-menu-in var(--k-dur-moderate) var(--k-ease-decelerate) both; }
  .k-menu[data-state="closed"] { animation: k-menu-out var(--k-dur-base) var(--k-ease-accelerate) both; }
  .k-drawer[data-state="open"]   { animation: k-drawer-in var(--k-dur-moderate) var(--k-ease-decelerate) both; }
  .k-drawer[data-state="closed"] { animation: k-drawer-out var(--k-dur-base) var(--k-ease-accelerate) both; }
}
@keyframes k-menu-in    { from { opacity: 0; transform: translateY(-6px) scale(.98); } }
@keyframes k-menu-out   { to   { opacity: 0; transform: translateY(-4px); } }
@keyframes k-drawer-in  { from { opacity: 0; transform: translateX(100%); } }
@keyframes k-drawer-out { to   { opacity: 0; transform: translateX(100%); } }
/* accordion: animate grid rows, not height */
.k-acc__panel { display: grid; grid-template-rows: 0fr; }
.k-acc__panel > div { overflow: hidden; }
.k-acc[aria-expanded="true"] + .k-acc__panel { grid-template-rows: 1fr; }
@media (prefers-reduced-motion: no-preference) { .k-acc__panel { transition: grid-template-rows var(--k-dur-moderate) var(--k-ease-standard); } }
```

### 4.12 Agent-working and attention (Themis)

```css
/* Terminal spinner: braille frames (Hermes idea), text fallback below */
.k-spin::after { content: "..."; }
@media (prefers-reduced-motion: no-preference) {
  .k-spin::after { content: "⠋"; animation: k-braille 800ms steps(1, end) infinite; }
  .k-attention { animation: k-pulse 1.2s var(--k-ease-decelerate) 3; } /* three pulses, then rest */
}
@keyframes k-braille { 0%,100%{content:"⠋"} 10%{content:"⠙"} 20%{content:"⠹"} 30%{content:"⠸"} 40%{content:"⠼"} 50%{content:"⠴"} 60%{content:"⠦"} 70%{content:"⠧"} 80%{content:"⠇"} 90%{content:"⠏"} }
@keyframes k-pulse { from { box-shadow: 0 0 0 2px var(--k-color-themis), 0 0 0 4px color-mix(in srgb, var(--k-color-themis) 55%, transparent); }
                     to   { box-shadow: 0 0 0 2px var(--k-color-themis), 0 0 0 12px transparent; } }
```

Static equivalent for the attention state is always a persistent 2 px themis ring and an "Approval needed" label; the pulse only draws the eye.

### 4.13 Page transition (route fade)

```css
@media (prefers-reduced-motion: no-preference) {
  @view-transition { navigation: auto; }
  ::view-transition-old(root) { animation: k-fade-out var(--k-dur-base) var(--k-ease-accelerate) both; }
  ::view-transition-new(root) { animation: k-fade-in  var(--k-dur-base) var(--k-ease-decelerate) both; }
}
@keyframes k-fade-out { to { opacity: 0; } }
@keyframes k-fade-in  { from { opacity: 0; } }
```

Fully progressive: unsupported browsers just navigate. Not used inside the Themis app shell (SPA route swaps use 4.1-style 150 ms fade of the content region only).

### 4.14 Skeleton (loading)

```css
.k-skel { background: var(--k-color-surface-raised); border-radius: var(--k-radius-sm); min-height: 1em; }
@media (prefers-reduced-motion: no-preference) { .k-skel { animation: k-skel 1.4s var(--k-ease-standard) infinite; } }
@keyframes k-skel { 50% { opacity: 0.55; } } /* Hermes/Nous: opacity pulse to 0.5 */
```

## 5. Catalogue (what triggers what)

| Pattern | Trigger | Duration | Easing | Technique |
|---|---|---|---|---|
| Reveal on scroll | enter viewport | 720 ms | decelerate | IO adds `.is-in`; `opacity` + `translate` 12 px |
| Stagger | sibling index | 60 ms step, max 8 | decelerate | `--i` variable in `calc()` |
| Line reveal | enter viewport / load | 720 ms, 70 ms step | arrival | `overflow:hidden` line + `translateY(105%)` |
| Hover lift | hover (fine pointer) | 240 ms | smooth | `translateY(-3px)` + shadow |
| Card media ring/zoom | hover | 600 ms | smooth | double ring box-shadow, `scale(1.04)` |
| Underline wipe | hover/focus | 240 ms | smooth | `scaleX` with origin flip |
| Nav blur/border | scroll > 8 px | 240 ms | standard | `data-scrolled`, rAF-throttled |
| Pill indicator | hover/focus/route | 240 ms | fold | `transform` + `width` |
| Theme crossfade | toggle | 360 ms | fold | View Transitions, colour-transition fallback |
| Button press | `:active` | 80 ms | standard | `translateY(1px) scale(.985)` + inset shadow |
| Menu / drawer | open / close | 360 / 240 ms | decelerate / accelerate | keyframes on `data-state` |
| Accordion | toggle | 360 ms | standard | `grid-template-rows 0fr -> 1fr` |
| Attention pulse | needs approval | 1.2 s x 3 | decelerate | `box-shadow` ring growth, finite |
| Agent spinner | running | 800 ms loop | steps | braille frames in `::after`, text fallback |
| Route fade | navigation | 240 ms | accel / decel | `@view-transition` |
| Skeleton | loading | 1.4 s loop | standard | opacity to .55 |

## 6. Testing checklist

- Toggle OS "reduce motion": no translate/scale/pulse anywhere, content visible, focus states still visible.
- Disable JS: all content visible, nav usable.
- Throttle CPU 4x and scroll a long page: no dropped-frame spikes from reveals.
- Tab through the page: focus ring visible on every control in both themes (3:1 against adjacent colour).
- Zoom to 200% and 400% width: no horizontal scroll, no clipped line-reveal descenders.
