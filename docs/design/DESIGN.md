# Kairos design language

One visual and interaction language for Kairos Foundation and its products: Aegis (open defensive-security skill pack, gold) and Themis (governed SOC agent, blue), plus whatever comes next. This document is the decision record; `design/tokens.json` is the machine-readable source; `docs/design/motion.md` specifies motion; `docs/design/research/*.md` holds the evidence from the four reference sites.

Status: v0.1, 2026-10-11. Light is the default theme; dark appears only when the user toggles it (owner decision; no OS-driven auto-dark). Inspiration only: we adopted ideas from Hermes Agent, Nous Research, Microsoft AI and The Humanist Review; we copy none of their images, logos, brand names, copy or proprietary fonts.

Naming: the organisation is **Kairos Foundation** (https://kairos-foundation.org/); the spelling was confirmed by the owner and is used everywhere in the repository.

## 1. Principles

| # | Principle | Why | In practice |
|---|---|---|---|
| 1 | **Warm paper, quiet ink** | Security tooling is anxious by default. A cream, serif-led, low-chroma surface signals care and independence, and reads for long sessions. | Cream page, ink text, accent colours used sparingly as fills and single-word emphasis, never as wallpaper. |
| 2 | **Serif for voice, mono for machinery** | Separates what people say (essays, headlines) from what the system does (commands, IDs, status). Borrowed from MAI/Humanist (serif + Red Hat Mono) and Hermes (condensed + mono labels). | Newsreader headings; Red Hat Mono for labels, paths, commands, timestamps; IBM Plex Sans for reading and dense UI. |
| 3 | **Trust is visible** | Both products promise governance and openness. The UI must show state, source and consent, not hide them. | Licence in footer, "approval needed" states with persistent (non-animated) markers, one most-severe banner, explicit write-target banners (Hermes dashboard idea). |
| 4 | **Motion explains; it never gates** | Reveals and transitions help orientation, but content must be readable without JS, without motion and at any zoom. | Motion tokens, reduced-motion layering, hidden-until-reveal only applied by JS. See `motion.md`. |
| 5 | **One system, two accents** | Aegis and Themis must feel like siblings under one Foundation, and a new product must be addable without redesign. | Shared neutrals, type, radii, motion; product = one accent family (fill, hover, ink, soft, on). |
| 6 | **Accessible by construction** | AA is cheaper in tokens than in audits. | Contrast pairs are asserted in `design/tokens.test.js`; focus ring, targets and reflow are part of components, not afterthoughts. |

## 2. Brand architecture

```
Kairos Foundation  (https://kairos-foundation.org/ ; GitHub org kairos-dev-kairos-ecl)
 |- Argus   sibling Kairos product (name only; nothing else is documented here)
 |- Aegis   gold   #E8B93C fill / #7A5600 ink     open defensive-security skill pack, site, docs, CLI
 `- Themis  blue   #2F4FD8                         governed SOC agent: plugin, standalone dashboard
```

**Greek theme.** The Kairos products are named after figures from Greek myth: Argus (the all-seeing watchman), Aegis (Athena's shield, here with the Gorgon at its centre) and Themis (the scales of order and law). A new product should keep the theme. The Foundation is "Kairos Foundation" (never "Kairo"); sites and packages say "A Kairos Foundation project".

- **Foundation tokens** (`--k-color-foundation*`) are a clearly marked PLACEHOLDER: neutral ink `#3A312B` on cream `#FEF9ED` (dark: cream `#F0E8D4` on `#020E1C`). The Foundation has no logo in this repository; do not invent one. When it exists, set the wordmark in Newsreader, ink colour, with product names in the product accent only as a dot/underline.
- **Product accents**: a product owns exactly five tokens: `X`, `X-hover`, `X-ink` (text-safe variant), `X-soft` (tint background), `on-X` (label colour on the fill). Aegis and Themis follow this; a new product must pass the same contrast pairs in `tokens.json` before merge.
- **Co-branding rule**: a surface has one dominant accent. The site shows Aegis gold as primary and Themis blue as link/secondary because blue is also the link colour; the Themis app uses blue as primary and gold only for Aegis-origin items (skills) and the "needs human" amber of warnings is NOT gold (warning is `#8A5A00` on `#FBEBC8`, see Colour).
- **Product logos** (owner artwork, 2026-10): the Aegis shield with the Gorgon head and the Themis scales. They replace the earlier placeholder diamond-and-disc mark. The asset inventory and how they were produced is in `docs/design/LOGOS.md`.

### 2.1 Logo usage rules

**Which asset where**

| Place | Asset | Size | Notes |
|---|---|---|---|
| Header, mobile menu | `aegis-icon.svg` + `themis-icon.svg`, with the "Aegis · Themis" text | 26 px | Decorative `alt=""`; the link has `aria-label`. |
| Footer, "A Kairos Foundation project" | the same two icons | 30 px | |
| Home pack cards | `aegis-mark-320.webp` / `themis-mark-320.webp` (srcset to 640) | 168 px (132 px on phones) | Lazy. Alt "Aegis mark" / "Themis mark". |
| `/themis` hero | `themis-lockup-640.webp` | 200-280 px (120 px on phones) | Eager, `fetchpriority="high"`. |
| `/skills`, skill pages, docs hub | small icon(s) in the eyebrow or breadcrumb | 20-22 px | A brand cue, not decoration to fill space. |
| Dashboard sidebar and top bar | Themis icon | 28 px | Imported as a hashed asset. |
| Dashboard Skills page | Aegis icon | 20 px | Cue that these are Aegis skills. |
| Browser tab | `favicon.svg` (Aegis shield on cream plate), `favicon.ico` fallback; dashboard: Themis icon on a cream plate | 16-48 px | |
| Link previews | `og.png` 1200x630 (both lockups, cream) | | |
| Print, large format | none yet | | Needs a designer's vectorisation first (LOGOS.md). |

**Rules**

1. **Light plate rule.** The artwork is drawn for light backgrounds; its brown ink (`#5D524B`) disappears on navy (2.56:1). On light surfaces show logos bare. In the dark theme every raster logo sits on a rounded cream plate (`--k-color-plate`, `#FEF9ED`, radius `lg`, 10 px padding) and every small icon on a cream chip (radius 8 px, 2 px padding). Padding is the same in both themes, so toggling the theme never shifts layout. Never place a logo bare on navy, on photos, or on a gradient.
2. **Clear space.** Keep at least 25 % of the logo's width free on every side (a mark 168 px wide needs 42 px). Plates and chips count as part of the logo.
3. **Minimum sizes.** Raster mark or lockup: 96 px wide. Simplified icon: 16 px (the favicon uses its own simplified shield). Below that, use the favicon shield or the product name in text.
4. **Pair order.** Aegis first, Themis second; Aegis on the left or above.
5. **One of each.** Do not repeat the same logo twice in one view; the header icons, a card mark and the footer icons are different roles, but a page should not add a fourth.
6. **Motion.** Logos get the standard subtle reveal (or none). No continuous animation, parallax, spin or glow, and nothing that moves under `prefers-reduced-motion`.
7. **Sizes are explicit.** Every `<img>` has `width`, `height` and `alt` (empty `alt` only for icons that sit beside the product name). Below the fold: `loading="lazy"`.

**Do not**

- Recolour, tint, outline or put effects (shadow, glow, gradient overlay) on the artwork.
- Stretch, rotate or crop it; keep the aspect ratio.
- Use gold `#D4AF37` or logo blue `#0080FF` for text, links or thin UI strokes (2.0:1 and 3.6:1 on cream). They are artwork colours only.
- Redraw the logos or substitute the simplified icons for the full artwork at large sizes.
- Re-add the retired diamond-and-disc mark.
- Combine either logo with the Foundation name in a single lockup; the Foundation has no logo yet. Credit it in text.

### 2.2 Logo colours versus UI tokens

The logo colours are exposed as `--k-brand-gold|blue|ink|paper` (`brand.*` in `design/tokens.json`) for fills and artwork. UI accents are different tokens on purpose: contrast. `design/tokens.test.js` records the numbers and fails if a stylesheet uses a `--k-brand-*` colour for text, borders or outlines.

| Logo colour | Hex | Contrast on cream plate | Rule | UI token used for the same job |
|---|---|---|---|---|
| Gold | `#D4AF37` | 2.00 : 1 (1.98 on logo paper) | fill / artwork only | `aegis` `#E8B93C` for fills (with `on-aegis` text, 6.0 : 1), `aegis-ink` `#7A5600` for gold-toned text (6.3 : 1) |
| Blue | `#0080FF` | 3.61 : 1 (3.58 on logo paper) | fill / artwork only; below 4.5 : 1 for text | `themis` `#2F4FD8` for text, links, fills (6.2 : 1) |
| Ink | `#5D524B` | 7.21 : 1 (7.13 on logo paper) | text-safe on light; equals the `text-muted` token | `text-muted` |
| Paper | `#FAF8F3` | 1.01 : 1 | highlight inside icons | `bg` / `plate` `#FEF9ED` |

Why the UI accents differ: the artwork was designed as an image, where the eye reads shape and the gold or bright blue only needs to look good. UI text must reach 4.5 : 1 (WCAG 1.4.3) and controls 3 : 1 (1.4.11). The logo gold is 2.0 : 1 and the logo blue 3.6 : 1 on our cream, so using them for links or labels would fail. The UI accents keep the same hue family but shift lightness to pass; the two are never swapped.

## 3. Colour

Semantic tokens only in components (`var(--k-color-*)`); never hex in component CSS. Light is `:root`; dark is `:root[data-theme="dark"]`.

### 3.1 Tokens

| Token | Light | Dark | Role |
|---|---|---|---|
| `bg` | `#FEF9ED` | `#020E1C` | page |
| `surface` | `#F7F1E3` | `#051A2E` | cards, panels, sidebar |
| `surface-raised` | `#F7ECD9` | `#0A2540` | hover rows, wells, secondary buttons |
| `text` | `#3A312B` | `#F0E8D4` | headings, strong |
| `text-muted` | `#5D524B` | `#C9C0AB` | body, secondary |
| `text-subtle` | `#6E6259` | `#9A9384` | captions, metadata |
| `border` | `#8C7F73` | `#6F7F92` | control borders (input, checkbox) |
| `line` | `#D9CFBA` | `#1E3148` | decorative hairlines only |
| `foundation` / `on-foundation` | `#3A312B` / `#FEF9ED` | `#F0E8D4` / `#020E1C` | PLACEHOLDER |
| `aegis` / `-hover` / `-ink` / `-soft` / `on-aegis` | `#E8B93C` / `#F0C752` / `#7A5600` / `#F6E7B8` / `#3A312B` | `#E3BD48` / `#EFCB5A` / `#E3BD48` / `#1D2321` / `#020E1C` | gold family |
| `themis` / `-hover` / `-soft` / `on-themis` | `#2F4FD8` / `#243FB8` / `#E4E9FA` / `#FFFFFF` | `#9C9AF0` / `#B3B1F6` / `#18223A` / `#020E1C` | blue family |
| `link` | `#2F4FD8` | `#9C9AF0` | links |
| `focus` | `#2F4FD8` | `#E3BD48` | focus ring |
| `success` / `-bg` | `#1B6B3A` / `#E3F1E6` | `#6FCF8A` / `#0E2A1A` | |
| `warning` / `-bg` | `#8A5A00` / `#FBEBC8` | `#E3B341` / `#2B2208` | |
| `danger` / `-bg` | `#B42318` / `#FBE3DF` | `#FF8A80` / `#341514` | |
| `nav-bg`, `overlay`, `shadow-ink` | rgba values | rgba values | translucent surfaces |
| `code-bg` / `code-text` | `#2A241F` / `#F0E8D4` | `#0A1626` / `#F0E8D4` | terminal window is dark in both themes |
| `plate` | `#FEF9ED` | `#FEF9ED` | cream behind logos, identical in both themes |
| `brand.gold` / `.blue` / `.ink` / `.paper` (`--k-brand-*`) | `#D4AF37` / `#0080FF` / `#5D524B` / `#FAF8F3` | same | logo artwork colours: fills and art only, see 2.2 |

### 3.2 Contrast (computed; asserted by `design/tokens.test.js`)

| Pair | Light | Dark | Target |
|---|---|---|---|
| text / bg | 12.08 | 15.89 | >= 7 |
| text / surface | 11.27 | 14.41 | >= 7 |
| text / surface-raised | 10.85 | 12.72 | >= 7 |
| text-muted / bg | 7.21 | 10.73 | >= 4.5 |
| text-muted / surface | 6.72 | 9.73 | >= 4.5 |
| text-muted / surface-raised | 6.47 | 8.59 | >= 4.5 |
| text-subtle / bg | 5.62 | 6.36 | >= 4.5 |
| text-subtle / surface | 5.25 | 5.76 | >= 4.5 |
| border / bg (non-text) | 3.70 | 4.74 | >= 3 |
| border / surface (non-text) | 3.45 | 4.29 | >= 3 |
| on-aegis / aegis | 6.91 | 10.76 | >= 4.5 |
| on-aegis / aegis-hover | 7.86 | 12.35 | >= 4.5 |
| aegis-ink / bg | 6.33 | 10.76 | >= 4.5 |
| aegis-ink / surface | 5.90 | 9.75 | >= 4.5 |
| aegis-ink / aegis-soft | 5.40 | 8.85 | >= 4.5 |
| on-themis / themis | 6.50 | 7.66 | >= 4.5 |
| on-themis / themis-hover | 8.47 | 9.74 | >= 4.5 |
| themis (text) / bg | 6.19 | 7.66 | >= 4.5 |
| themis (text) / surface | 5.77 | 6.95 | >= 4.5 |
| themis / themis-soft | 5.37 | 6.24 | >= 4.5 |
| focus / bg | 6.19 | 10.76 | >= 3 |
| focus / surface | 5.77 | 9.75 | >= 3 |
| success / bg, / success-bg | 6.23, 5.60 | 10.14, 8.04 | >= 4.5 |
| warning / bg, / warning-bg | 5.64, 5.03 | 9.97, 8.08 | >= 4.5 |
| danger / bg, / danger-bg | 6.26, 5.37 | 8.50, 7.28 | >= 4.5 |
| on-foundation / foundation | 12.08 | 15.89 | >= 7 |
| code-text / code-bg | 12.55 | 14.88 | >= 7 |
| **aegis (gold) / bg** | **1.75** | 10.76 | documented anti-rule (light) |

### 3.3 Rules

1. **Gold is a fill, never text, on cream.** `aegis` on `bg` is 1.75:1. Gold text on light uses `aegis-ink` (6.33:1). In dark the gold passes (10.76:1) so `aegis-ink` equals `aegis`.
2. A gold button is gold fill + `on-aegis` label (6.91:1). Because the fill alone is 1.75:1 against the page, never rely on the fill to show a control exists: add the label, and use the 3 px/5 px ring on focus. Secondary buttons use `border` (3.70:1) outlines.
3. **Blue carries meaning**: link, selected, focus (light), Themis identity. Do not use `themis` for decoration next to links.
4. **Never convey state by colour alone.** Status chips pair colour with a text label and an icon/glyph (see components).
5. Use `line` for dividers only; any border that identifies a control must use `border` (>= 3:1).
6. Section rhythm: alternate `bg` and `surface` bands (or `surface-raised` for emphasis), as Humanist and Hermes alternate full-bleed tints, instead of drawing borders between sections.
7. Shadows are low-chroma ink (`shadow-ink`), small; depth is mostly tint + 1 px `line`.
8. Terminal/code windows are dark in both themes (`code-bg`); syntax colours must reach 4.5:1 on `code-bg`.
9. Light is the default. Do not read `prefers-color-scheme` to choose a theme. The toggle writes `data-theme` and `localStorage`; first paint script reads storage only.

## 4. Typography

| Role | Family | Open-source fallback stack | Notes |
|---|---|---|---|
| Display / headings / essays | **Newsreader** (variable, optical size) | Iowan Old Style, Palatino Linotype, Georgia, serif | italic for single-word emphasis (accent colour allowed, e.g. `themis`) |
| UI and reading | **IBM Plex Sans** | system-ui, -apple-system, Segoe UI, Roboto | body 16 px; dashboard 14 px |
| Machinery | **Red Hat Mono** | ui-monospace, SFMono-Regular, Menlo, Consolas | labels, code, commands, IDs, timestamps |

All three are open (SIL OFL). Reference sites use proprietary faces (Rules Gothic / Aeonik / Bradford LL); we do not. The closest open equivalents we considered: Big Shoulders Display or Antonio (condensed display, only if we ever want a Hermes-like poster face), EB Garamond/Source Serif 4 (Bradford-like). Decision: keep Newsreader.

| Style | Token (`--k-text-*`) | Size | Line height | Tracking | Weight |
|---|---|---|---|---|---|
| Display XL (hero) | `display-xl` | clamp(2.75rem, 1.6rem + 5.2vw, 5.5rem) | 1.04 | -0.02em | 400 |
| Display | `display` | clamp(2.25rem, 1.5rem + 3.4vw, 3.75rem) | 1.04 | -0.02em | 400 |
| H2 | `h2` | clamp(1.75rem, 1.3rem + 1.8vw, 2.5rem) | 1.15 | -0.01em | 400-500 |
| H3 | `h3` | clamp(1.375rem, 1.2rem + 0.8vw, 1.75rem) | 1.15 | -0.01em | 500 |
| H4 | `h4` | 1.25rem | 1.4 | 0 | 600 (sans) |
| Body L | `body-l` | 1.125rem | 1.6 | 0 | 400 |
| Body | `body` | 1rem | 1.6 | 0 | 400 |
| Small | `small` | 0.875rem | 1.4 | 0 | 400 |
| Label (mono, uppercase) | `label` | 0.75rem | 1.4 | +0.08em | 500 |
| App body | `app-body` | 0.875rem | 1.4 | 0 | 400 |
| Code | `app-small`/0.8125rem | | 1.5 | 0 | 400 |

Rules: rem + `clamp()` only (never `vw` alone: WCAG 1.4.4 and reflow; the reference sites' pure-vw type fails zoom). Minimum size 12 px (Hermes goes to 9-10 px: not adopted). Prose measure 60-72 characters (`--k-layout-prose: 42.5rem` on a 16 px body is about 68 ch). Labels: uppercase mono, tracking +0.08em max (Humanist's +0.19em reads slowly). Headings sentence case; product names capitalised. Numerals in tables use `font-variant-numeric: tabular-nums`. Do not fake bold on Newsreader below weight 400.

## 5. Spacing, radius, elevation

- Spacing is a 4 px base: `space-1..10` = 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 px; fluid `space-gutter` = clamp(20px, 4vw, 48px), `space-section` = clamp(64px, 8vw, 128px).
- Radius scale: `xs` 4, `sm` 8, `md` 12, `lg` 20, `xl` 28, `2xl` 36, `pill` 999. Site cards use `xl` (28), hero/feature panels `2xl` (36), inputs and buttons in the app use `sm`/`md` (8/12), chips and primary CTAs `pill`. Hermes' 3 px and MAI's 0 px squareness are not adopted: softness is part of the warm editorial tone.
- Elevation is mostly flat: level 0 (page), level 1 `surface` + `line` hairline, level 2 `shadow-sm`/`md` for menus, level 3 `shadow-lift` for hover and dialogs. No stacked glows. `shadow-ring` (3 px bg gap + 2 px focus colour) is the focus/hover ring for media cards (Humanist double ring).

## 6. Layout

| Context | Container | Columns | Notes |
|---|---|---|---|
| Marketing / docs site | 1200 px (`layout-container` 75rem) + `gutter` | 12-col, gap 24 px (>= 1024), 4-col mobile | hero 2 columns (copy / art) collapse at 768 px (Hermes breaks at 767) |
| Prose | 680 px (`layout-prose`) | single | docs articles, essays |
| Docs | sidebar 280 px (`sidebar-docs`) + prose + optional 220 px TOC | 3-col at >= 1280 | sidebar collapses to drawer < 1024 |
| Themis dashboard | sidebar 240 px (`sidebar`) + content up to 1280 px (`container-app`) | 12-col content grid | density: 14 px body |

Breakpoints (mobile-first, `min-width`): `sm` 480, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536 (tokens `layout-bp-*`; CSS media queries need literals, keep them in sync). Reflow: no horizontal scroll at 320 CSS px (WCAG 1.4.10). Sections vertical rhythm = `space-section`. Target size >= 44 px (`layout-target-min` 2.75rem) for touch; >= 24 px minimum anywhere (WCAG 2.5.8).

## 7. Navigation

### 7.1 Site top bar
- Sticky, height 64 px (`layout-nav-height`), `nav-bg` (78 % paper) with `backdrop-filter: blur(12px)` (Hermes docs navbar uses blur 12 and a hairline), 1 px `line` bottom border that fades in after 8 px of scroll (`data-scrolled`).
- Left: mark + wordmark. Centre/right: Skills, Paths, Themis, Docs, search (Cmd/Ctrl+K opens the command palette; the Nous composer idea), theme toggle (sun/moon, `aria-pressed`), primary CTA (Install, gold pill).
- Active page: `aria-current="page"`, text colour `text` + a 2 px underline (not colour alone). Hover: underline wipe 240 ms. Optional pill-nav indicator for the 3-4 primary items (motion.md 4.7).
- Mobile (< 768 px): logo left, 44 px menu button right (`aria-expanded`, `aria-controls`); panel = full-width sheet from the top, 360 ms decelerate in / 240 ms out; focus trapped; Escape closes; page behind inert.
- Skip link first in DOM (`skip` z-index), visible on focus.

### 7.2 Docs
- Left sidebar tree (280 px) with current section expanded, active item = `surface-raised` pill + `aria-current`; right "On this page" TOC with scroll-spy (colour + 2 px bar, no motion required). Breadcrumbs above H1. Previous/next cards at the foot. Copy button on every code block (icon swap 200 ms, tick with 75 ms delay as Docusaurus does). Search (Cmd+K) lists skills and docs. Docs use the same top bar, no separate header chrome.

### 7.3 App dashboard shell (Themis)
- Left rail 240 px: product mark, nav list, bottom "environment" block (build/version stamp, mode, API origin). Collapses to a 64 px icon rail at < 1024 px and to a top bar + drawer at < 768 px.
- Top strip inside content: page title (Newsreader H2), context chips (profile/tenant/environment), a single banner slot (see 8.9). The write-target banner pattern from Hermes is mandatory whenever the active target is not the default.
- Active item: `themis-soft` fill + 2 px left bar + `aria-current`; counts (pending approvals) as `warning` pill with the number, never colour alone.
- Deep-linkable state in the URL (profile, filters, selected run), as Hermes does with `?profile=`.

## 8. Components

Radii/colours refer to tokens. All interactive components: min target 44 x 44 (touch) / 24 x 24, visible `:focus-visible` ring (`outline: 2px solid var(--k-color-focus); outline-offset: 3px`), hover only within `(hover:hover)`.

| # | Component | Spec |
|---|---|---|
| 8.1 | **Buttons** | Primary (product): fill = accent, label `on-*`, 3 em height pill (site) / 36 px radius `md` (app); label Red Hat Mono 500 14 px, optional arrow glyph that shifts 3 px on hover. Secondary: 1 px `border` outline, transparent, label `text`. Ghost: text-only with underline wipe. Destructive: `danger` outline; confirm in dialog. Disabled: 50 % opacity + `aria-disabled`, still readable (text >= 3:1 is not required for disabled but label must remain legible). States: hover colour 150 ms, active press 80 ms. Loading: label stays, braille spinner replaces icon, `aria-busy`. |
| 8.2 | **Pills / chips** | Pill radius, mono 12 px label, `surface-raised` background, `line` border. Filter chips toggle `aria-pressed` and gain `themis-soft` + check glyph. Status chips: see 8.9. |
| 8.3 | **Cards** | `surface`, radius `xl` (site) / `md` (app), 1 px `line` hairline, padding 24-32 px (site) / 16-20 px (app), title Newsreader h3, meta in mono label. Hover (fine pointer): lift 3 px + shadow-lift, 240 ms smooth; media cards: image zoom 1.04 + double ring (600 ms). Whole-card link with one real `<a>` (stretched pseudo-element), not nested links. |
| 8.4 | **Rows / lists** | 56 px (site) / 40 px (app) rows, bottom `line`, hover `surface-raised` (150 ms), leading mono ID or number (Hermes "#1 CONNECT" eyebrow idea), trailing chevron or status chip. Selected row = `themis-soft`. Sortable headers with `aria-sort`. |
| 8.5 | **Code / terminal window** | `code-bg`, radius `lg`, 1 px line at 12 % `code-text`, title bar with three neutral dots (decorative, `aria-hidden`), mono 14 px/1.5, copy button top-right (44 px target), command prompt `$` in gold `#E3BD48` (8.5:1 on light `code-bg`), selectable text, horizontal scroll not wrap for commands (wrap for logs). OS switcher as segmented control (Hermes install box idea). Spinner glyph for running. Max-height with inner scroll (`tabindex=0`, labelled region). |
| 8.6 | **Callouts** | Left 3 px bar + tinted `-soft`/`-bg` + icon + bold lead word ("Note", "Warning", "Security"); never colour alone. Types: info (`themis-soft`), tip (`aegis-soft`), warning, danger. |
| 8.7 | **Tables** | Header mono label row on `surface`, rows `line` separators, 16 px cell padding (site) / 10 x 12 (app), numerals tabular, zebra off (use hover), sticky header in scroll containers, responsive: wrap in `overflow-x:auto` region with `tabindex=0` and caption; on < 480 px key tables become stacked cards. |
| 8.8 | **Forms** | Label above (Plex Sans 600 14 px), helper text `text-subtle`, 44 px inputs (app 36 px with 44 px tap area on touch), `border` 1 px (3.70:1), radius `sm`/`md`, focus = ring + `border` darkens to `text`; error = `danger` border + icon + message linked with `aria-describedby`; required = text "(required)" not just asterisk. Switches: 40 x 24, thumb moves 150 ms, label states On/Off. Secrets (API keys) masked with reveal toggle and "stored in OS keychain" helper copy. |
| 8.9 | **Status and approval states (Themis)** | See table below. |
| 8.10 | **Banners** | One at a time, most severe wins (Hermes order: critical > elevated; dismiss scoped to the session/boot; escalation reopens). Colours `warning-bg` / `danger-bg` / `themis-soft` with icon and `role="status"` (info) or `role="alert"` (danger). The amber "write target" banner is persistent, not dismissible, while active. |
| 8.11 | **Dialogs, menus, toasts** | Dialog: centred, radius `xl`, overlay token, focus trap, Escape, restore focus; destructive confirm names the object. Menu: radius `md`, shadow-md, roving tabindex. Toast: bottom-right, 5 s default, 8 s with action, `aria-live=polite`, pause on hover/focus, not for errors that need action. |
| 8.12 | **Empty / loading / error** | Skeleton = `surface-raised` blocks pulsing to 55 % (1.4 s). Empty state: serif line + one-sentence next step + primary action. Error: what happened, what we did, what to do; never a raw stack trace. |

### 8.9 Status and approval states (Themis dashboard)

All chips: mono 12 px, pill, icon + label, 1 px current-colour border, background from `*-bg`.

| State | Label | Colour | Glyph | Extra |
|---|---|---|---|---|
| `running` | Running | `themis` on `themis-soft` | braille spinner (text fallback "...") | `aria-live=polite` count |
| `pending` / `queued` | Pending | `text-muted` on `surface-raised` | hollow circle | |
| `awaiting_approval` | Needs approval | `warning` on `warning-bg` | hand/pause | persistent 2 px ring + attention pulse x3 on first appear; counted in the nav badge |
| `needs_reproposal` / `stale` | Re-propose | `warning` | refresh | |
| `approved` | Approved | `success` on `success-bg` | check | shows approver + timestamp (mono) |
| `completed` / `executed` | Completed | `success` | check-circle | |
| `rejected` | Rejected | `danger` on `danger-bg` | x-circle | reason shown |
| `failed` | Failed | `danger` | triangle | link to log |
| `not_executed` / `not_run` | Not run | `text-subtle` | dash | |
| `write` / `execute` capability tags | Write / Execute | `danger` / `warning` | pencil / terminal | shown before approval, never hidden |

Approval card (the heart of Themis): title (what), mono diff/command block (exact), scope chips (target, tool, capability), reason and evidence, then actions. Order: Approve (primary themis), Reject (secondary), Ask for changes (ghost). No timers or dark patterns: for `write`/`execute` capabilities Approve additionally requires an explicit "I have read the exact command" checkbox. Keyboard: A/R shortcuts are optional and always paired with visible buttons.

## 9. Motion (summary)

Durations 80 / 150 / 240 / 360 / 600 / 720 ms and stagger 60 ms; easings standard, decelerate, accelerate, smooth `(.22,1,.36,1)`, arrival `(.16,1,.3,1)`, fold `(.65,0,.35,1)`. Enter = decelerate, exit = accelerate and shorter. Everything that moves sits inside `prefers-reduced-motion: no-preference`; hover effects also inside `(hover:hover) and (pointer:fine)`; tokens collapse to 0.01 ms under reduce. Content is never hidden by CSS alone. Full spec, snippets, and checklist: `docs/design/motion.md`.

## 10. Imagery and illustration

- Illustration style: warm, flat, paper-cut shapes in the palette (cream, gold, blue, ink), geometric (diamonds, discs, arcs) echoing the brand mark; thin ink outlines optional. Reference: MAI/Humanist's cropped warm illustrations; we do not reuse any.
- Diagrams: mono labels, 1.5 px strokes, `line`/`border` colours, accent only for the one thing the diagram argues. Every diagram has a text equivalent.
- Hero art: abstract, vector, CSS or SVG; no stock photos of hooded hackers, padlocks, glowing shields or matrices. Photography, if used, is documentary and warm-graded with an alt text that says what it shows.
- Screenshots of the dashboard sit in a terminal-style frame (radius `lg`, 1 px line), cropped to the point being made, light theme default.
- Icons: 24 px grid, 1.7 px rounded stroke (as the current `Icon` component), `currentColor`. Decorative icons `aria-hidden`; meaningful icons have a text label.
- Image motion: monochrome-to-colour reveals (Nous) are not used for content; if used for editorial art keep <= 600 ms.

## 11. Voice and microcopy

- Plain, direct, specific. Short sentences. We say what the tool does and does not do. Humble about limits, firm about governance ("Themis never runs a write action without your approval").
- Headlines: sentence case, concrete nouns and verbs ("Defence you can read, run and audit"); avoid fear, war metaphors and hype ("military-grade", "AI-powered", "unleash").
- Eyebrows: numbered verbs in mono caps are allowed ("#1 CONNECT"), max 2 words.
- Buttons: verb + object ("Install Aegis", "Approve action", "Copy command"). Avoid "Submit", "OK".
- Errors: cause, effect, next step. "Could not reach the gateway at 127.0.0.1:7777. Nothing was changed. Check that Themis is running, then retry."
- Empty states invite one action. Confirmation dialogs name the object. Time is relative in UI with absolute on hover/title (mono).
- Licence and openness are stated wherever they matter: "Apache-2.0 or MIT".
- Locale: British spelling in docs where already used (defence) unless the file says otherwise; be consistent per page.

## 12. Accessibility (WCAG 2.2 AA, specifics)

| Criterion | Requirement here |
|---|---|
| 1.4.3 / 1.4.6 contrast | Text >= 4.5:1 (body, muted, subtle all pass), headings >= 7:1; enforced by tests |
| 1.4.11 non-text contrast | Control borders (`border`) >= 3:1; focus ring >= 3:1 against both adjacent colours; icon-only buttons >= 3:1 |
| 1.4.4 / 1.4.10 | rem/clamp type; no horizontal scroll at 320 px or 400 % zoom; line reveal clips must not cut descenders |
| 1.4.12 text spacing | Components survive 1.5 line-height, 0.12em letter-spacing, 0.16em word-spacing overrides (no fixed-height text boxes) |
| 1.4.13 hover/focus content | Tooltips dismissible (Esc), hoverable, persistent |
| 1.4.1 use of colour | Status always has label + glyph |
| 2.1.1 / 2.1.2 keyboard | All functions via keyboard; no traps; Cmd/Ctrl+K palette focus-managed |
| 2.4.1 / 2.4.7 | Skip link; focus always visible |
| 2.4.11 focus not obscured | Sticky nav 64 px: use `scroll-padding-top: 5rem`; focus ring outside sticky overlap |
| 2.4.13 focus appearance (AAA, adopted) | 2 px ring, offset 3 px, 3:1 |
| 2.5.7 dragging | Every drag has a click alternative |
| 2.5.8 target size | >= 24 px minimum, 44 px on touch (our default) |
| 3.2.6 consistent help | Help/docs link in the same place in site and app chrome |
| 3.3.7 redundant entry / 3.3.8 accessible authentication | No re-asking for data in a flow; paste allowed in token/key fields; no cognitive tests |
| 2.2.2 / 2.3.3 motion | Auto-playing motion > 5 s has a pause (spinners excluded); reduced motion honoured (motion.md section 2) |
| 4.1.3 status messages | Toasts and banners use `role=status/alert`; approval counts announced politely |
| Theme | Both themes pass the same contrast table; theme toggle has `aria-pressed` and persists |
| Testing | Keyboard pass, 200/400 % zoom, reduced-motion, screen reader (NVDA + VoiceOver) smoke test on each release |

## 13. Applying the language

### 13.1 Marketing and docs site (`apps/web`)
- Replace hand-written colours in `apps/web/styles/globals.css` by `design/tokens.css` variables (name map: `--bg` -> `--k-color-bg`, `--surface` -> `--k-color-surface`, `--text` -> `--k-color-text`, `--aegis` -> `--k-color-aegis`, `--themis` -> `--k-color-themis`, `--radius-card` -> `--k-radius-xl`, `--ease` -> `--k-ease-standard`). Keep existing look; values are unchanged for light.
- Remove the `@media (prefers-color-scheme: dark)` block and `matchMedia` fallback in `Layout.js` `currentTheme()` so dark only appears via the toggle (owner decision). Not done in this task (no product code changed).
- Add: reveal on scroll for hero lines and feature cards (motion.md 4.1-4.3), sticky blur nav (4.6), card hover lift, link underline wipe, Cmd+K search, route fade (4.13), theme crossfade (4.8).
- Footer must keep licence line and Foundation link.

### 13.2 Themis dashboard (`packages/themis-app/ui`, React + Vite)
Currently a neutral grey/blue system-font UI (`src/styles.css`, 63 lines) with an OS-driven dark block. Moving it to Kairos:
1. Import `design/tokens.css` (copy at build, or alias `@kairos/tokens`) at the top of `styles.css`; map `--bg/--fg/--card/--border/--accent` to tokens (`--k-color-bg/text/surface/border/themis`). Remove the `prefers-color-scheme` block; add the same `data-theme` toggle and first-paint script.
2. Fonts: self-host Newsreader (headings only), IBM Plex Sans (body 14 px), Red Hat Mono (labels, IDs, code). No third-party font CDN at runtime in a local-first app: bundle woff2 with the UI.
3. Shell: 240 px rail (`.nav`) on `surface` with `themis-soft` active item, instead of the near-black rail; top strip with page title and context chips; single banner slot.
4. Components: map `.badge-*` to the status table 8.9 (add icons and labels), `.card` to 12 px radius + hairline, `.pre` to the terminal window 8.5, `button.primary` to `themis` fill with `on-themis`, `.error`/`.warn` to banners with icons.
5. Motion: only 150 ms hovers, 240 ms indicator/underline, 360 ms drawer, braille spinner for `running`, attention pulse x3 for `awaiting_approval`, 150 ms content fade between routes. No scroll reveals in the app.
6. Pages (`Approvals`, `Run`, `Sessions`, `Skills`, `Mcp`, `Models`, `Reports`, `Settings`): Approvals is the home screen (count in nav), Run shows a terminal window with streamed output and phase chips, Settings uses the form spec and the "stored in OS keychain" secret pattern.
7. Local-first cues borrowed from the Hermes dashboard: show "127.0.0.1:port - nothing leaves this machine" in the rail footer; auto-refresh status every 5 s with a visible "updated Ns ago".
8. Do not copy Hermes' brand blue, frame glow or condensed type; Themis blue stays `#2F4FD8`.

### 13.3 Future Kairos products
Add an accent family to `tokens.json` (5 tokens x light/dark + contrast pairs), pick its role (primary on its own surfaces, secondary elsewhere), reuse type/shape/motion untouched. A product needs: wordmark in Newsreader, one accent, one signature motif (Aegis: gold diamond; Themis: blue disc), and a docs section using the docs shell.

## 14. Hermes-inspired: what we adopted and why

| Hermes idea | Adopted as | Why |
|---|---|---|
| Token-layered motion with strict gating (`reduce` kills; `(hover:hover)`; infinite loops only on fine pointer) | Motion section 2, tokens collapse under reduce | Most robust reduced-motion model of the four sites |
| 150 ms colour hovers, 220 ms underline growth, 360 ms menus, shorter exits | `--k-dur-*` scale | Fast enough to feel instant, slow enough to read |
| Terminal motifs: install box with OS switcher + copy, braille spinner, cursor blink | Code window 8.5, spinner glyph | Fits a security-engineer audience; communicates "real tool" without cliches |
| Attention pulse that plays 3 times then rests | `awaiting_approval` marker | Draws the eye without perpetual animation |
| Single most-severe banner, scoped dismissal, amber "managed target" banner | Banner rule 8.10 | Prevents "where will this write?" mistakes; central to Themis governance |
| Numbered verb eyebrows ("#1 CONNECT"), uppercase tracked mono labels | Eyebrows and labels | Cheap hierarchy, consistent chrome |
| Dashboard IA: Status, Sessions, Logs, Skills, MCP, Config, Webhooks; auto-refresh 5 s; deep-linkable profile | Themis shell and URL state | Proven information architecture for an agent control surface |
| Local-first posture, auth required off-loopback | Rail footer cue and docs | Matches Themis's security story |
| Docs: sticky blurred navbar with accent-tinted hairline, copy buttons with icon swap | Nav 7.1/7.2 | Familiar and legible |
| Route fade via View Transitions (250 ms) | motion 4.13 | Progressive, zero-JS |
| Hairline-first separation | `line` hairlines plus tint bands | Calm density |
| NOT adopted | Electric blue, viewport frame glow, three.js hero, condensed display type, 0.5 px/3 px hard geometry, 9-10 px type | Off-tone, costly, or inaccessible |

## 15. Open items and decisions to confirm

1. Foundation accent and logo are placeholders (neutral ink). Needs the owner. Aegis and Themis now have owner-supplied logos; Argus has none in this repository.
2. ~~Foundation name spelling and domain~~ Resolved: Kairos Foundation, kairos-foundation.org. The legal copyright holder is also settled (owner decision 2026-10-12): Kairos Foundation.
3. Font hosting: self-host woff2 (recommended) vs Google Fonts; check current `_document.js`.
4. Tokens are not yet consumed by `apps/web` or `themis-app/ui`; adoption is a follow-up task.
5. Screenshots for this research were taken at narrow pane width; desktop-only behaviours (e.g. hover states, sticky sections on Hermes/MAI) were read from CSS and are not verified visually.
6. Syntax-highlight palette for `code-bg` is not yet defined; must meet 4.5:1.

## 16. Files

- `design/tokens.json`, `design/tokens.css` (generated), `design/build-tokens.js`, `design/tokens.test.js`, `design/jest.config.js`
- `docs/design/DESIGN.md` (this), `docs/design/motion.md`, `docs/design/LOGOS.md` (logo asset inventory)
- `design/brand/source/` (full-resolution logo masters, not served)
- `docs/design/research/{hermes-agent,nousresearch,microsoft-ai,humanistreview}.md`

Regenerate tokens: `node design/build-tokens.js`; verify: `npx jest design`.
