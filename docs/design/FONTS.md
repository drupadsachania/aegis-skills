# Fonts

How the Aegis + Themis site (and the shared design tokens) get their typefaces. Source of truth for the stacks is `design/tokens.json` (`font.family.*`); the site loads the faces in `apps/web/pages/_document.js` and `apps/web/styles/globals.css`.

## Kit and families

Adobe Fonts (Typekit) web project, loaded as one stylesheet:

```
https://use.typekit.net/pww4pkx.css
```

The kit defines these families. Only the first two are used.

| Family (CSS name) | Weights in the kit | Used for | Weights used |
|---|---|---|---|
| `teimer-web` | 300, 300 italic, 600, 600 italic | Display and headings (`--k-font-display`) | 300 for headings; 300 italic for the accent phrase (`<em>`); 600 only for small strong headings (for example workflow step titles) |
| `legitima` | 500, 500 italic | Body and long text (`--k-font-body`) | 500 and 500 italic only |
| `aquavit` | 400 | not used | none |
| `nimbus-roman` | 400 | not used | none |
| `times-new-roman` | 400 | not used | none |

Why the unused three stay unused: `aquavit` is a quirky text serif that does not hold up at small UI sizes; `nimbus-roman` and `times-new-roman` are Times clones and add nothing over the system fallback. They are in the kit only because the kit was published with them; the browser downloads a face only when text uses it, so they cost nothing.

Mono labels, navigation, buttons and code use **Red Hat Mono**, which is open (SIL OFL 1.1) and **self-hosted**: `apps/web/public/fonts/red-hat-mono-latin-400-normal.woff2` and `...-500-normal.woff2` (latin subset, from the `@fontsource/red-hat-mono` 5.3.0 npm package, which repackages the upstream RedHatOfficial/RedHatFont release). The licence text is next to them (`apps/web/public/fonts/OFL-RedHatMono.txt`). `@font-face` is declared in `apps/web/styles/globals.css` with `font-display: swap`; the 400 file is preloaded.

## Stacks (tokens)

| Token | Stack |
|---|---|
| `--k-font-display` | `"teimer-web", Georgia, "Times New Roman", serif` |
| `--k-font-body` | `"legitima", Georgia, "Times New Roman", serif` |
| `--k-font-mono` | `"Red Hat Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace` |

The earlier `--k-font-sans` token (IBM Plex Sans) is gone; IBM Plex Sans, Newsreader and every Google Fonts reference were removed.

Type metrics tuned to the new faces: display tracking `-0.025em`, display line-height `1.1` (teimer-web 300 is light and wide, so the old `-0.035em` to `-0.04em` tracking was too tight), body line-height `1.58`, body size 16 px (15 px minimum for prose, enforced by `apps/web/tests/guard/readability-css.test.js`). `legitima` ships old-style figures; `body` sets `font-variant-numeric: lining-nums` so versions, counts and CVE ids read evenly. Because `legitima` has weight 500 only, `body` sets `font-synthesis: none` and no rule asks for 600 on body or mono text (a faux bold would smear). Emphasis inside prose is colour, not weight.

## Why this mapping

Chosen by comparing the kit faces on the real pages: teimer-web 300 gives the headings a calm editorial voice and its italic carries the accent phrase well; legitima 500 is a text serif that reads comfortably at 15-16 px on phones; Red Hat Mono keeps the "serif for voice, mono for machinery" rule from DESIGN.md.

## Fallbacks, FOUT and FOIT

The fallbacks are Georgia / Times New Roman for display and body and the system monospace stack for mono, so the site is fully usable if Adobe is unreachable, blocked, or the domain is not allow-listed.

The kit's own `@font-face` rules use `font-display: auto`, which most browsers treat as `block`: text set in `teimer-web` or `legitima` can be invisible for up to about three seconds on a slow connection (FOIT), then swaps. We cannot change the kit CSS, and overriding it with our own `@font-face` for the same family would duplicate the licensed files, so this is accepted. Mitigations in place: `<link rel="preconnect">` to `use.typekit.net` (with and without `crossorigin`, one for the stylesheet and one for the font files) and to `p.typekit.net`, and the stylesheet is a normal render-blocking `<link>` in `<head>`, so the fonts are requested as early as possible. Red Hat Mono uses `swap`.

## Domain allow-list (USER ACTION)

The kit serves only to allow-listed domains. In the Adobe Fonts web project settings (Domains):

1. Add every production hostname, for example `aegis-skills.vercel.app` and any custom domain or Vercel preview domain you want fonts on. Until a domain is listed, the kit CSS loads but the font files are refused and the page shows the Georgia fallbacks.
2. Keep `localhost` in the list for development.
3. Adobe does not accept `127.0.0.1`: develop at `http://localhost:3000`, not `http://127.0.0.1:3000` (the faces will not load there; the fallbacks show).

## Licence

The Adobe Fonts web licence covers use of the kit on allow-listed domains. The fonts must **not** be copied into this repository or into any npm package or release artifact (no `.woff`, `.woff2`, `.otf` or `.ttf` for teimer-web, legitima, aquavit, nimbus-roman or times-new-roman). `apps/web/tests/guard/fonts-guard.test.js` fails if any font file other than Red Hat Mono exists under `apps/web/public` or `packages/*/dist/ui`.

## The Themis dashboard

`packages/themis-app/ui` imports the same tokens but runs offline on loopback under a strict CSP (`default-src 'self'`, `font-src 'self'`), and the Adobe licence does not cover bundling. Decision: the dashboard ships no font files and uses the fallbacks (Georgia for headings and body, system monospace for code and labels). It looks slightly plainer than the website, which is intended. If a fully local look is wanted later, bundle Red Hat Mono there (OFL) as described in ADOPTION.md.

## Privacy

Loading the kit means Adobe sees the visitor's IP address, user agent and the site origin (our referrer policy sends no full page address), and counts kit usage through `p.typekit.net`. This is disclosed in `docs/trust/data-flow.md` and `docs/themis/privacy-policy.md`. The CSP allows exactly `https://use.typekit.net` and `https://p.typekit.net` (styles) and `https://use.typekit.net` (font files); no image or connect host is needed (`p.css` is a stylesheet only).
