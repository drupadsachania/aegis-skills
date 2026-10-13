# Deploying the website to Vercel

Maintainer document. It is not part of the website and is not listed in the docs hub. Written 2026-10-12 for the site in `apps/web` (Next.js 14, pages router). The first release publishes Aegis; Themis is deferred on npm and the AI directories, so nothing here deploys Themis packages.

## Vercel project settings

| Setting (Project Settings, Build and Deployment) | Value | Why |
|---|---|---|
| Framework Preset | Next.js | Auto-detected from `apps/web/package.json` |
| Root Directory | `apps/web` | The site lives there |
| Include source files outside of the Root Directory in the Build Step | **Enabled** (the default for new projects; check it) | The build reads `../../packages/aegis` (skills and the MCP code), `../../design` (tokens) and `../../docs` (rendered markdown, trust and terms pages), and `next.config.js` traces `packages/aegis` files into the server bundle |
| Node.js Version | `24.x` | `engines.node` is `>=24` in the root and in `apps/web`, and the code uses Node 24 features |
| Install Command | Override with `cd ../.. && npm ci` | See "Install" below |
| Build Command | leave default (`npm run build`, which runs `next build`) | `prebuild` runs first (see "Build" below) |
| Output Directory | default (`.next`) | |
| Environment Variables | **none** | See "Environment variables" below |

### Install

The repository is an npm workspace (`workspaces: ["packages/*", "apps/*"]`) with one lockfile, `package-lock.json`, at the repository root. Vercel's documentation says the install path is set by the Root Directory (<https://vercel.com/docs/builds/configure-a-build#install-command>, read 2026-10-12) and gives a custom Install Command as the way to control workspace installs (<https://vercel.com/docs/monorepos#filtered-installs>, read 2026-10-12). Because `apps/web` depends on the workspace package `aegis-skills` (`packages/aegis`) and imports its files at build time, the install must run at the repository root so the workspace links exist and the root lockfile is used. So the documented setting is an explicit override: `cd ../.. && npm ci`. (Setting this explicitly avoids relying on Vercel's automatic detection. The first deploy's install log must show a root-level `npm ci`; if it does not, the override was not saved.)

Not verified here: this maintainer environment has no Vercel account, so the install step itself (and the Include source files toggle) could not be exercised. The build and server below were verified locally from `apps/web`.

### Build

`npm run build` in `apps/web` runs the `prebuild` script, then `next build`:

1. `node scripts/sync-design-tokens.js` copies `design/tokens.css` to `apps/web/styles/tokens.generated.css`. It fails with an explanatory message if `design/` is missing (that is the sign that "Include source files outside of the Root Directory" is off).
2. `node scripts/build-downloads.js` writes the 24 single-file prompts and 24 zips to `apps/web/public/downloads` (git-ignored).
3. `node scripts/build-sitemap.js` writes `apps/web/public/sitemap.xml` (git-ignored): 11 static pages, 24 skill pages and the docs pages (55 URLs on 2026-10-12).

All three scripts locate files from their own location (`__dirname`), so they work with the working directory set to `apps/web`, which is what Vercel uses.

### Environment variables

None are needed. A guard test (`apps/web/tests/guard/no-model-deps.test.js`) fails if any source file reads an environment variable other than `NODE_ENV`. Remove every old variable from the Vercel project if it exists from the earlier version of the site: the Supabase variables (`SUPABASE_*`, `NEXT_PUBLIC_SUPABASE_*`) and any model keys (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY` and similar). The site holds no secrets and calls no model.

## Domain and origin

- The production origin is assumed to be `https://aegis-skills.vercel.app`. It is defined once in `apps/web/lib/site-url.js` and used for `og:image`, canonical links, the sitemap and the install commands' MCP URL.
- **If a custom domain is used instead**, change: `apps/web/lib/site-url.js`, `apps/web/public/robots.txt` (the `Sitemap:` line; `apps/web/tests/lib/sitemap.test.js` fails if the two disagree), and the URLs in the repository's docs, manifests and listing runbooks (`grep -rl "aegis-skills.vercel.app" --exclude-dir=node_modules --exclude-dir=.next .`; notably `docs/legal/terms.md`, `docs/listings/*`, `packages/aegis/server.json`, `packages/aegis/.mcp.json`, `packages/aegis/.claude-plugin/plugin.json`, and `apps/web/tests/pages/new-pages.render.test.js`). Redirect the other host to the primary one in Vercel Domains.
- Adding a domain: Project Settings, Domains, add it, then set the DNS records Vercel shows. HTTPS is automatic. The Strict-Transport-Security header sent by the site uses `preload`, so use HTTPS everywhere.
- Directory submissions need the Terms URL `<origin>/terms`, the privacy policy URL `<origin>/docs/themis/privacy-policy` and the MCP URL `<origin>/api/mcp`.

## Adobe Fonts kit (`pww4pkx`)

The site loads its fonts from the kit through `use.typekit.net` and `p.typekit.net` (the Content-Security-Policy allows only those two). No domain setup is needed: the kit was tested on 2026-10-13 and serves its CSS and fonts to any origin (localhost, 127.0.0.1, the production host and Vercel preview hosts all returned 200), and the Adobe Fonts web project has no domain setting. After the first deploy, just confirm the fonts load (step 8 below). If they fall back to Georgia in production, see the "Domains" section of [FONTS.md](design/FONTS.md). Keep the kit published whenever you change its families.

## Checks before the first deploy (all run on 2026-10-12)

- [x] `npx jest` is green (root projects: web, scripts, design, packages).
- [x] `node scripts/check-layout.js` passes.
- [x] `npm run check:deps` passes.
- [x] Simulated Vercel build: `cd apps/web && npm run build` succeeds with the working directory set to `apps/web` (prebuild scripts use paths relative to their own files; 17 s, 55 static pages and the `/404` page).
- [x] `next start` (port 3100) from `apps/web` serves: `/`, `/quickstart`, `/trust`, `/terms`, `/themis`, `/paths` (200), an unknown path (404 with the on-brand page), `/robots.txt`, `/sitemap.xml`, `/favicon.ico`, `/og.png`, `/downloads/index.json` (200), the CSP and HSTS headers, and a canonical link on `/terms`.
- [x] `POST /api/mcp` with `tools/call` `list_skills` returns the 24 skills; the 121st request within a minute from one IP answers 429 (126 requests sent, 6 got 429).
- [ ] Not run here (needs Vercel): the install step with the override above, and the Include source files toggle.

## Post-deploy smoke checklist

Replace `$O` with the production origin.

1. Pages return 200 and render in a browser: `$O/`, `$O/quickstart`, `$O/trust`, `$O/terms`, `$O/themis` (the "In development" markers and the "Where to get it" section), `$O/paths`, `$O/skills`, `$O/docs`, `$O/security`, `$O/license`.
2. An unknown URL shows the not-found page with links to home, skills and docs, and answers 404.
3. Hosted MCP, `list_skills`:
   ```bash
   curl -s -X POST "$O/api/mcp" -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_skills","arguments":{}}}'
   ```
   The reply says `"count": 24`.
4. Downloads: `curl -sI "$O/downloads/index.json"` is 200, and so are one prompt and one zip listed in it.
5. `curl -sI "$O/favicon.ico"`, `$O/favicon.svg` and `$O/og.png` are 200. Check the social preview with a link-preview tool once, since social crawlers cache.
6. `$O/robots.txt` and `$O/sitemap.xml` are 200 and the sitemap's URLs use the production origin.
7. Headers: `curl -sI "$O/"` shows `Content-Security-Policy` (with `use.typekit.net` and `p.typekit.net` only as third parties), `Strict-Transport-Security`, `X-Frame-Options: DENY` and `X-Content-Type-Options: nosniff`.
8. Fonts: open the site, open the network panel, and confirm the kit CSS and font files load from `use.typekit.net` (no CSP errors in the console, no blocked requests). If the headings fall back to Georgia, check that the kit is still published in Adobe Fonts and see the "Domains" section of [FONTS.md](design/FONTS.md).
9. Rate limit: send over 120 `tools/list` requests inside a minute from one machine; later ones answer 429. (Serverless instances keep separate counters, so the limit is best effort, as the terms say.)
10. Google Search Console / Bing Webmaster (optional, no tracking code is added to the site): submit `$O/sitemap.xml`.
