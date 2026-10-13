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

## Logos and brand colours (2026-10)

| Area | Adopted |
|---|---|
| Assets | `apps/web/public/brand/` ships the two simplified SVG icons and 640/320 px WebP marks and 640 px lockups (20-60 KB each, down from 166-334 KB PNGs). The full-resolution masters live in `design/brand/source/` and are not served. Favicon, touch icon and social image are in `apps/web/public/`. Inventory and provenance: `docs/design/LOGOS.md`. |
| Site | `components/Brand.js` renders every logo with explicit width/height and alt. Header/menu: two icons plus the "Aegis · Themis" text (replaces the diamond-and-disc mark). Footer: icons plus "A Kairos Foundation project" (https://kairos-foundation.org/) and the Kairos GitHub org. Home cards: large marks. `/themis`: lockup hero (eager). `/skills`, skill pages and the docs hub: small icon cues. `_document.js` links the favicon set; `Layout.js` adds Open Graph and Twitter tags (absolute `og:image` on the `aegis-skills.vercel.app` origin). CSP unchanged (`img-src 'self' data:`). |
| Dashboard | The Themis icon (sidebar, top bar) and Aegis icon (Skills page) are imported from `apps/web/public/brand` through the `@brand` Vite alias, so one copy of each file exists; Vite emits hashed files under `dist/ui/assets` (no `data:` URLs, strict CSP intact). Favicon: `ui/public/favicon.svg` (Themis icon on a cream plate). |
| Dark theme | Raster logos sit on a cream plate and icons on a cream chip, both using `--k-color-plate`; padding is identical in both themes so toggling never shifts layout. |
| Tokens | `brand.gold|blue|ink|paper` become `--k-brand-*`; `color.plate` is new. `design/tokens.test.js` asserts the recorded contrast numbers and that no stylesheet uses a `--k-brand-*` colour for text, borders or outlines. |
| Guards | `apps/web/tests/pages/brand-images.test.js` (alt/width/height on key pages, loading strategy, favicon and OG wiring), `scripts/tests/naming.test.js` (the old misspelt organisation name must not return outside historical plans), dashboard `static-ui.test.ts` (icons emitted as same-origin assets). |

## Outside design review (2026-10-12)

| Review point | Adopted |
|---|---|
| Decisive primary CTA | Hero: "Try it in 2 minutes" (`/quickstart`) and "Browse all 24 skills"; "Choose your path" stays as home section 02 and `/paths`. The header and menu CTA also lead to `/quickstart`. `/quickstart` shows the two paths that work today, with real output: the skill's scope lines read from its file, and `list_skills` / `get_skill` captured by running `packages/aegis/mcp/server.js` in-process at build time (`lib/captured-mcp.js`); illustrative text is labelled. |
| Auditable trust claims | `/trust` renders `docs/trust/data-flow.md` (single source) with an accessible two-layout SVG diagram (`components/FlowDiagram.js`, token classes `.fd-*`, numbered arrows plus a text list). Linked from the footer Trust column, mobile menu, `/security` and the docs hub. `tests/guard/trust-claims.test.js` pins the cited code facts. The font statement is one sentence in the markdown: the site loads web fonts from Adobe Fonts, with Red Hat Mono self-hosted. |
| Small-screen readability | No `font-size` below 12px in `globals.css` (15 declarations raised), prose and descriptions 15px, mono labels 13px and 44px nav/button/pill targets under 761px or on touch. `tests/guard/readability-css.test.js` parses the stylesheet and fails on regressions (empty allow-list). |
| Aegis vs Themis | Home: one sentence on each pack card and a five-step worked example (`components/AegisThemisFlow.js`; a list that becomes a vertical timeline on phones; revealed with the existing `data-reveal` system, so no motion under reduce). |
| Versioning and authorization | Home section "Provenance and approval" and `/themis#provenance`: a real stamp (`lib/version-stamp-sample.js` reads the inputs `versionStamp()` reads) and the approval boundary, limited to what code and tests verify. |

## Token delivery decisions

- Site: build-time copy, not a committed copy. It cannot drift by hand, and it relies on the assumption `build-downloads.js` already makes on Vercel (the whole repository is checked out even with Root Directory = `apps/web`); nothing imports `../../design` at runtime. If a deploy ever builds with only `apps/web`, `sync-design-tokens.js` fails loudly with an explanatory message instead of shipping unstyled pages. Running `npx next build` directly (without npm's `prebuild`) fails on the missing generated file; use `npm run build`.
- Dashboard: direct import through the `@design` alias at `vite build` time. The CSS is emitted as a hashed file in `dist/ui/assets`, so no inline styles and nothing fetched at runtime.

## Fonts

- Site: Adobe Fonts kit `pww4pkx` (teimer-web 300 headings, legitima 500 body) plus self-hosted Red Hat Mono (400 and 500, OFL) from `apps/web/public/fonts`. CSP allows `use.typekit.net` and `p.typekit.net` only. Details, fallbacks, the FOIT note and the domain check (no setup needed) are in [FONTS.md](FONTS.md). Type scale tuned: display tracking -0.025em, display line height 1.1, body line height 1.58, lining numerals.
- Dashboard: no font files are bundled (the Adobe licence does not cover bundling and the dashboard is offline under `font-src 'self'`). The token stacks name teimer-web, legitima and Red Hat Mono first and fall back to Georgia and the system monospace. Upgrade path for a fully local look: add Red Hat Mono woff2 (SIL OFL) under `ui/public/fonts/`, declare `@font-face` in `styles.css` pointing at `/fonts/...` (already allowed by `font-src 'self'` and served by `static.ts` as `font/woff2`).

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

- Foundation mark/accent still placeholders; naming resolved (Kairos Foundation). Argus has no assets here.
- No vector masters of the full Aegis and Themis artwork; the SVG icons are simplified (LOGOS.md). The legal copyright holder is the individual maintainer, Drupad Sachania (owner decision, 2026-10-13, superseding 2026-10-12); LICENSE, the package manifests and the marketplace owner all say so.
- Cmd/Ctrl+K command palette, docs right-hand TOC and prev/next cards, accordion and menu/drawer keyframes for the site are not built.
- Dashboard: context chips and write-target banner, Run terminal window with streamed output styling, secret-reveal pattern on Models & Keys, approval checkbox "I have read the exact command" for write/execute, deep-linkable filters, real self-hosted fonts.
- Syntax highlight palette for code windows (DESIGN open item 6).
- Screen-reader and keyboard walkthroughs are manual and were not run.

## Launch markers and basics (2026-10-12)

| Area | Adopted |
|---|---|
| Status pill | `components/StatusPill.js` renders an availability label: a soft tint (`--k-color-themis-soft` for "In development", `--k-color-aegis-soft` for "First release"), tokenised text colour, a 1 px currentColor border and a hollow or filled dot. It always carries a text label, so it is never colour-only; 12 px mono (13 px on small screens and touch), no motion. Used on the home Themis card and path rows, `/paths` rows, sections and install tabs, `/themis` (hero, "Where to get it", install), `/quickstart`. Data lives in `lib/install-commands.js` (`IN_DEV` next to `LATER`). No LIVE badges. |
| Terms page | `/terms` renders `docs/legal/terms.md` in the existing `.prose` style; HTML comments in the source never reach the page. |
| 404 | `pages/404.js`: page-head pattern plus a plain list of next steps. |
