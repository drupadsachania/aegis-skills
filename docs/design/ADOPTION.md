# Design language adoption record

Status: 2026-10-11. Records what `docs/design/DESIGN.md` and `motion.md` (section 13 follow-ups) became in code. The organisation spelling is settled as "Kairos Foundation" (kairos-foundation.org); who the legal copyright holder is remains an open owner question.

## What was adopted where

| Area | Adopted |
|---|---|
| Light default (site) | `prefers-color-scheme` block, the `matchMedia` fallback in `Layout.currentTheme()` and the `light dark` meta are gone. Dark only through the header toggle (`html[data-theme="dark"]`, saved in `localStorage` key `aegis-theme`, always in try/catch). `_document.js` applies a saved dark choice before paint and updates the `color-scheme` meta. |
| Tokens (site) | `apps/web/scripts/sync-design-tokens.js` copies `design/tokens.css` to `apps/web/styles/tokens.generated.css` (git-ignored) in `predev` and `prebuild`; `pages/_app.js` imports it before `globals.css`. `globals.css` now uses only `--k-*` names (colour, type, space, radius, duration, easing); the old short names (`--bg`, `--text-2`, ...) and all hex/rgba values were removed. Remaining site-specific variables: `--hero-em`, `--glow-a/b`, `--sun-d/--moon-d`. |
| Token drift guard | `apps/web/tests/guard/design-tokens.test.js` fails if the site copy differs from what `design/tokens.json` generates, if site CSS uses an undefined `--k-*` name or a hard-coded colour, or if auto-dark returns. `design/tokens.test.js` keeps asserting contrast. |
| Motion (site) | Reveal on scroll (480 ms decelerate, 8 px, 60 ms batch stagger, one IntersectionObserver); hero H1 line rise (720 ms arrival, 70 ms per line); header hairline + blur fade after 8 px scroll (240 ms); sliding pill-nav indicator (240 ms fold, transform + width); card hover lift 3 px (240 ms smooth); primary pill arrow-circle morph with constant width; press state (80 ms); link underline wipe (240 ms); copy button glyph swap + pop; theme crossfade (View Transitions, 360 ms, colour-transition fallback); braille spinner on the skill finder's "FINDING" label (its only loading state). |
| Terminal motif (site) | Install command blocks (`CodeBlock`) are dark terminal windows in both themes: window dots, mono label, copy button, CSS `$` prompt (not selectable, not copied). Docs `pre` blocks share the dark surface. No simulated output anywhere. |
| Themis dashboard | `ui/src/main.tsx` imports `@design/tokens.css` (Vite alias to `design/`), so the bundle carries the same tokens; `styles.css` was rewritten on them (cream light default, no OS dark block). In-app theme toggle (`data-theme`, `localStorage` key `themis-theme`, try/catch) with an external first-paint script `ui/public/theme-init.v1.js` (the CSP forbids inline scripts). Sidebar shell (240 px rail, 64 px icon rail below 1024 px, top bar + drawer below 768 px) over the existing eight routes, Themis-blue active item with a 2 px bar, gold only in the brand mark, status chips with colour + glyph + label, persistent ring and 3x attention pulse for "needs approval" (nav count and pending cards), a single most-severe banner (unreachable beats pending approvals), loopback cue and "updated Ns ago" in the rail, 150 ms route fade, braille spinner for `running`. API behaviour and the strict UI CSP are untouched. |

## Token delivery decisions

- Site: build-time copy, not a committed copy. It cannot drift by hand, and it relies on the assumption `build-downloads.js` already makes on Vercel (the whole repository is checked out even with Root Directory = `apps/web`); nothing imports `../../design` at runtime. If a deploy ever builds with only `apps/web`, `sync-design-tokens.js` fails loudly with an explanatory message instead of shipping unstyled pages. Running `npx next build` directly (without npm's `prebuild`) fails on the missing generated file; use `npm run build`.
- Dashboard: direct import through the `@design` alias at `vite build` time. The CSS is emitted as a hashed file in `dist/ui/assets`, so no inline styles and nothing fetched at runtime.

## Fonts

- Site: unchanged (Google Fonts link, allowed by the site CSP). Self-hosting is still DESIGN open item 3.
- Dashboard: no font files are bundled. The token stacks name Newsreader, IBM Plex Sans and Red Hat Mono first and fall back to system serif, sans and mono faces; nothing is fetched (loopback, offline, `font-src 'self'`). Upgrade path: add open-licence (SIL OFL) woff2 files under `ui/public/fonts/`, declare `@font-face` in `styles.css` pointing at `/fonts/...` (already allowed by `font-src 'self'` and served by `static.ts` as `font/woff2`), and keep the same family names.

## Deviations from DESIGN.md (with reasons)

1. Theme storage keys stay `aegis-theme` (site) and `themis-theme` (dashboard), not `kairos-theme` (motion.md): renaming would silently reset existing visitors' choice.
2. Hero H1 reveal is a finite CSS animation (always ends visible) instead of the JS `js-lines` class: strictly safer for no-JS and LCP, and it cannot leave text hidden.
3. Reveal duration is 480 ms (owner request, Nous-like) rather than the `--k-dur-reveal` 720 ms token; line reveal keeps 720 ms.
4. Reveal uses `threshold: 0` with a `-10%` bottom margin instead of 0.12, so tall sections can never get stuck hidden.
5. Shell code blocks wrap long commands (`pre-wrap`) instead of scrolling horizontally, for reflow at 320 px and easier reading on phones.
6. Dashboard nav keeps the existing eight routes (Run, Sessions, Findings & Reports, Approvals, Skills, MCP servers, Models & Keys, Settings); there is no separate "Status" page, and Run remains the landing route. The "local-first" cue says "served to this machine only" and does not claim that nothing leaves the machine, because remote model providers do receive prompts.
7. Dashboard has no sticky-per-page title strip or context chips yet (pages keep their own h1).

## Verification notes

- Browser checks used the Browser pane: the site at 1280 and 390/539 px, light and dark, plus emulated OS dark (stays light). `prefers-reduced-motion` could not be emulated in that pane; it is covered by `apps/web/tests/components/reveal.test.js` (no observer, nothing hidden) and `apps/web/tests/guard/motion-css.test.js` (every moving rule sits inside `no-preference`).

## Remaining gaps

- Foundation mark/accent still placeholders; naming resolved (Kairos Foundation).
- Cmd/Ctrl+K command palette, docs right-hand TOC and prev/next cards, accordion and menu/drawer keyframes for the site are not built.
- Dashboard: context chips and write-target banner, Run terminal window with streamed output styling, secret-reveal pattern on Models & Keys, approval checkbox "I have read the exact command" for write/execute, deep-linkable filters, real self-hosted fonts.
- Syntax highlight palette for code windows (DESIGN open item 6).
- Screen-reader and keyboard walkthroughs are manual and were not run.
