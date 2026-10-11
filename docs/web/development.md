# Developing the website

## Requirements

Node.js 24 or later.

## Commands

Run these from the repository root:

```bash
npm install
npm run dev -w @aegis-skills/web
npm run build -w @aegis-skills/web
npm run prebuild -w @aegis-skills/web
(cd apps/web && npx jest)
```

- `npm run dev` serves the site at http://localhost:3000. It first generates the downloads.
- `npm run build` builds the production site. `prebuild` runs first and generates `apps/web/public/downloads/`; running `npx next build` directly skips it and the skill pages will fail with a message saying so.
- `npx jest` at the repository root runs the tests of every package, including the website's.
- `npm run check:deps` and `node scripts/check-layout.js` run the repository's dependency and layout guards.

## How docs are rendered

The docs hub renders the markdown in `docs/aegis`, `docs/themis` and `docs/web` with `marked`, at build time. Raw HTML in the markdown is escaped, and relative links between docs are rewritten to site routes. Links to other repository files point at GitHub. Page order is set by `SECTIONS` in `apps/web/lib/docs.js`; files not listed there are appended in alphabetical order.

## Adding a page

Create `docs/<section>/<slug>.md` with a `# Title` as its first line, then add the slug to `SECTIONS` in `apps/web/lib/docs.js`. The slug uses lowercase letters, digits and hyphens. The docs content test checks that every listed page exists and that internal links resolve.

## Install commands

Every install command on the site comes from one module, `apps/web/lib/install-commands.js`. Edit only that file. Its tests pin the commands to the real package names, bins, marketplace name and installer targets, so drift fails the build.

## Deploy

Vercel builds with `npm run build`, which triggers `prebuild`. The project needs Node.js 24, Root Directory `apps/web`, and the setting that includes source files outside the Root Directory (the build reads `docs/`, `scripts/`, `packages/aegis/`, `SECURITY.md` and `LICENSE`). No environment variables are needed.
