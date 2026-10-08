# Phase 5 — Website & Docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `apps/web` into the zero-install distribution hub and documentation site for Aegis + Themis as one pack. The site makes no model calls and stores no data. It serves the catalogue, single-file prompts and skill zips generated at build time, the hosted read-only Aegis MCP, and the docs hub rendered from `docs/{aegis,themis,web}`.

**Architecture:** This is still the Next.js 14 site (pages router for pages and most APIs, app router only for `/api/mcp`). Skill data comes from the `aegis-skills` workspace package through one facade, `apps/web/lib/aegis.js`. A `prebuild` script, `apps/web/scripts/build-downloads.js`, calls Phase 1's flattener and a zero-dependency zip writer built on `node:zlib`. It writes `apps/web/public/downloads/` (gitignored), which Next serves as static files. The docs hub reads the markdown in the repo at build time and renders it with `marked`, escaping all raw HTML. Every page is fully static (no ISR). The only runtime code is the read-only JSON/markdown APIs and `/api/mcp`.

**Tech Stack:** Next.js 14.2 · React 18 · CommonJS + `React.createElement` (the repo's existing style) · `marked@^15` (zero-dependency markdown) · `node:zlib` (`deflateRawSync`, `crc32`) · Jest via `next/jest` + Testing Library · Tailwind/PostCSS (build only, unchanged).

---

## 0. Decisions made in this plan (summary)

| # | Decision | Why |
|---|---|---|
| D1 | Delete `POST /api/[skill]/invoke`, even though it does **not** call a model. | It exists only as the ChatGPT Action endpoint (`openai-action.json` points at `/invoke`). Master decision 6 removes ChatGPT Actions, and `GET /api/[skill]/phase/[phaseId]` serves the same content. |
| D2 | Keep `POST /api/recommend`. | It doesn't call a model: it scores against `skill.json → context` and is used by the catalogue's "find skills" form. |
| D3 | Remove telemetry (`lib/telemetry.js`) and Supabase completely. | After D1 its only remaining caller is the phase route. It logs skill, phase and user-agent to an `invocations` table that no migration defines. Without it the site collects no data, which simplifies the Phase 6 privacy policy and removes 2–4 secrets. |
| D4 | Zip files are written by our own ~110-line writer on `node:zlib` (`deflateRawSync` + `zlib.crc32`), not by `fflate`. | It needs no runtime dependency, its output is reproducible (fixed 1980-01-01 timestamps), and it can be fully unit-tested with a reader written in the test. `zlib.crc32` needs Node ≥ 22.2, which is already required by `engines >=22.13`. |
| D5 | Markdown is rendered with `marked@^15` and a renderer that escapes raw HTML. No MDX. | `marked` has zero dependencies. Escaping raw HTML keeps the CSP story simple, and MDX would pull in a compiler toolchain. |
| D6 | Downloads are generated into `apps/web/public/downloads/` by `prebuild`/`predev` and never committed. | Next serves `public/` statically with no runtime code. Vercel runs `npm run build`, which triggers `prebuild`. |
| D7 | Pages read the generated `public/downloads/index.json` and prompt files with `fs`. Pages never `require` the Phase 1 flattener. | A dynamic `require()` inside a webpack-bundled page breaks. Reading files with `fs` doesn't. |
| D8 | Remove `revalidate` (ISR) from every page; all pages are static. | ISR would read `packages/aegis/skills` and `docs/` at runtime on Vercel. Content only changes through deploys (weekly intel commits redeploy). |
| D9 | Delete `serverExternalPackages` from `next.config.js` and don't replace it. | It lists only LLM SDKs and `better-sqlite3`, which are removed. On Next 14.2 the key isn't valid anyway, because it's a Next 15 key. |
| D10 | Delete `components/HealthBadge.js`, `components/SkillCard.js` and their tests. | No page renders them. |
| D11 | Rewrite `components/InstallTabs.js` as a generic tabs-of-steps component. Extract `CodeBlock`. | ChatGPT Action panel removed. One component now serves every install surface. |
| D12 | All install commands live in one data module, `apps/web/lib/install-commands.js`. Tests pin it against repo facts (package names, bins, marketplace name, installer target ids). | One source of truth for pages and tests. Drift fails CI. |
| D13 | Delete `docs/TECHNICAL.md` (wherever Phase 0 put it). | It documents the removed compiler, ChatGPT Actions and website Themis APIs, and the docs hub supersedes it. |
| D14 | Docs routes: `/docs` (hub), `/docs/<section>` (that section's `index.md`), `/docs/<section>/<page>`. Sections: `aegis`, `themis`, `web`. | Simple catch-all `pages/docs/[...slug].js`. |

---

## 1. Preconditions

Run everything in **Git Bash** from the repo root `openskill/` unless a step says otherwise. Record every output in the PR description under "Baseline".

- [ ] **P1. Branch** (contracts §8):

```bash
git switch main && git pull --ff-only
git switch -c restructure/phase-5-website
```

- [ ] **P2. Phases 1 and 4 are merged.** Their outputs must exist:

```bash
for f in scripts/build-flat-prompts.js packages/aegis/package.json packages/aegis/lib/targets.js .claude-plugin/marketplace.json packages/themis-plugin/package.json packages/themis-app/package.json apps/web/package.json SECURITY.md LICENSE LICENSE-APACHE LICENSE-MIT; do test -e "$f" && echo "ok $f" || echo "MISSING $f"; done
```

Expected: 12 lines starting `ok`. Any `MISSING` → STOP.

- [ ] **P3. Install:**

```bash
npm ci
```

Expected: exits 0.

- [ ] **P4. Phase 1 bindings.** Run from `apps/web`:

```bash
cd apps/web
node -e "const r=require('aegis-skills/mcp/skill-reader');r.listSkills().then(s=>console.log(s.length, s.every(x=>x.context!=null)))"
node -e "const f=require('aegis-skills/mcp/skill-families');console.log(typeof f.familyOf, typeof f.labelOf, Array.isArray(f.FAMILIES))"
node -e "console.log(typeof require('aegis-skills/mcp/server').createAegisMcpServer)"
node -e "console.log(Object.keys(require('../../scripts/build-flat-prompts.js')).join(','))"
node -e "const m=require('../../scripts/build-flat-prompts.js');Promise.resolve(m.flattenSkill(require('path').resolve('../../packages/aegis/skills/compliance'))).then(t=>console.log(typeof t, t.length>1000, /intel as of/i.test(t)))"
cd ../..
```

Expected, line by line:

1. `24 true`
2. `function function true`
3. `function`
4. a comma list that includes `flattenSkill`
5. `string true true` (`string true false` is also acceptable, because the adapter in Task 6 adds the stamp)

Rules:

- If a module path differs but the module exists (for example `aegis-skills/mcp/skill-reader.js` or `aegis-skills/lib/skill-reader`), record the working specifier. Use it in the lines marked `// PHASE-1 BINDING` in Tasks 2 and 6, and change nothing else.
- If the flattener's function has another name but the same contract (it takes an absolute skill directory and returns a string or a Promise of a string), record the name and use it at the `// PHASE-1 BINDING` line in `lib/flat-prompt.js`.
- If `listSkills()` returns a count other than 24, or any entry lacks `context`, STOP.

- [ ] **P5. Record the current state of the web app:**

```bash
cat apps/web/next.config.js
cat apps/web/package.json
grep -rnE "skill-reader|skill-families|aegis-server|mcp/server|telemetry|supabase" apps/web --include=*.js --include=*.ts --include=*.tsx --exclude-dir=node_modules --exclude-dir=.next
ls apps/web/app/api apps/web/pages/api apps/web/lib apps/web/components apps/web/tests apps/web/__tests__ 2>&1
git ls-files | grep -E "health\.json$|TECHNICAL\.md$|supabase/"
```

Keep the output. Tasks 1–4 refer to it as "P5 output".

- [ ] **P6. Repo facts used by `install-commands.js`:**

```bash
node -p "const m=require('./.claude-plugin/marketplace.json');m.name+' | '+m.plugins.map(p=>p.name).join(',')"
node -p "['packages/aegis','packages/themis-plugin','packages/themis-app'].map(d=>{const p=require('./'+d+'/package.json');return p.name+' bin='+JSON.stringify(p.bin)}).join('\n')"
grep -nE "id:|enabled|disabled|verifiedOn" packages/aegis/lib/targets.js | head -60
grep -rn "gemini extensions install" packages/aegis README.md docs 2>/dev/null | grep -v node_modules
grep -n -iE "codex|gemini" packages/themis-plugin/README.md 2>/dev/null
```

Expected:

- `aegis-skills | aegis,themis`
- the three package names `aegis-skills`, `@aegis-skills/themis-plugin` and `@aegis-skills/themis`, with bins containing `aegis`, `themis-mcp` and `themis`

Record:

- the installer target ids, and which ones are disabled;
- the Gemini extension install line, if one exists;
- any Codex/Gemini install lines in the Themis plugin README.

Task 7 consumes these.

- [ ] **P7. Baseline tests:**

```bash
npx jest 2>&1 | tail -n 8
(cd apps/web && npx jest 2>&1 | tail -n 8)
```

Expected: `Tests:` line with `0 failed` (or no "failed" count). Any failure → record it and STOP (universal STOP 2).

- [ ] **P8. Baseline build and runtime:**

```bash
npm run build -w @aegis-skills/web 2>&1 | tail -n 40
```

Expected: ends with the route table and no `Error`/`Failed to compile`.

Then start the server with the tool's background mode (`run_in_background`):

```bash
npm run start -w @aegis-skills/web
```

Wait for `Ready` (or `started server on`), then run:

```bash
curl -s http://localhost:3000/api/skills | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).skills.length))"
curl -s -X POST http://localhost:3000/api/mcp -H "content-type: application/json" -H "accept: application/json, text/event-stream" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | grep -o '"name":"[a-z_]*"' | sort -u
```

Expected: `24`, then `"name":"get_skill"`, `"name":"get_skill_phase"`, `"name":"list_skills"`. Stop the background server.

If either check fails at baseline → STOP. Phase 0/1 deploy tracing is broken, and that isn't this phase's job.

---

## 2. File structure (end state of `apps/web`, Phase 5 files only)

```
apps/web/
├─ package.json                      MODIFY deps, prebuild/predev scripts
├─ next.config.js                    MODIFY drop serverExternalPackages, add tracing + /downloads cache header
├─ app/api/mcp/route.ts              MODIFY import via aegis-skills (binding)
├─ app/api/{themis,audit,exposure}/  DELETE if present
├─ pages/
│  ├─ index.js                       REWRITE home
│  ├─ paths.js                       NEW     choose your path
│  ├─ skills/index.js                NEW     catalogue (moved from old home)
│  ├─ skills/[name].js               REWRITE skill detail
│  ├─ themis.js                      REWRITE
│  ├─ mcp.js                         NEW     hosted MCP
│  ├─ docs.js                        DELETE  (replaced by docs/)
│  ├─ docs/index.js                  NEW     docs hub
│  ├─ docs/[...slug].js              NEW     markdown page
│  ├─ security.js                    NEW
│  ├─ license.js                     NEW
│  └─ api/
│     ├─ skills.js                   MODIFY import
│     ├─ recommend.js                MODIFY import
│     ├─ health.js                   MODIFY generic error
│     ├─ [skill]/manifest.js         MODIFY import
│     ├─ [skill]/phase/[phaseId].js  MODIFY import, drop telemetry
│     └─ [skill]/invoke.js           DELETE
├─ components/
│  ├─ CopyButton.js                  KEEP
│  ├─ CodeBlock.js                   NEW (extracted)
│  ├─ InstallTabs.js                 REWRITE (generic)
│  ├─ PathMatrix.js                  NEW
│  ├─ PlatformBadge.js               REWRITE labels
│  ├─ Screenshot.js                  NEW
│  ├─ Layout.js                      REWRITE nav/footer/head
│  ├─ HealthBadge.js                 DELETE
│  └─ SkillCard.js                   DELETE
├─ lib/
│  ├─ aegis.js                       NEW facade over aegis-skills
│  ├─ site-paths.js                  NEW
│  ├─ zip.js                         NEW
│  ├─ flat-prompt.js                 NEW (Phase 1 binding)
│  ├─ downloads.js                   NEW
│  ├─ install-commands.js            NEW
│  ├─ markdown.js                    NEW
│  ├─ docs.js                        NEW
│  ├─ skill-page.js                  NEW
│  ├─ cors.js                        KEEP
│  ├─ telemetry.js                   DELETE
│  └─ themis/                        DELETE if present
├─ scripts/build-downloads.js        NEW
├─ styles/globals.css                MODIFY (append Phase 5 block)
├─ public/downloads/                 GENERATED, gitignored
└─ tests/
   ├─ helpers/read-zip.js            NEW
   ├─ lib/{zip,downloads,build-downloads.integration,flat-prompt,markdown,docs,skill-page,install-commands}.test.js  NEW
   ├─ guard/no-model-deps.test.js    NEW
   ├─ docs/content.test.js           NEW
   ├─ pages/skill-detail.props.test.js, skill-detail.render.test.js  NEW
   ├─ api/{skills,manifest-route,phase,recommend}.test.js  MODIFY mocks
   ├─ api/health.test.js             NEW
   ├─ api/invoke.test.js             DELETE
   ├─ telemetry.test.js              DELETE
   └─ components/{InstallTabs,PathMatrix,PlatformBadge,Layout}.test.js  REWRITE/NEW; HealthBadge/SkillCard tests DELETE
Repo root:
├─ .gitignore                        MODIFY add apps/web/public/downloads/
├─ README.md                         MODIFY links section, strip removed APIs
├─ docs/aegis/*.md, docs/themis/*.md, docs/web/*.md   NEW (19 files)
└─ docs/TECHNICAL.md (or apps/web/docs/TECHNICAL.md)  DELETE
```

The `supabase/` folder and `data/` folder are deleted if they are present under `apps/web/` or at the repo root.

---

## 3. Route audit

| Route | File (under `apps/web/`) | Calls a model? | Uses Supabase? | Decision | Reason / change |
|---|---|---|---|---|---|
| `GET /api/skills` | `pages/api/skills.js` | No | No | **Keep** | Change import to `lib/aegis`. |
| `GET /api/[skill]/manifest` | `pages/api/[skill]/manifest.js` | No | No | **Keep** | Change import. Path-freedom is enforced inside aegis's reader. |
| `GET /api/[skill]/phase/[phaseId]` | `pages/api/[skill]/phase/[phaseId].js` | No | **Yes**, through `lib/telemetry` `logInvocation` | **Keep, change** | Remove telemetry (D3). Change import. |
| `POST /api/[skill]/invoke` | `pages/api/[skill]/invoke.js` | No | Yes (telemetry) | **Delete** | ChatGPT Action endpoint (D1). |
| `POST /api/recommend` | `pages/api/recommend.js` | No (deterministic scoring) | No | **Keep** | Change import (D2). |
| `GET /api/health` | `pages/api/health.js` | No | No | **Keep, change** | Return `{ error: 'health unavailable' }` instead of echoing `err.message`. |
| `/api/mcp` (POST/GET/DELETE) | `app/api/mcp/route.ts` | No | No | **Keep** | Stateless read-only Aegis MCP. Import `createAegisMcpServer` from `aegis-skills` (binding). |
| `POST /api/themis` | `app/api/themis/route.ts` | Yes | Yes (rate limits) | **Delete if present** | Moved to themis-app in Phase 4 (master decision 7). |
| `POST /api/audit` | `app/api/audit/route.ts` | Yes | Yes | **Delete if present** | Same. |
| `POST /api/exposure` | `app/api/exposure/route.ts` | Yes | Yes | **Delete if present** | Same. |

Supporting libraries: `lib/cors.js` stays. `lib/telemetry.js`, `lib/themis/**`, `supabase/migrations/*` (all three migrations are Themis tables) and `data/` are deleted.

---

## 4. Tasks

### Task 1 — Remove Themis/API remnants from the website

**Files:**

- Delete if present:
  - `apps/web/app/api/themis/`, `apps/web/app/api/audit/`, `apps/web/app/api/exposure/`
  - `apps/web/lib/themis/`, `apps/web/__tests__/themis/`
  - `apps/web/supabase/`, `supabase/` (repo root)
  - `apps/web/data/`

**Executor:** haiku

- [ ] **1.1** Prove nothing in `packages/` depends on the web app:

```bash
grep -rnE "apps/web|@aegis-skills/web" packages --include=*.js --include=*.ts --include=*.json --exclude-dir=node_modules --exclude-dir=dist
```

Expected: no output. Any output → STOP.

- [ ] **1.2** Confirm that Phase 4 owns the routes:

```bash
grep -rlE "exposure|audit" packages/themis-app/src | head
```

Expected: at least one file. If there's no output and `apps/web/app/api/themis` still exists → STOP (Phase 4 is not merged).

- [ ] **1.3** Delete the paths that exist, using git:

```bash
for p in apps/web/app/api/themis apps/web/app/api/audit apps/web/app/api/exposure apps/web/lib/themis apps/web/__tests__/themis apps/web/supabase supabase; do git ls-files --error-unmatch "$p" >/dev/null 2>&1 && git rm -r -q "$p" && echo "removed $p"; done
rm -rf apps/web/data
```

- [ ] **1.4** Check what's left:

```bash
ls apps/web/app/api
```

Expected: `mcp` only.

```bash
(cd apps/web && npx jest 2>&1 | tail -n 5)
```

Expected: no failures. Some test suites may disappear; that's fine.

- [ ] **1.5** Commit:

```bash
git commit -m "chore(web): remove Themis, audit and exposure remnants from the website"
```

If nothing was staged (Phase 4 already removed everything), skip the commit and note "Task 1: nothing to remove" in the PR.

---

### Task 2 — Aegis facade, `site-paths`, and one import path

**Files:**

- Create: `apps/web/lib/aegis.js`, `apps/web/lib/site-paths.js`
- Modify:
  - `apps/web/pages/api/skills.js`, `pages/api/recommend.js`, `pages/api/[skill]/manifest.js`, `pages/api/[skill]/phase/[phaseId].js`
  - `apps/web/app/api/mcp/route.ts`
  - every other file that P5 showed importing `skill-reader`/`skill-families`/`aegis-server`
  - `apps/web/tests/api/{skills,manifest-route,phase,recommend}.test.js`

**Executor:** sonnet

- [ ] **2.1** Create `apps/web/lib/site-paths.js`:

```js
'use strict'

const fs = require('fs')
const path = require('path')

// Next.js and `npm run -w` run with cwd = apps/web; a root-level `npx jest`
// (projects) runs with cwd = repo root. Resolve the web root from either.
function findWebRoot (start = process.cwd()) {
  const fromRepo = path.join(start, 'apps', 'web')
  if (fs.existsSync(path.join(fromRepo, 'package.json'))) return fromRepo
  return start
}

const WEB_ROOT = findWebRoot()
const REPO_ROOT = path.resolve(WEB_ROOT, '..', '..')
const DOCS_DIR = path.join(REPO_ROOT, 'docs')
const AEGIS_DIR = path.join(REPO_ROOT, 'packages', 'aegis')
const SKILLS_DIR = path.join(AEGIS_DIR, 'skills')
const DOWNLOADS_DIR = path.join(WEB_ROOT, 'public', 'downloads')

function assertRepoLayout () {
  for (const p of [path.join(REPO_ROOT, 'SECURITY.md'), SKILLS_DIR, DOCS_DIR]) {
    if (!fs.existsSync(p)) throw new Error(`Expected repo path missing: ${p}`)
  }
}

function aegisVersion () {
  return JSON.parse(fs.readFileSync(path.join(AEGIS_DIR, 'package.json'), 'utf8')).version
}

module.exports = { findWebRoot, WEB_ROOT, REPO_ROOT, DOCS_DIR, AEGIS_DIR, SKILLS_DIR, DOWNLOADS_DIR, assertRepoLayout, aegisVersion }
```

- [ ] **2.2** Create `apps/web/lib/aegis.js`. Use the specifiers recorded in P4.

```js
'use strict'

// Single entry point from the website into the Aegis package.
// Runtime-safe (API routes) and build-time-safe (getStaticProps).
// Never import the MCP server from here: pages must not bundle the MCP SDK.
const reader = require('aegis-skills/mcp/skill-reader')     // PHASE-1 BINDING
const families = require('aegis-skills/mcp/skill-families') // PHASE-1 BINDING

module.exports = {
  listSkills: reader.listSkills,
  getSkillManifest: reader.getSkillManifest,
  getPhaseContent: reader.getPhaseContent,
  FAMILIES: families.FAMILIES,
  familyOf: families.familyOf,
  labelOf: families.labelOf
}
```

- [ ] **2.3** Repoint the imports:
  - In the four `pages/api` handlers, replace whatever `require(...)` currently supplies `listSkills`/`getSkillManifest`/`getPhaseContent` with `require('<relative>/lib/aegis')`. The relative path is `'../../lib/aegis'` for `skills.js` and `recommend.js`, `'../../../lib/aegis'` for `manifest.js`, and `'../../../../lib/aegis'` for `phase/[phaseId].js`.
  - In `app/api/mcp/route.ts`, the `require` becomes:

    ```ts
    const { createAegisMcpServer } = require('aegis-skills/mcp/server') as {   // PHASE-1 BINDING
    ```

    Leave the type annotation and everything else in that file unchanged.
  - Leave any page that P5 listed as importing the reader alone for now; Tasks 11–13 rewrite those pages.

- [ ] **2.4** Update the test mocks. In `tests/api/skills.test.js`, `manifest-route.test.js`, `phase.test.js` and `recommend.test.js`, replace every `'../../lib/skill-reader'` (or the specifier Phase 1 left) with `'../../lib/aegis'`, in both `jest.mock(...)` and `require(...)`.

- [ ] **2.5** Run:

```bash
(cd apps/web && npx jest tests/api 2>&1 | tail -n 6)
```

Expected: all pass. `invoke.test.js` still passes for now; Task 3 deletes it.

- [ ] **2.6** Commit:

```bash
git add apps/web/lib/aegis.js apps/web/lib/site-paths.js apps/web/pages/api apps/web/app/api/mcp/route.ts apps/web/tests/api
git commit -m "refactor(web): read skills through a single aegis-skills facade"
```

---

### Task 3 — Route changes: delete invoke, drop telemetry, harden health

**Files:**

- Delete: `apps/web/pages/api/[skill]/invoke.js`, `apps/web/tests/api/invoke.test.js`, `apps/web/lib/telemetry.js`, `apps/web/tests/telemetry.test.js`
- Modify: `apps/web/pages/api/[skill]/phase/[phaseId].js`, `apps/web/tests/api/phase.test.js`, `apps/web/pages/api/health.js`
- Create: `apps/web/tests/api/health.test.js`

**Executor:** haiku

- [ ] **3.1** Write the failing health test, `apps/web/tests/api/health.test.js`:

```js
'use strict'

const fs = require('fs')
const httpMocks = require('node-mocks-http')
const handler = require('../../pages/api/health')

describe('GET /api/health', () => {
  afterEach(() => jest.restoreAllMocks())

  test('returns 500 with a generic message when health.json is invalid', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true)
    jest.spyOn(fs, 'readFileSync').mockReturnValue('{not json')
    const req = httpMocks.createRequest({ method: 'GET' })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(500)
    expect(JSON.parse(res._getData())).toEqual({ error: 'health unavailable' })
  })

  test('returns 404 when health.json is absent', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false)
    const req = httpMocks.createRequest({ method: 'GET' })
    const res = httpMocks.createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(404)
  })
})
```

Run `(cd apps/web && npx jest tests/api/health.test.js)`. Expected: the first test FAILS, because the body contains the JSON parse message.

- [ ] **3.2** In `pages/api/health.js`, change only the catch block to:

```js
  } catch {
    res.status(500).json({ error: 'health unavailable' })
  }
```

Re-run. Expected: 2 passed.

- [ ] **3.3** In `pages/api/[skill]/phase/[phaseId].js`:
  - delete the `require('.../lib/telemetry')` line;
  - delete the two lines `const platform = detectPlatform(...)` and `logInvocation(...)`.

  Everything else stays as is (CORS, 405, M5 coercion, 404 messages, `text/markdown`).

  In `tests/api/phase.test.js`:
  - delete the `jest.mock('../../lib/telemetry', ...)` block;
  - delete the `const { logInvocation } = require('../../lib/telemetry')` line;
  - delete the test `'calls logInvocation'`.

- [ ] **3.4** Delete the invoke route and the telemetry module:

```bash
git rm -q "apps/web/pages/api/[skill]/invoke.js" apps/web/tests/api/invoke.test.js apps/web/lib/telemetry.js apps/web/tests/telemetry.test.js
grep -rnE "telemetry|logInvocation|detectPlatform|/invoke" apps/web --include=*.js --include=*.ts --exclude-dir=node_modules --exclude-dir=.next
```

Expected: hits only in `pages/docs.js`, `pages/index.js` and `pages/themis.js` (prose, rewritten later), or no output. A hit in any other code file → fix the import (it must be removed). If the hit isn't an import → STOP.

- [ ] **3.5** Run:

```bash
(cd apps/web && npx jest tests/api 2>&1 | tail -n 6)
```

Expected: all pass.

- [ ] **3.6** Commit:

```bash
git add -A apps/web/pages/api apps/web/tests apps/web/lib
git commit -m "feat(web): drop the ChatGPT Action invoke route and Supabase telemetry"
```

---

### Task 4 — Dependencies, `next.config.js`, no-model guard

**Files:**

- Modify: `apps/web/package.json`, `apps/web/next.config.js`, `.gitignore`, `package-lock.json`
- Create: `apps/web/tests/guard/no-model-deps.test.js`

**Executor:** sonnet

- [ ] **4.1** Write the guard test first, `apps/web/tests/guard/no-model-deps.test.js`:

```js
'use strict'

const fs = require('fs')
const path = require('path')

const WEB = path.resolve(__dirname, '..', '..')
const FORBIDDEN = [/^@anthropic-ai\//, /^openai$/, /^@google\/generative-ai$/, /^@google\/genai$/,
  /^@langchain\//, /^langsmith$/, /^better-sqlite3$/, /^@types\/better-sqlite3$/, /^@supabase\//, /^ai$/]
const SOURCE_DIRS = ['pages', 'app', 'components', 'lib', 'scripts']
const REMOVED_ROUTES = ['/api/themis', '/api/audit', '/api/exposure', '/invoke']

function walk (dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(js|ts|tsx)$/.test(e.name)) out.push(p)
  }
  return out
}
const files = SOURCE_DIRS.flatMap(d => walk(path.join(WEB, d)))
const isForbidden = spec => FORBIDDEN.some(rx => rx.test(spec))

describe('website has no model, LLM-framework, sqlite or Supabase code', () => {
  test('package.json declares none of them', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(WEB, 'package.json'), 'utf8'))
    const names = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })
    expect(names.filter(isForbidden)).toEqual([])
  })

  test('no source file imports them', () => {
    const offenders = []
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8')
      for (const m of src.matchAll(/(?:require\(|from\s+|import\()\s*['"]([^'"]+)['"]/g)) {
        if (isForbidden(m[1])) offenders.push(`${path.relative(WEB, f)} → ${m[1]}`)
      }
    }
    expect(offenders).toEqual([])
  })

  test('no source file reads secrets from the environment', () => {
    const offenders = files.filter(f => /process\.env\.(?!NODE_ENV\b)[A-Z_]+/.test(fs.readFileSync(f, 'utf8')))
    expect(offenders.map(f => path.relative(WEB, f))).toEqual([])
  })

  test('no source file references a removed route', () => {
    const offenders = []
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8')
      for (const r of REMOVED_ROUTES) if (src.includes(r)) offenders.push(`${path.relative(WEB, f)} → ${r}`)
    }
    expect(offenders).toEqual([])
  })

  test('next.config.js has no serverExternalPackages', () => {
    expect(fs.readFileSync(path.join(WEB, 'next.config.js'), 'utf8')).not.toMatch(/serverExternalPackages/)
  })
})
```

Run `(cd apps/web && npx jest tests/guard)`. Expected: FAILS. That's fine, because the old pages still mention `/api/themis` and the deps are still present. The "removed route" test stays red until Task 15 deletes `pages/docs.js` and Tasks 13–14 rewrite `index.js`/`themis.js`. Every other test in this file must be green at the end of this task.

- [ ] **4.2** Edit `apps/web/package.json`.
  - Set `dependencies` to exactly these keys. Keep the version range currently in the file for any key that already exists; new keys get the version shown.

    ```json
    "dependencies": {
      "@modelcontextprotocol/sdk": "<exact value from packages/aegis/package.json>",
      "aegis-skills": "<keep current value; if absent use \"*\">",
      "marked": "^15.0.0",
      "next": "<keep>",
      "react": "<keep>",
      "react-dom": "<keep>"
    }
    ```

  - Set `devDependencies` to exactly these keys, with current ranges kept: `@testing-library/jest-dom`, `@testing-library/react`, `@testing-library/user-event`, `@types/node`, `@types/react`, `@types/react-dom`, `autoprefixer`, `jest`, `jest-environment-jsdom`, `node-mocks-http`, `postcss`, `tailwindcss`, `typescript`.
  - Set `scripts` to the following, plus any `lint` script already present:

    ```json
    "scripts": {
      "predev": "node scripts/build-downloads.js",
      "dev": "next dev",
      "prebuild": "node scripts/build-downloads.js",
      "build": "next build",
      "start": "next start",
      "test": "jest"
    }
    ```

  Removed packages (only those that are present):
  - `@anthropic-ai/sdk`, `openai`, `@google/generative-ai`
  - `@langchain/anthropic`, `@langchain/core`, `@langchain/google-genai`, `@langchain/langgraph`, `@langchain/openai`, `langsmith`
  - `better-sqlite3`, `@types/better-sqlite3`, `@supabase/supabase-js`
  - `ajv`, `chalk`, `commander`, `inquirer`, `gray-matter`, `zod`

  Note: `scripts/build-downloads.js` doesn't exist until Task 6. Don't run `npm run build`/`dev` before Task 6.

- [ ] **4.3** Edit `apps/web/next.config.js`.
  - Delete the whole `serverExternalPackages: [...]` property.
  - Keep `headers()` byte-for-byte, and add one more object to its returned array:

    ```js
          {
            source: '/downloads/:path*',
            headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' }]
          }
    ```

  - Make sure the config has these tracing settings (Next 14.2 keys):

    ```js
      experimental: {
        outputFileTracingRoot: require('path').join(__dirname, '..', '..'),
        outputFileTracingIncludes: {
          '/api/**/*': ['../../packages/aegis/skills/**/*', '../../packages/aegis/package.json']
        }
      },
    ```

    If P5 shows an existing `experimental.outputFileTracingIncludes`, merge: keep its keys and globs and add these globs to `'/api/**/*'`.
  - If the file has any top-level key other than `serverExternalPackages`, `headers`, `experimental`, `output`, `reactStrictMode` or `poweredByHeader` → STOP and report it.

- [ ] **4.4** Add one line to `.gitignore` under the `.next/` line:

```
apps/web/public/downloads/
```

- [ ] **4.5** Install and verify:

```bash
npm install
npm ls -w @aegis-skills/web --depth=0
(cd apps/web && npx jest tests/guard -t "package.json|serverExternalPackages|imports" 2>&1 | tail -n 6)
```

Expected:

- `npm install` exits 0.
- `npm ls` shows exactly the 6 deps and the 13 devDeps, with no `UNMET`.
- The 3 selected guard tests pass.

Also run:

```bash
node -e "const {Marked}=require('marked');console.log(new Marked().parse('# x').trim())"
```

Run this from `apps/web`. Expected: `<h1>x</h1>`.

- [ ] **4.6** Commit:

```bash
git add apps/web/package.json apps/web/next.config.js .gitignore package-lock.json apps/web/tests/guard
git commit -m "chore(web): drop LLM, LangChain, sqlite and Supabase dependencies"
```

---

### Task 5 — Zip writer (TDD)

**Files:**

- Create: `apps/web/lib/zip.js`, `apps/web/tests/helpers/read-zip.js`, `apps/web/tests/lib/zip.test.js`

**Executor:** sonnet

- [ ] **5.1** Create the reader used by tests, `apps/web/tests/helpers/read-zip.js`:

```js
'use strict'

const zlib = require('zlib')

// Minimal ZIP reader for tests: walks the central directory, inflates entries.
function readZip (buf) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  if (eocd < 0) throw new Error('no end-of-central-directory record')
  const count = buf.readUInt16LE(eocd + 10)
  let p = buf.readUInt32LE(eocd + 16)
  const entries = []
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central header')
    const flags = buf.readUInt16LE(p + 8)
    const method = buf.readUInt16LE(p + 10)
    const crc = buf.readUInt32LE(p + 16)
    const csize = buf.readUInt32LE(p + 20)
    const usize = buf.readUInt32LE(p + 24)
    const nlen = buf.readUInt16LE(p + 28)
    const xlen = buf.readUInt16LE(p + 30)
    const clen = buf.readUInt16LE(p + 32)
    const local = buf.readUInt32LE(p + 42)
    const name = buf.toString('utf8', p + 46, p + 46 + nlen)
    if (buf.readUInt32LE(local) !== 0x04034b50) throw new Error('bad local header')
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28)
    const raw = buf.subarray(start, start + csize)
    const data = method === 8 ? zlib.inflateRawSync(raw) : Buffer.from(raw)
    entries.push({ name, flags, method, crc, usize, data })
    p += 46 + nlen + xlen + clen
  }
  return entries
}

module.exports = { readZip }
```

- [ ] **5.2** Write the failing tests, `apps/web/tests/lib/zip.test.js`:

```js
'use strict'

const zlib = require('zlib')
const crypto = require('crypto')
const { createZip } = require('../../lib/zip')
const { readZip } = require('../helpers/read-zip')

describe('createZip', () => {
  test('round-trips text and buffer entries with correct CRC and sizes', () => {
    const md = '# Title\n\n' + 'repeatable line\n'.repeat(200)
    const bin = Buffer.from([0, 1, 2, 3, 250, 251])
    const zip = createZip([{ name: 'skill/SKILL.md', data: md }, { name: 'skill/bin.dat', data: bin }])
    const out = readZip(zip)
    expect(out.map(e => e.name)).toEqual(['skill/SKILL.md', 'skill/bin.dat'])
    expect(out[0].data.toString('utf8')).toBe(md)
    expect(out[1].data.equals(bin)).toBe(true)
    expect(out[0].crc).toBe(zlib.crc32(Buffer.from(md)))
    expect(out[0].usize).toBe(Buffer.byteLength(md))
  })

  test('deflates compressible data and stores incompressible data', () => {
    const out = readZip(createZip([
      { name: 'a.txt', data: 'aaaa'.repeat(500) },
      { name: 'r.bin', data: crypto.randomBytes(64) }
    ]))
    expect(out[0].method).toBe(8)
    expect(out[1].method).toBe(0)
  })

  test('sets the UTF-8 name flag and is byte-for-byte deterministic', () => {
    const input = [{ name: 'x/é.md', data: 'hi' }]
    const a = createZip(input)
    const b = createZip(input)
    expect(a.equals(b)).toBe(true)
    expect(readZip(a)[0].flags & 0x0800).toBe(0x0800)
    expect(readZip(a)[0].name).toBe('x/é.md')
  })

  test('an empty archive is a bare 22-byte end record', () => {
    const zip = createZip([])
    expect(zip.length).toBe(22)
    expect(readZip(zip)).toEqual([])
  })

  test.each(['', '/abs.md', '../up.md', 'a/../b.md', 'a\\b.md', 'a//b.md', 'dir/', './a.md', 'nul\0.md'])(
    'rejects unsafe entry name %j', name => {
      expect(() => createZip([{ name, data: 'x' }])).toThrow(/zip:/)
    })

  test('rejects duplicate names', () => {
    expect(() => createZip([{ name: 'a.md', data: '1' }, { name: 'a.md', data: '2' }])).toThrow(/duplicate/)
  })
})
```

Run `(cd apps/web && npx jest tests/lib/zip.test.js)`. Expected: FAIL with `Cannot find module '../../lib/zip'`.

- [ ] **5.3** Create `apps/web/lib/zip.js`:

```js
'use strict'

// Tiny, dependency-free ZIP writer (PKWARE APPNOTE 6.3, no ZIP64).
// Deflate via node:zlib; stores an entry when deflate does not shrink it.
// Timestamps are fixed to 1980-01-01 00:00 so output is reproducible.
const zlib = require('zlib')

const DOS_TIME = 0
const DOS_DATE = (0 << 9) | (1 << 5) | 1 // 1980-01-01
const FLAG_UTF8 = 0x0800
const MAX_U16 = 0xffff
const MAX_U32 = 0xffffffff

function assertSafeName (name, seen) {
  if (typeof name !== 'string' || name.length === 0 || name.length > 255) {
    throw new Error('zip: invalid entry name')
  }
  const bad = name.startsWith('/') || name.includes('\\') || name.includes('\0') ||
    name.split('/').some(seg => seg === '' || seg === '.' || seg === '..')
  if (bad) throw new Error(`zip: unsafe entry name: ${JSON.stringify(name)}`)
  if (seen.has(name)) throw new Error(`zip: duplicate entry: ${name}`)
  seen.add(name)
}

/**
 * @param {{ name: string, data: Buffer|string }[]} entries  POSIX paths, files only
 * @returns {Buffer}
 */
function createZip (entries) {
  if (entries.length > MAX_U16) throw new Error('zip: too many entries')
  const seen = new Set()
  const parts = []
  const central = []
  let offset = 0

  for (const entry of entries) {
    assertSafeName(entry.name, seen)
    const name = Buffer.from(entry.name, 'utf8')
    const raw = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(String(entry.data), 'utf8')
    const crc = zlib.crc32(raw) >>> 0
    const deflated = zlib.deflateRawSync(raw, { level: 9 })
    const method = deflated.length < raw.length ? 8 : 0
    const body = method === 8 ? deflated : raw
    if (raw.length > MAX_U32 || offset > MAX_U32) throw new Error('zip: archive too large')

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(FLAG_UTF8, 6)
    local.writeUInt16LE(method, 8)
    local.writeUInt16LE(DOS_TIME, 10)
    local.writeUInt16LE(DOS_DATE, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(body.length, 18)
    local.writeUInt32LE(raw.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)
    parts.push(local, name, body)

    const cen = Buffer.alloc(46)
    cen.writeUInt32LE(0x02014b50, 0)
    cen.writeUInt16LE(20, 4)
    cen.writeUInt16LE(20, 6)
    cen.writeUInt16LE(FLAG_UTF8, 8)
    cen.writeUInt16LE(method, 10)
    cen.writeUInt16LE(DOS_TIME, 12)
    cen.writeUInt16LE(DOS_DATE, 14)
    cen.writeUInt32LE(crc, 16)
    cen.writeUInt32LE(body.length, 20)
    cen.writeUInt32LE(raw.length, 24)
    cen.writeUInt16LE(name.length, 28)
    // extra len (30), comment len (32), disk (34), int attrs (36), ext attrs (38) = 0
    cen.writeUInt32LE(offset, 42)
    central.push(cen, name)

    offset += local.length + name.length + body.length
  }

  const cd = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(cd.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...parts, cd, end])
}

module.exports = { createZip }
```

- [ ] **5.4** Run `(cd apps/web && npx jest tests/lib/zip.test.js)`. Expected: all tests pass (6 tests plus 9 parameterised cases).

- [ ] **5.5** Commit:

```bash
git add apps/web/lib/zip.js apps/web/tests/helpers/read-zip.js apps/web/tests/lib/zip.test.js
git commit -m "feat(web): add dependency-free reproducible zip writer"
```

---

### Task 6 — Download generation (flattened prompts + skill zips)

**Files:**

- Create:
  - `apps/web/lib/flat-prompt.js`, `apps/web/lib/downloads.js`, `apps/web/scripts/build-downloads.js`
  - `apps/web/tests/lib/downloads.test.js`, `apps/web/tests/lib/build-downloads.integration.test.js`, `apps/web/tests/lib/flat-prompt.test.js`

**Executor:** sonnet

`index.json` contract (written to `public/downloads/index.json`):

```json
{ "aegisVersion": "1.1.0",
  "skills": [ { "name": "compliance", "version": "1.1.0", "intelAsOf": "2026-08-18",
                "prompt": "/downloads/prompts/compliance.md", "zip": "/downloads/skills/compliance.zip",
                "promptBytes": 31234, "zipBytes": 9876, "zipSha256": "<64 hex>" } ] }
```

Zip layout: `<name>/SKILL.md`, `<name>/skill.json`, `<name>/references/<file>.md`. Nothing else: no `intel-state.json` and no `artifacts/` (contracts §7).

- [ ] **6.1** Write the failing unit tests, `apps/web/tests/lib/downloads.test.js`:

```js
'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { buildDownloads, collectSkillEntries, readIntelAsOf, stampIntel } = require('../../lib/downloads')
const { readZip } = require('../helpers/read-zip')

function makeSkill (root, name, { intel = '2026-09-30', skillMd = true } = {}) {
  const d = path.join(root, name)
  fs.mkdirSync(path.join(d, 'references'), { recursive: true })
  fs.mkdirSync(path.join(d, 'artifacts'))
  if (skillMd) fs.writeFileSync(path.join(d, 'SKILL.md'), `---\nname: ${name}\n---\n# ${name}\n`)
  fs.writeFileSync(path.join(d, 'skill.json'), JSON.stringify({ osk: '1.1', name, version: '1.1.0' }))
  fs.writeFileSync(path.join(d, 'references', 'scope.md'), '# Scope\n')
  fs.writeFileSync(path.join(d, 'references', 'notes.txt'), 'not markdown')
  fs.writeFileSync(path.join(d, 'artifacts', 'system-prompt.txt'), 'old')
  if (intel) fs.writeFileSync(path.join(d, 'intel-state.json'), JSON.stringify({ 'last-intel-sync': intel }))
  return d
}

let tmp
beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-dl-')) })
afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }))

test('collectSkillEntries ships only SKILL.md, skill.json and references/*.md', () => {
  const dir = makeSkill(tmp, 'alpha')
  expect(collectSkillEntries(dir, 'alpha').map(e => e.name))
    .toEqual(['alpha/SKILL.md', 'alpha/skill.json', 'alpha/references/scope.md'])
})

test('readIntelAsOf reads last-intel-sync and rejects junk', () => {
  expect(readIntelAsOf(makeSkill(tmp, 'a'))).toBe('2026-09-30')
  expect(readIntelAsOf(makeSkill(tmp, 'b', { intel: null }))).toBeNull()
  expect(readIntelAsOf(makeSkill(tmp, 'c', { intel: 'yesterday' }))).toBeNull()
})

test('stampIntel prepends a stamp only when none is present', () => {
  expect(stampIntel('# X', '2026-09-30')).toBe('> Intel as of 2026-09-30\n\n# X')
  expect(stampIntel('# X', null)).toBe('> Intel as of unknown\n\n# X')
  expect(stampIntel('Intel as of 2026-01-01\n# X', '2026-09-30')).toBe('Intel as of 2026-01-01\n# X')
})

test('buildDownloads writes prompts, zips and index.json and clears stale output', async () => {
  const skills = path.join(tmp, 'skills')
  makeSkill(skills, 'alpha')
  makeSkill(skills, 'beta', { intel: null })
  makeSkill(skills, 'gamma', { skillMd: false })
  const out = path.join(tmp, 'out')
  fs.mkdirSync(out)
  fs.writeFileSync(path.join(out, 'stale.txt'), 'x')
  const seen = []
  const flatten = dir => { seen.push(path.basename(dir)); return `# flat ${path.basename(dir)}` }

  const index = await buildDownloads({ skillsDir: skills, outDir: out, flatten, aegisVersion: '9.9.9' })

  expect(seen).toEqual(['alpha', 'beta'])
  expect(fs.existsSync(path.join(out, 'stale.txt'))).toBe(false)
  expect(index.aegisVersion).toBe('9.9.9')
  expect(index.skills.map(s => s.name)).toEqual(['alpha', 'beta'])
  expect(index.skills[0]).toMatchObject({ version: '1.1.0', intelAsOf: '2026-09-30',
    prompt: '/downloads/prompts/alpha.md', zip: '/downloads/skills/alpha.zip' })
  expect(index.skills[0].zipSha256).toMatch(/^[0-9a-f]{64}$/)
  expect(fs.readFileSync(path.join(out, 'prompts', 'alpha.md'), 'utf8'))
    .toBe('> Intel as of 2026-09-30\n\n# flat alpha')
  const names = readZip(fs.readFileSync(path.join(out, 'skills', 'beta.zip'))).map(e => e.name)
  expect(names).toEqual(['beta/SKILL.md', 'beta/skill.json', 'beta/references/scope.md'])
  expect(JSON.parse(fs.readFileSync(path.join(out, 'index.json'), 'utf8'))).toEqual(index)
})
```

Run it. Expected: FAIL, module not found.

- [ ] **6.2** Create `apps/web/lib/downloads.js`:

```js
'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { createZip } = require('./zip')

const SAFE_NAME = /^[a-z0-9][a-z0-9-]{0,63}$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function readIntelAsOf (skillDir) {
  try {
    const state = JSON.parse(fs.readFileSync(path.join(skillDir, 'intel-state.json'), 'utf8'))
    const d = state && state['last-intel-sync']
    return typeof d === 'string' && ISO_DATE.test(d) ? d : null
  } catch {
    return null
  }
}

function stampIntel (text, intelAsOf) {
  if (/intel as of/i.test(text)) return text
  return `> Intel as of ${intelAsOf || 'unknown'}\n\n${text}`
}

// Contracts §7: a distributed skill is SKILL.md + skill.json + references/ only.
function collectSkillEntries (skillDir, name) {
  const entries = []
  for (const f of ['SKILL.md', 'skill.json']) {
    const p = path.join(skillDir, f)
    if (!fs.existsSync(p)) throw new Error(`${name}: missing ${f}`)
    entries.push({ name: `${name}/${f}`, data: fs.readFileSync(p) })
  }
  const refDir = path.join(skillDir, 'references')
  if (fs.existsSync(refDir)) {
    for (const f of fs.readdirSync(refDir).sort()) {
      const p = path.join(refDir, f)
      if (f.endsWith('.md') && fs.statSync(p).isFile()) {
        entries.push({ name: `${name}/references/${f}`, data: fs.readFileSync(p) })
      }
    }
  }
  return entries
}

function readVersion (skillDir) {
  try {
    const v = JSON.parse(fs.readFileSync(path.join(skillDir, 'skill.json'), 'utf8')).version
    return typeof v === 'string' ? v : null
  } catch {
    return null
  }
}

/**
 * @param {{ skillsDir: string, outDir: string, aegisVersion: string,
 *           flatten: (skillDir: string) => string|Promise<string> }} opts
 */
async function buildDownloads ({ skillsDir, outDir, flatten, aegisVersion }) {
  const promptsDir = path.join(outDir, 'prompts')
  const zipsDir = path.join(outDir, 'skills')
  fs.rmSync(outDir, { recursive: true, force: true })
  fs.mkdirSync(promptsDir, { recursive: true })
  fs.mkdirSync(zipsDir, { recursive: true })

  const names = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && SAFE_NAME.test(d.name))
    .map(d => d.name)
    .filter(n => fs.existsSync(path.join(skillsDir, n, 'SKILL.md')))
    .sort()

  const skills = []
  for (const name of names) {
    const dir = path.join(skillsDir, name)
    const intelAsOf = readIntelAsOf(dir)
    const prompt = stampIntel(String(await flatten(dir)), intelAsOf)
    const zip = createZip(collectSkillEntries(dir, name))
    fs.writeFileSync(path.join(promptsDir, `${name}.md`), prompt, 'utf8')
    fs.writeFileSync(path.join(zipsDir, `${name}.zip`), zip)
    skills.push({
      name,
      version: readVersion(dir),
      intelAsOf,
      prompt: `/downloads/prompts/${name}.md`,
      zip: `/downloads/skills/${name}.zip`,
      promptBytes: Buffer.byteLength(prompt, 'utf8'),
      zipBytes: zip.length,
      zipSha256: crypto.createHash('sha256').update(zip).digest('hex')
    })
  }

  const index = { aegisVersion, skills }
  fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 2) + '\n', 'utf8')
  return index
}

module.exports = { buildDownloads, collectSkillEntries, readIntelAsOf, stampIntel }
```

Run `(cd apps/web && npx jest tests/lib/downloads.test.js)`. Expected: 4 passed.

- [ ] **6.3** Create `apps/web/lib/flat-prompt.js`. It's only used by Node scripts and tests, never from pages (D7).

```js
'use strict'

const path = require('path')
const { REPO_ROOT } = require('./site-paths')

// Phase 1 owns flattening (every phase of a skill in one markdown file).
// Contract: flattenSkill(absoluteSkillDir) → string | Promise<string>.
function loadFlattener () {
  const mod = require(path.join(REPO_ROOT, 'scripts', 'build-flat-prompts.js'))
  const fn = mod.flattenSkill // PHASE-1 BINDING
  if (typeof fn !== 'function') {
    throw new Error('scripts/build-flat-prompts.js must export flattenSkill(skillDir)')
  }
  return fn
}

module.exports = { loadFlattener }
```

Test file, `apps/web/tests/lib/flat-prompt.test.js`:

```js
'use strict'

const path = require('path')
const { loadFlattener } = require('../../lib/flat-prompt')
const { SKILLS_DIR } = require('../../lib/site-paths')

test('Phase 1 flattener returns the whole compliance skill as one markdown string', async () => {
  const text = await loadFlattener()(path.join(SKILLS_DIR, 'compliance'))
  expect(typeof text).toBe('string')
  expect(text.length).toBeGreaterThan(1000)
  expect(text).toMatch(/^#{1,3} /m)
})
```

- [ ] **6.4** Create `apps/web/scripts/build-downloads.js`:

```js
#!/usr/bin/env node
'use strict'

const path = require('path')
const { SKILLS_DIR, DOWNLOADS_DIR, REPO_ROOT, assertRepoLayout, aegisVersion } = require('../lib/site-paths')
const { buildDownloads } = require('../lib/downloads')
const { loadFlattener } = require('../lib/flat-prompt')

async function main () {
  assertRepoLayout()
  const index = await buildDownloads({
    skillsDir: SKILLS_DIR,
    outDir: DOWNLOADS_DIR,
    flatten: loadFlattener(),
    aegisVersion: aegisVersion()
  })
  const rel = path.relative(REPO_ROOT, DOWNLOADS_DIR).split(path.sep).join('/')
  console.log(`build-downloads: ${index.skills.length} prompts + ${index.skills.length} zips -> ${rel}`)
}

main().catch(err => {
  console.error(`build-downloads: ${err.message}`)
  process.exit(1)
})
```

- [ ] **6.5** Integration test against the real pack, `apps/web/tests/lib/build-downloads.integration.test.js`:

```js
'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { buildDownloads } = require('../../lib/downloads')
const { loadFlattener } = require('../../lib/flat-prompt')
const { SKILLS_DIR, aegisVersion } = require('../../lib/site-paths')
const { readZip } = require('../helpers/read-zip')

jest.setTimeout(60000)

test('every real skill gets a stamped prompt and a clean zip', async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-real-'))
  try {
    const index = await buildDownloads({ skillsDir: SKILLS_DIR, outDir: out, flatten: loadFlattener(), aegisVersion: aegisVersion() })
    const expected = fs.readdirSync(SKILLS_DIR).filter(n => fs.existsSync(path.join(SKILLS_DIR, n, 'SKILL.md')))
    expect(index.skills).toHaveLength(expected.length)
    expect(index.skills.length).toBe(24)
    for (const s of index.skills) {
      const prompt = fs.readFileSync(path.join(out, 'prompts', `${s.name}.md`), 'utf8')
      expect(prompt).toMatch(/intel as of/i)
      const names = readZip(fs.readFileSync(path.join(out, 'skills', `${s.name}.zip`))).map(e => e.name)
      expect(names).toContain(`${s.name}/SKILL.md`)
      expect(names).toContain(`${s.name}/skill.json`)
      expect(names.some(n => /intel-state\.json|\/artifacts\//.test(n))).toBe(false)
    }
  } finally {
    fs.rmSync(out, { recursive: true, force: true })
  }
})
```

- [ ] **6.6** Run:

```bash
(cd apps/web && npx jest tests/lib 2>&1 | tail -n 6)
npm run prebuild -w @aegis-skills/web
git status --porcelain apps/web/public
```

Expected:

- all `tests/lib` pass;
- `build-downloads: 24 prompts + 24 zips -> apps/web/public/downloads`;
- `git status` prints nothing, because the output is ignored.

Then run a manual zip sanity check with Windows' own unzip:

```bash
powershell -NoProfile -Command "Expand-Archive -Force apps/web/public/downloads/skills/compliance.zip $env:TEMP/aegis-zip-check; Get-ChildItem -Recurse $env:TEMP/aegis-zip-check | Select-Object -ExpandProperty FullName"
```

Expected: `compliance\SKILL.md`, `compliance\skill.json`, and `compliance\references\*.md` files only.

- [ ] **6.7** Commit:

```bash
git add apps/web/lib/flat-prompt.js apps/web/lib/downloads.js apps/web/scripts/build-downloads.js apps/web/tests/lib
git commit -m "feat(web): generate single-file prompts and skill zips at build time"
```

---

### Task 7 — Install commands data module

**Files:**

- Create: `apps/web/lib/install-commands.js`, `apps/web/tests/lib/install-commands.test.js`

**Executor:** sonnet

Rules for the bindings, using what P6 recorded:

- `MARKETPLACE` = the marketplace `name` from P6.
- `AEGIS_PLATFORM_IDS` = the enabled installer target ids from P6, in the order `claude, codex, gemini, cursor, vscode, antigravity`. Use Phase 1's id when it differs; for example, if VS Code's id is `copilot`, use `copilot` and keep the label `VS Code Copilot`. Drop any disabled target, from both the ids and the `skill-pack` platforms.
- `GEMINI_EXTENSION_INSTALL` = the exact line from P6, or `null` if P6 found none.
- Themis on Codex/Gemini: if P6 found install lines in `packages/themis-plugin/README.md`, use them verbatim as the `code` of those tabs. Otherwise keep the config snippets below.

- [ ] **7.1** Write the failing test, `apps/web/tests/lib/install-commands.test.js`:

```js
'use strict'

const fs = require('fs')
const path = require('path')
const { REPO_ROOT } = require('../../lib/site-paths')
const C = require('../../lib/install-commands')

const pkg = d => JSON.parse(fs.readFileSync(path.join(REPO_ROOT, d, 'package.json'), 'utf8'))
const allCode = C.PATHS.flatMap(p => p.platforms.flatMap(pl => pl.steps.map(s => s.code || ''))).join('\n')

test('package names match the workspace packages (contracts §3)', () => {
  expect(C.PACKAGES.aegis).toBe(pkg('packages/aegis').name)
  expect(C.PACKAGES.themisPlugin).toBe(pkg('packages/themis-plugin').name)
  expect(C.PACKAGES.themisApp).toBe(pkg('packages/themis-app').name)
})

test('bins used by the commands exist', () => {
  expect(Object.keys(pkg('packages/aegis').bin)).toContain('aegis')
  expect(Object.keys(pkg('packages/themis-app').bin)).toContain('themis')
  const pluginBin = pkg('packages/themis-plugin').bin
  expect(typeof pluginBin === 'string' || Object.keys(pluginBin).length === 1).toBe(true) // npx needs one bin
})

test('marketplace name and plugin names match .claude-plugin/marketplace.json', () => {
  const m = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.claude-plugin', 'marketplace.json'), 'utf8'))
  expect(C.MARKETPLACE).toBe(m.name)
  expect(m.plugins.map(p => p.name)).toEqual(expect.arrayContaining(['aegis', 'themis']))
})

test('every --platform id is a real installer target', () => {
  const targets = fs.readFileSync(path.join(REPO_ROOT, 'packages', 'aegis', 'lib', 'targets.js'), 'utf8')
  for (const id of C.AEGIS_PLATFORM_IDS) expect(targets).toMatch(new RegExp(`['"]${id}['"]`))
  for (const m of allCode.matchAll(/install --platform ([a-z-]+)/g)) expect(C.AEGIS_PLATFORM_IDS).toContain(m[1])
})

test('the five paths are present in master-plan order with unique platform ids', () => {
  expect(C.PATHS.map(p => p.id)).toEqual(['zero-install', 'hosted-mcp', 'skill-pack', 'themis-plugin', 'themis-app'])
  for (const p of C.PATHS) {
    const ids = p.platforms.map(x => x.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(p.docs).toMatch(/^\/docs\//)
  }
})

test('no removed product appears in any command or note', () => {
  const all = JSON.stringify(C.PATHS)
  for (const bad of ['@aegis-skills/core', 'openai-action', 'ChatGPT Action', 'aegis compile', '/api/themis']) {
    expect(all).not.toContain(bad)
  }
  expect(allCode).toContain('npx @aegis-skills/themis dashboard')
  expect(allCode).toContain(C.MCP_URL)
})
```

Run it. Expected: FAIL, module not found.

- [ ] **7.2** Create `apps/web/lib/install-commands.js`, applying the binding rules above:

```js
'use strict'

// Single source of truth for every install command shown on the site.
// Pinned against repo facts by tests/lib/install-commands.test.js.
const SITE_URL = 'https://aegis-skills.vercel.app'
const REPO = 'drupadsachania/aegis-skills'
const REPO_URL = `https://github.com/${REPO}`
const MCP_URL = `${SITE_URL}/api/mcp`
const MARKETPLACE = 'aegis-skills' // PHASE-1 BINDING
const PACKAGES = { aegis: 'aegis-skills', themisPlugin: '@aegis-skills/themis-plugin', themisApp: '@aegis-skills/themis' }
const AEGIS_PLATFORM_IDS = ['claude', 'codex', 'gemini', 'cursor', 'vscode', 'antigravity'] // PHASE-1 BINDING
const GEMINI_EXTENSION_INSTALL = `gemini extensions install ${REPO_URL}` // PHASE-1 BINDING (null if not offered)

const aegisInstall = id => `npx ${PACKAGES.aegis} install --platform ${id}`
const marketplaceAdd = `/plugin marketplace add ${REPO}`
const sh = code => ({ label: 'shell', code })
const json = obj => JSON.stringify(obj, null, 2)
const stdio = (pkgArgs) => ({ command: 'npx', args: ['-y', ...pkgArgs] })

const PATHS = [
  {
    id: 'zero-install', title: 'Zero install', audience: 'Anyone, in any chat AI',
    how: 'Copy a single-file prompt or download a skill zip.', docs: '/docs/aegis/single-file-prompts',
    platforms: [
      { id: 'claude-ai', label: 'Claude.ai', steps: [
        { text: 'Open a skill page and download its zip.' },
        { text: 'In Claude.ai open Settings → Capabilities → Skills → Upload skill, and choose the zip.' }] },
      { id: 'chatgpt', label: 'ChatGPT', steps: [
        { text: 'Open a skill page and download the single-file prompt (.md).' },
        { text: 'Add the file to a Project or attach it to a chat, and ask ChatGPT to follow it.' }] },
      { id: 'any', label: 'Any chat AI', steps: [
        { text: 'Copy the single-file prompt from a skill page. Paste it as your first message, or save it as the system prompt or custom instructions where your tool allows.' }] }
    ]
  },
  {
    id: 'hosted-mcp', title: 'Hosted MCP', audience: 'Claude.ai, ChatGPT and any MCP client',
    how: 'Connect to the hosted, read-only Aegis MCP server.', docs: '/docs/web/hosted-mcp',
    platforms: [
      { id: 'claude-ai', label: 'Claude.ai', steps: [
        { text: 'Settings → Connectors → Add custom connector. Name it Aegis and paste this URL:' },
        { label: 'URL', code: MCP_URL }] },
      { id: 'chatgpt', label: 'ChatGPT', steps: [
        { text: 'Settings → Apps & Connectors → Advanced settings → turn on Developer mode. Create a connector, paste this URL and choose "No authentication".' },
        { label: 'URL', code: MCP_URL }] },
      { id: 'claude-code', label: 'Claude Code', steps: [sh(`claude mcp add --transport http aegis ${MCP_URL}`)] },
      { id: 'cursor', label: 'Cursor', steps: [
        { text: 'Add to ~/.cursor/mcp.json:' },
        { label: 'mcp.json', code: json({ mcpServers: { aegis: { url: MCP_URL } } }) }] },
      { id: 'vscode', label: 'VS Code', steps: [
        { text: 'Add to .vscode/mcp.json:' },
        { label: 'mcp.json', code: json({ servers: { aegis: { type: 'http', url: MCP_URL } } }) }] },
      { id: 'generic', label: 'Other clients', steps: [
        { text: 'Any client that speaks MCP Streamable HTTP. No authentication, no session.' },
        { label: 'URL', code: MCP_URL }] }
    ]
  },
  {
    id: 'skill-pack', title: 'Skill pack', audience: 'Coding assistants',
    how: "Install every skill into your assistant's native skills folder.", docs: '/docs/aegis/install',
    platforms: [
      { id: 'claude', label: 'Claude Code', steps: [
        { text: 'Inside Claude Code:' },
        { label: 'Claude Code', code: `${marketplaceAdd}\n/plugin install aegis@${MARKETPLACE}` },
        { text: 'Or from a terminal:' }, sh(aegisInstall('claude'))] },
      { id: 'codex', label: 'Codex', steps: [sh(aegisInstall('codex'))] },
      { id: 'gemini', label: 'Gemini CLI', steps: [
        ...(GEMINI_EXTENSION_INSTALL ? [sh(GEMINI_EXTENSION_INSTALL), { text: 'Or:' }] : []),
        sh(aegisInstall('gemini'))] },
      { id: 'cursor', label: 'Cursor', steps: [sh(aegisInstall('cursor'))] },
      { id: 'vscode', label: 'VS Code Copilot', steps: [sh(aegisInstall('vscode'))] },
      { id: 'antigravity', label: 'Antigravity', steps: [sh(aegisInstall('antigravity'))] }
    ]
  },
  {
    id: 'themis-plugin', title: 'Themis on your AI', audience: 'Claude Code, Codex, Gemini CLI',
    how: 'Install the Themis plugin. Your assistant is the model, so no API key is needed.', docs: '/docs/themis/mode-1-plugin',
    platforms: [
      { id: 'claude', label: 'Claude Code', steps: [
        { label: 'Claude Code', code: `${marketplaceAdd}\n/plugin install themis@${MARKETPLACE}` }] },
      { id: 'codex', label: 'Codex', steps: [ // PHASE-3 BINDING
        { text: 'Add to ~/.codex/config.toml:' },
        { label: 'config.toml', code: '[mcp_servers.aegis]\ncommand = "npx"\nargs = ["-y", "aegis-skills", "mcp"]\n\n[mcp_servers.themis]\ncommand = "npx"\nargs = ["-y", "@aegis-skills/themis-plugin"]' }] },
      { id: 'gemini', label: 'Gemini CLI', steps: [ // PHASE-3 BINDING
        { text: 'Add to ~/.gemini/settings.json:' },
        { label: 'settings.json', code: json({ mcpServers: { aegis: stdio([PACKAGES.aegis, 'mcp']), themis: stdio([PACKAGES.themisPlugin]) } }) }] }
    ]
  },
  {
    id: 'themis-app', title: 'Themis standalone', audience: 'A local SOC dashboard',
    how: 'Run Themis with its own web UI on 127.0.0.1, using your own key or a local model.', docs: '/docs/themis/mode-2-app',
    platforms: [
      { id: 'npx', label: 'Run with npx', steps: [
        { text: 'Needs Node.js 22.13 or later. No Docker, no build tools.' },
        sh(`npx ${PACKAGES.themisApp} dashboard`)] },
      { id: 'global', label: 'Global install', steps: [sh(`npm install -g ${PACKAGES.themisApp}\nthemis dashboard`)] }
    ]
  }
]

module.exports = { SITE_URL, REPO, REPO_URL, MCP_URL, MARKETPLACE, PACKAGES, AEGIS_PLATFORM_IDS, GEMINI_EXTENSION_INSTALL, PATHS }
```

Note: `PACKAGES.themisApp` is `@aegis-skills/themis`, so the command reads `npx @aegis-skills/themis dashboard`, which is what the test expects.

- [ ] **7.3** Run `(cd apps/web && npx jest tests/lib/install-commands.test.js)`. Expected: 6 passed. If the marketplace or targets tests fail, re-apply the binding rules from P6. Don't change the tests.

- [ ] **7.4** Commit:

```bash
git add apps/web/lib/install-commands.js apps/web/tests/lib/install-commands.test.js
git commit -m "feat(web): single source of truth for install commands"
```

---

### Task 8 — Markdown rendering, docs loader, skill-page helpers

**Files:**

- Create: `apps/web/lib/markdown.js`, `apps/web/lib/docs.js`, `apps/web/lib/skill-page.js`
- Create tests: `apps/web/tests/lib/{markdown,docs,skill-page}.test.js`

**Executor:** sonnet

- [ ] **8.1** Write the failing markdown test, `apps/web/tests/lib/markdown.test.js`:

```js
'use strict'

const { renderMarkdown, rewriteHref } = require('../../lib/markdown')

test('renders GFM tables and code', () => {
  const html = renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |\n\n`x`')
  expect(html).toContain('<table>')
  expect(html).toContain('<code>x</code>')
})

test('escapes block and inline raw HTML', () => {
  const html = renderMarkdown('<script>alert(1)</script>\n\nhello <b onclick="x()">bold</b>')
  expect(html).not.toMatch(/<script|<b /)
  expect(html).toContain('&lt;script&gt;')
  expect(html).toContain('&lt;b onclick=')
})

test('neutralises non-http link schemes', () => {
  expect(renderMarkdown('[x](javascript:alert(1))')).not.toContain('javascript:')
})

test('rewrites relative doc links to site routes and repo files to GitHub', () => {
  const at = 'docs/aegis/install.md'
  expect(rewriteHref('./mcp.md', at)).toBe('/docs/aegis/mcp')
  expect(rewriteHref('../themis/index.md#modes', at)).toBe('/docs/themis#modes')
  expect(rewriteHref('../../SECURITY.md', at)).toBe('https://github.com/drupadsachania/aegis-skills/blob/main/SECURITY.md')
  expect(rewriteHref('https://example.com', at)).toBe('https://example.com')
  expect(rewriteHref('/skills', at)).toBe('/skills')
  expect(rewriteHref('#top', at)).toBe('#top')
})
```

- [ ] **8.2** Create `apps/web/lib/markdown.js`:

```js
'use strict'

const path = require('path')
const { Marked } = require('marked')

const REPO_BLOB = 'https://github.com/drupadsachania/aegis-skills/blob/main/'
const SAFE_SCHEME = /^(https?:|mailto:)/i
const ANY_SCHEME = /^[a-z][a-z0-9+.-]*:/i

function escapeHtml (s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// docPath: source file relative to the repo root, POSIX style (e.g. 'docs/aegis/install.md').
function rewriteHref (href, docPath) {
  if (!href) return href
  if (ANY_SCHEME.test(href)) return SAFE_SCHEME.test(href) ? href : '#'
  if (href.startsWith('#') || href.startsWith('/') || !docPath) return href
  const [target, hash] = href.split('#')
  const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(docPath), target))
  if (resolved.startsWith('..')) return '#'
  const m = /^docs\/(aegis|themis|web)\/([a-z0-9-]+)\.md$/.exec(resolved)
  const out = m ? (m[2] === 'index' ? `/docs/${m[1]}` : `/docs/${m[1]}/${m[2]}`) : REPO_BLOB + resolved
  return hash ? `${out}#${hash}` : out
}

// Repo-authored markdown → HTML. Raw HTML is always escaped, never passed through.
function renderMarkdown (md, { docPath = null } = {}) {
  const marked = new Marked({
    gfm: true,
    async: false,
    walkTokens (token) {
      if (token.type === 'link' || token.type === 'image') token.href = rewriteHref(token.href, docPath)
    },
    renderer: {
      html (token) { return escapeHtml(token.text) }
    }
  })
  return marked.parse(String(md))
}

module.exports = { renderMarkdown, rewriteHref, escapeHtml }
```

Run the test. Expected: 4 passed. If the raw-HTML test fails because `token` is a string, the wrong `marked` major is installed → STOP.

- [ ] **8.3** Write the failing docs-loader test, `apps/web/tests/lib/docs.test.js`. It uses a temp fixture; the real-content test comes in Task 19.

```js
'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { SECTIONS, listDocs, loadDoc } = require('../../lib/docs')

let dir
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-'))
  fs.mkdirSync(path.join(dir, 'aegis'))
  fs.writeFileSync(path.join(dir, 'aegis', 'index.md'), '# Aegis\n\nHi')
  fs.writeFileSync(path.join(dir, 'aegis', 'install.md'), '# Install Aegis\n')
  fs.writeFileSync(path.join(dir, 'aegis', 'zz-extra.md'), '# Extra\n')
  fs.writeFileSync(path.join(dir, 'aegis', 'Bad Name.md'), '# no\n')
})
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }))

test('sections are aegis, themis, web in that order', () => {
  expect(SECTIONS.map(s => s.key)).toEqual(['aegis', 'themis', 'web'])
})

test('listDocs orders known pages first, appends unknown ones, skips unsafe names', () => {
  const aegis = listDocs(dir).find(s => s.key === 'aegis')
  expect(aegis.pages.map(p => p.slug)).toEqual(['index', 'install', 'zz-extra'])
  expect(aegis.pages[0]).toEqual({ slug: 'index', title: 'Aegis', href: '/docs/aegis' })
  expect(aegis.pages[1].href).toBe('/docs/aegis/install')
  expect(listDocs(dir).find(s => s.key === 'web').pages).toEqual([])
})

test('loadDoc returns content and refuses unknown sections or unsafe slugs', () => {
  expect(loadDoc(dir, 'aegis', 'install')).toMatchObject({ title: 'Install Aegis', docPath: 'docs/aegis/install.md' })
  expect(loadDoc(dir, 'aegis')).toMatchObject({ slug: 'index', title: 'Aegis' })
  expect(loadDoc(dir, 'secrets', 'index')).toBeNull()
  expect(loadDoc(dir, 'aegis', '../x')).toBeNull()
  expect(loadDoc(dir, 'aegis', 'missing')).toBeNull()
})
```

- [ ] **8.4** Create `apps/web/lib/docs.js`:

```js
'use strict'

const fs = require('fs')
const path = require('path')

const SECTIONS = [
  { key: 'aegis', title: 'Aegis', blurb: 'The skill pack: install, prompts, MCP, CLI, format and intel.',
    pages: ['index', 'install', 'single-file-prompts', 'mcp', 'cli', 'skill-format', 'intel'] },
  { key: 'themis', title: 'Themis', blurb: 'The SOC agent: plugin mode, standalone app and governance.',
    pages: ['index', 'mode-1-plugin', 'mode-2-app', 'governance', 'workflow', 'configuration', 'versions'] },
  { key: 'web', title: 'Website & hosted MCP', blurb: 'Hosted MCP, downloads, read-only API and running the site.',
    pages: ['index', 'hosted-mcp', 'downloads', 'api', 'development'] }
]
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/

function titleOf (markdown, fallback) {
  const m = /^#\s+(.+?)\s*$/m.exec(markdown)
  return m ? m[1] : fallback
}

const hrefOf = (section, slug) => (slug === 'index' ? `/docs/${section}` : `/docs/${section}/${slug}`)

function listDocs (docsDir) {
  return SECTIONS.map(sec => {
    const dir = path.join(docsDir, sec.key)
    const onDisk = fs.existsSync(dir)
      ? fs.readdirSync(dir).filter(f => f.endsWith('.md')).map(f => f.slice(0, -3)).filter(s => SLUG.test(s))
      : []
    const ordered = sec.pages.filter(p => onDisk.includes(p))
      .concat(onDisk.filter(p => !sec.pages.includes(p)).sort())
    return {
      key: sec.key,
      title: sec.title,
      blurb: sec.blurb,
      pages: ordered.map(slug => ({
        slug,
        title: titleOf(fs.readFileSync(path.join(dir, `${slug}.md`), 'utf8'), slug),
        href: hrefOf(sec.key, slug)
      }))
    }
  })
}

function loadDoc (docsDir, section, slug = 'index') {
  if (!SECTIONS.some(s => s.key === section) || typeof slug !== 'string' || !SLUG.test(slug)) return null
  const file = path.join(docsDir, section, `${slug}.md`)
  if (!fs.existsSync(file)) return null
  const markdown = fs.readFileSync(file, 'utf8')
  return { section, slug, title: titleOf(markdown, slug), markdown, docPath: `docs/${section}/${slug}.md`, href: hrefOf(section, slug) }
}

module.exports = { SECTIONS, listDocs, loadDoc, titleOf }
```

Run the test. Expected: 3 passed.

- [ ] **8.5** Write the failing test for skill-page helpers, `apps/web/tests/lib/skill-page.test.js`:

```js
'use strict'

const { stripFrontmatter, extractSection } = require('../../lib/skill-page')

const MD = '---\r\nname: x\r\n---\r\n# X\n\nIntro\n\n## Scope and authorization\n- Purpose: defend\n- Use only on systems you own or are explicitly authorized to assess.\n\n## Phases\nmore'

test('stripFrontmatter removes the YAML block (CRLF safe)', () => {
  expect(stripFrontmatter(MD).startsWith('# X')).toBe(true)
  expect(stripFrontmatter('# none')).toBe('# none')
})

test('extractSection returns the body up to the next h1/h2', () => {
  expect(extractSection(stripFrontmatter(MD), 'Scope and authorization'))
    .toBe('- Purpose: defend\n- Use only on systems you own or are explicitly authorized to assess.')
  expect(extractSection(MD, 'Missing')).toBeNull()
})
```

- [ ] **8.6** Create `apps/web/lib/skill-page.js`:

```js
'use strict'

function stripFrontmatter (md) {
  return String(md).replace(/^﻿?---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
}

// Body of "## <heading>" up to the next h1/h2, trimmed; null when absent or empty.
function extractSection (md, heading) {
  const lines = String(md).split(/\r?\n/)
  const want = `## ${heading}`.toLowerCase()
  const start = lines.findIndex(l => l.trim().toLowerCase() === want)
  if (start === -1) return null
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (/^#{1,2}\s/.test(lines[i])) { end = i; break }
  }
  const text = lines.slice(start + 1, end).join('\n').trim()
  return text || null
}

module.exports = { stripFrontmatter, extractSection }
```

Run `(cd apps/web && npx jest tests/lib 2>&1 | tail -n 6)`. Expected: all pass.

- [ ] **8.7** Commit:

```bash
git add apps/web/lib/markdown.js apps/web/lib/docs.js apps/web/lib/skill-page.js apps/web/tests/lib
git commit -m "feat(web): markdown rendering with escaped HTML, docs loader, skill-page helpers"
```

---

### Task 9 — Components

**Files:**

- Create: `apps/web/components/CodeBlock.js`, `PathMatrix.js`, `Screenshot.js`
- Rewrite: `InstallTabs.js`, `PlatformBadge.js`, `Layout.js`
- Delete: `HealthBadge.js`, `SkillCard.js`, `tests/components/HealthBadge.test.js`, `tests/components/SkillCard.test.js`
- Tests: rewrite `tests/components/InstallTabs.test.js`; create `PathMatrix.test.js`, `PlatformBadge.test.js`, `Layout.test.js`

**Executor:** sonnet

Component reuse plan:

| Component | Decision |
|---|---|
| `CopyButton` | Keep unchanged. Its test stays. |
| `InstallTabs` | Rewrite as generic `{ tabs: [{ id, label, steps: [{ text?, label?, code? }] }] }`. No ChatGPT Action panel, no all-platforms table. |
| `CodeBlock` | New, extracted verbatim from the old `InstallTabs` `CodeBlock`. |
| `PlatformBadge` | Rewrite labels for the new platform ids. |
| `Layout` | Rewrite: new nav and footer, `<Head>` title/description. |
| `PathMatrix` | New. |
| `Screenshot` | New: image if present, otherwise a placeholder. |
| `HealthBadge`, `SkillCard` | Delete (unused, D10). |

- [ ] **9.1** Write the failing tests.

`apps/web/tests/components/InstallTabs.test.js` (replace the whole file):

```js
/**
 * @jest-environment jsdom
 */
'use strict'

const React = require('react')
const { render, screen } = require('@testing-library/react')
const userEvent = require('@testing-library/user-event').default
require('@testing-library/jest-dom')
const InstallTabs = require('../../components/InstallTabs')

const TABS = [
  { id: 'claude', label: 'Claude Code', steps: [{ text: 'Inside Claude Code:' }, { label: 'shell', code: '/plugin install aegis@aegis-skills' }] },
  { id: 'codex', label: 'Codex', steps: [{ label: 'shell', code: 'npx aegis-skills install --platform codex' }] }
]

test('shows the first tab by default with its note and code', () => {
  render(React.createElement(InstallTabs, { tabs: TABS }))
  expect(screen.getByRole('tab', { name: 'Claude Code' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByText('Inside Claude Code:')).toBeInTheDocument()
  expect(screen.getByText('/plugin install aegis@aegis-skills')).toBeInTheDocument()
})

test('switches tabs', async () => {
  render(React.createElement(InstallTabs, { tabs: TABS }))
  await userEvent.setup().click(screen.getByRole('tab', { name: 'Codex' }))
  expect(screen.getByText('npx aegis-skills install --platform codex')).toBeInTheDocument()
  expect(screen.queryByText('Inside Claude Code:')).not.toBeInTheDocument()
})

test('renders one copy button per code block and nothing for empty tabs', () => {
  const { container } = render(React.createElement(InstallTabs, { tabs: TABS }))
  expect(screen.getAllByRole('button', { name: 'COPY' })).toHaveLength(1)
  expect(render(React.createElement(InstallTabs, { tabs: [] })).container.innerHTML).toBe('')
  expect(container.textContent).not.toMatch(/ChatGPT Action/)
})
```

`apps/web/tests/components/PathMatrix.test.js`:

```js
/**
 * @jest-environment jsdom
 */
'use strict'

const React = require('react')
const { render, screen } = require('@testing-library/react')
require('@testing-library/jest-dom')
const PathMatrix = require('../../components/PathMatrix')
const { PATHS } = require('../../lib/install-commands')

test('one row per path with a link to its section', () => {
  render(React.createElement(PathMatrix, { paths: PATHS }))
  expect(screen.getAllByRole('row')).toHaveLength(PATHS.length + 1)
  expect(screen.getByText('Themis standalone')).toBeInTheDocument()
  const links = screen.getAllByRole('link', { name: /set up/i })
  expect(links.map(a => a.getAttribute('href'))).toEqual(PATHS.map(p => `/paths#${p.id}`))
})
```

`apps/web/tests/components/PlatformBadge.test.js`:

```js
/**
 * @jest-environment jsdom
 */
'use strict'

const React = require('react')
const { render, screen } = require('@testing-library/react')
require('@testing-library/jest-dom')
const PlatformBadge = require('../../components/PlatformBadge')

test.each([['claude', 'Claude'], ['chatgpt', 'ChatGPT'], ['codex', 'Codex'], ['vscode', 'VS Code'], ['other-x', 'other-x']])(
  '%s → %s', (id, label) => {
    render(React.createElement(PlatformBadge, { platform: id }))
    expect(screen.getByText(label)).toBeInTheDocument()
  })
```

`apps/web/tests/components/Layout.test.js`:

```js
/**
 * @jest-environment jsdom
 */
'use strict'

const React = require('react')
const { render, screen } = require('@testing-library/react')
require('@testing-library/jest-dom')
const Layout = require('../../components/Layout')

test('nav links, footer licence and children', () => {
  render(React.createElement(Layout, { title: 'T' }, React.createElement('p', null, 'child')))
  const nav = screen.getByRole('navigation', { name: 'Main' })
  const hrefs = Array.from(nav.querySelectorAll('a')).map(a => a.getAttribute('href'))
  expect(hrefs).toEqual(['/', '/skills', '/paths', '/themis', '/mcp', '/docs', 'https://github.com/drupadsachania/aegis-skills'])
  expect(screen.getByText('Apache-2.0 OR MIT')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Security' })).toHaveAttribute('href', '/security')
  expect(screen.getByRole('link', { name: 'License' })).toHaveAttribute('href', '/license')
  expect(screen.getByText('child')).toBeInTheDocument()
})
```

Run `(cd apps/web && npx jest tests/components)`. Expected: the new tests FAIL.

- [ ] **9.2** Create `apps/web/components/CodeBlock.js`:

```js
'use strict'

const React = require('react')
const CopyButton = require('./CopyButton')

function CodeBlock ({ label, content }) {
  return React.createElement(
    'div',
    { className: 'code-block' },
    React.createElement(
      'div',
      { className: 'code-hd' },
      React.createElement('span', { className: 'code-hd-label' }, label),
      React.createElement(CopyButton, { text: content, label: 'COPY' })
    ),
    React.createElement('pre', { className: 'code-body' }, content)
  )
}

module.exports = CodeBlock
module.exports.default = CodeBlock
```

- [ ] **9.3** Replace `apps/web/components/InstallTabs.js`:

```js
'use strict'

const React = require('react')
const { useState } = React
const CodeBlock = require('./CodeBlock')

const h = React.createElement

/**
 * Generic install tabs.
 * @param {{ tabs: { id: string, label: string, steps: { text?: string, label?: string, code?: string }[] }[] }} props
 */
function InstallTabs ({ tabs }) {
  const [active, setActive] = useState(tabs && tabs[0] ? tabs[0].id : null)
  if (!tabs || tabs.length === 0) return null
  const current = tabs.find(t => t.id === active) || tabs[0]

  return h(
    'div',
    { className: 'install-tabs' },
    h(
      'div',
      { className: 'install-tab-bar', role: 'tablist' },
      ...tabs.map(t => h(
        'button',
        {
          key: t.id,
          type: 'button',
          role: 'tab',
          'aria-selected': t.id === current.id,
          className: ['install-tab-btn', t.id === current.id ? 'active' : ''].join(' ').trim(),
          onClick: () => setActive(t.id)
        },
        t.label
      ))
    ),
    h(
      'div',
      { className: 'install-tab-content', role: 'tabpanel' },
      ...current.steps.map((s, i) => h(
        React.Fragment,
        { key: `${current.id}-${i}` },
        s.text ? h('p', { className: 'install-note' }, s.text) : null,
        s.code ? h(CodeBlock, { label: s.label || 'shell', content: s.code }) : null
      ))
    )
  )
}

module.exports = InstallTabs
module.exports.default = InstallTabs
```

- [ ] **9.4** Replace `apps/web/components/PlatformBadge.js`:

```js
'use strict'

const React = require('react')

const PLATFORM_LABELS = {
  claude: 'Claude',
  'claude-ai': 'Claude.ai',
  'claude-code': 'Claude Code',
  chatgpt: 'ChatGPT',
  codex: 'Codex',
  gemini: 'Gemini',
  cursor: 'Cursor',
  vscode: 'VS Code',
  antigravity: 'Antigravity'
}

function PlatformBadge ({ platform }) {
  return React.createElement('span', { className: 'platform-badge' }, PLATFORM_LABELS[platform] || platform)
}

module.exports = PlatformBadge
module.exports.default = PlatformBadge
```

- [ ] **9.5** Create `apps/web/components/PathMatrix.js`:

```js
'use strict'

const React = require('react')

const h = React.createElement

function PathMatrix ({ paths, linkBase = '/paths' }) {
  return h(
    'div',
    { style: { border: '1px solid var(--border-dim)', overflowX: 'auto' } },
    h(
      'table',
      { className: 'platforms-table path-matrix' },
      h('thead', null, h('tr', null,
        h('th', null, 'Path'), h('th', null, 'For'), h('th', null, 'How'), h('th', null, ''))),
      h('tbody', null, ...paths.map(p => h(
        'tr',
        { key: p.id },
        h('td', { className: 'pm-title' }, p.title),
        h('td', null, p.audience),
        h('td', null, p.how),
        h('td', null, h('a', { href: `${linkBase}#${p.id}`, className: 'twin-link' }, 'Set up →'))
      )))
    )
  )
}

module.exports = PathMatrix
module.exports.default = PathMatrix
```

- [ ] **9.6** Create `apps/web/components/Screenshot.js`:

```js
'use strict'

const React = require('react')

const h = React.createElement

// `exists` is decided at build time (getStaticProps) so a missing image renders a placeholder.
function Screenshot ({ src, alt, caption, exists }) {
  return h(
    'figure',
    { className: 'screenshot' },
    exists
      ? h('img', { src, alt, loading: 'lazy', width: 1600, height: 1000 })
      : h('div', { className: 'screenshot-placeholder', role: 'img', 'aria-label': alt }, `Screenshot pending: ${alt}`),
    h('figcaption', null, caption)
  )
}

module.exports = Screenshot
module.exports.default = Screenshot
```

- [ ] **9.7** Replace `apps/web/components/Layout.js`:

```js
'use strict'

const React = require('react')
const Head = require('next/head').default || require('next/head')

const h = React.createElement
const SITE = 'Aegis + Themis'
const DEFAULT_DESCRIPTION = 'Open cybersecurity skill pack and a governed SOC agent that runs on your own AI. Apache-2.0 OR MIT.'
const REPO_URL = 'https://github.com/drupadsachania/aegis-skills'
const NAV = [
  { href: '/skills', label: 'Skills' },
  { href: '/paths', label: 'Choose a path' },
  { href: '/themis', label: 'Themis' },
  { href: '/mcp', label: 'Hosted MCP' },
  { href: '/docs', label: 'Docs' }
]
const FOOTER = [
  { href: '/security', label: 'Security' },
  { href: '/license', label: 'License' },
  { href: '/docs', label: 'Docs' }
]

const external = (href, label) => h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, label)

function Layout ({ title, description, children }) {
  return h(
    'div',
    { className: 'page-root' },
    h(Head, null,
      h('title', null, title ? `${title} · ${SITE}` : SITE),
      h('meta', { name: 'description', content: description || DEFAULT_DESCRIPTION })),
    h(
      'nav',
      { className: 'nav-root', 'aria-label': 'Main' },
      h('a', { href: '/', className: 'nav-brand' }, h('span', { className: 'nav-glyph' }), 'AEGIS · THEMIS'),
      h('ul', { className: 'nav-links' },
        ...NAV.map(l => h('li', { key: l.href }, h('a', { href: l.href }, l.label))),
        h('li', { key: 'github' }, external(REPO_URL, 'GitHub ↗')))
    ),
    h('main', { style: { position: 'relative', zIndex: 1 } }, children),
    h(
      'footer',
      { className: 'footer-root' },
      h('div', { className: 'footer-inner' },
        h('span', { className: 'footer-brand' }, SITE),
        h('div', { className: 'footer-right' },
          ...FOOTER.map(l => h('a', { key: l.label, href: l.href }, l.label)),
          external(REPO_URL, 'GitHub'),
          external('https://kairo-foundation.org', 'Kairo Foundation'),
          h('span', { className: 'footer-copy' }, 'Apache-2.0 OR MIT')))
    )
  )
}

module.exports = Layout
module.exports.default = Layout
```

Note: the footer contains a second `/docs` link. The Layout test reads nav hrefs only from inside `<nav>`, so that's fine.

- [ ] **9.8** Delete the unused components:

```bash
git rm -q apps/web/components/HealthBadge.js apps/web/components/SkillCard.js apps/web/tests/components/HealthBadge.test.js apps/web/tests/components/SkillCard.test.js
(cd apps/web && npx jest tests/components 2>&1 | tail -n 6)
```

Expected: all pass. That's CopyButton, InstallTabs (3), PathMatrix (1), PlatformBadge (5) and Layout (1).

- [ ] **9.9** Commit:

```bash
git add -A apps/web/components apps/web/tests/components
git commit -m "feat(web): generic install tabs, path matrix, screenshot, new layout"
```

The old `pages/skills/[name].js` still passes the old props to `InstallTabs`. That's harmless at runtime until Task 12 and isn't exercised by tests.

---

### Task 10 — Styles

**Files:**

- Modify: `apps/web/styles/globals.css` (append only)

**Executor:** haiku

- [ ] **10.1** Append this block to the end of `apps/web/styles/globals.css`, unchanged:

```css
/* ─────────────────────────────────────────────
   Phase 5 — docs hub, paths, downloads, screenshots
───────────────────────────────────────────── */
.prose { color: var(--cream-dim); font-size: 15px; line-height: 1.75; max-width: 760px; }
.prose h1 { font-family: var(--f-display); font-weight: 400; font-size: clamp(36px, 5vw, 56px); color: var(--cream); line-height: 1.05; margin: 0 0 24px; }
.prose h2 { font-family: var(--f-display); font-weight: 400; font-size: 28px; color: var(--cream); margin: 48px 0 16px; }
.prose h3 { font-size: 17px; color: var(--cream); margin: 32px 0 12px; }
.prose p, .prose ul, .prose ol, .prose table, .prose pre, .prose blockquote { margin: 0 0 18px; }
.prose ul, .prose ol { padding-left: 22px; }
.prose ul { list-style: disc; }
.prose ol { list-style: decimal; }
.prose li { margin: 4px 0; }
.prose a { color: var(--gold); text-decoration: underline; text-underline-offset: 3px; }
.prose code { font-family: var(--f-mono); font-size: 0.9em; background: var(--bg-soft); padding: 1px 6px; border-radius: 4px; }
.prose pre { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 16px; overflow-x: auto; }
.prose pre code { background: none; padding: 0; }
.prose table { width: 100%; border-collapse: collapse; font-size: 14px; display: block; overflow-x: auto; }
.prose th, .prose td { border: 1px solid var(--border-dim); padding: 8px 10px; text-align: left; vertical-align: top; }
.prose th { color: var(--cream); }
.prose blockquote { border-left: 2px solid var(--gold); padding-left: 14px; color: var(--muted); }

.docs-layout { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 48px; padding: 80px 0 120px; }
.docs-nav { position: sticky; top: 88px; align-self: start; font-size: 13px; }
.docs-nav h4 { font-family: var(--f-mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--faint); margin: 20px 0 8px; }
.docs-nav a { display: block; color: var(--muted); padding: 3px 0; }
.docs-nav a[aria-current="page"] { color: var(--gold); }
.docs-edit { margin-top: 48px; font-family: var(--f-mono); font-size: 11px; }
.docs-edit a { color: var(--muted); }
.doc-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; }
.doc-card { border: 1px solid var(--border); border-radius: 8px; padding: 20px; background: var(--bg-soft); }
.doc-card h3 { color: var(--cream); margin-bottom: 8px; }
.doc-card p { color: var(--muted); font-size: 13px; }
.doc-card ul { list-style: none; padding: 0; margin: 12px 0 0; }
.doc-card a { color: var(--cream-dim); font-size: 13px; line-height: 1.9; }

.path-matrix td.pm-title { color: var(--cream); font-family: var(--f-mono); font-size: 12px; white-space: nowrap; }
.path-section { padding: 48px 0; border-top: 1px solid var(--border-dim); scroll-margin-top: 80px; }
.path-section h2 { font-family: var(--f-display); font-weight: 400; font-size: 32px; color: var(--cream); margin-bottom: 8px; }
.path-section .path-for { font-family: var(--f-mono); font-size: 11px; color: var(--gold); letter-spacing: 0.08em; margin-bottom: 16px; }

.download-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
.download-card { border: 1px solid var(--border); border-radius: 8px; padding: 20px; background: var(--bg-soft); display: flex; flex-direction: column; gap: 12px; }
.download-card h3 { color: var(--cream); font-size: 17px; }
.download-card .meta { font-family: var(--f-mono); font-size: 11px; color: var(--muted); }
.download-actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }

.screenshot-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; }
.screenshot { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; margin: 0; }
.screenshot img { display: block; width: 100%; height: auto; }
.screenshot-placeholder { aspect-ratio: 16 / 10; display: flex; align-items: center; justify-content: center; text-align: center; padding: 24px; color: var(--faint); font-family: var(--f-mono); font-size: 12px; background: var(--bg-soft); }
.screenshot figcaption { padding: 10px 14px; font-size: 12px; color: var(--muted); border-top: 1px solid var(--border-dim); }

.compare-table td:first-child { color: var(--cream); white-space: nowrap; }
.page-head { padding: 80px 0 32px; }
.page-head h1 { font-family: var(--f-display); font-weight: 400; font-size: clamp(44px, 6vw, 76px); line-height: 1.0; letter-spacing: -0.02em; color: var(--cream); margin-bottom: 16px; }
.page-head p { color: var(--cream-dim); font-size: 17px; max-width: 680px; line-height: 1.65; font-weight: 300; }

@media (max-width: 860px) {
  .docs-layout { grid-template-columns: 1fr; gap: 24px; padding-top: 64px; }
  .docs-nav { position: static; }
}
```

- [ ] **10.2** Check that every `var(--…)` used above exists:

```bash
for v in f-display f-mono bg bg-soft border border-dim cream cream-dim muted faint gold; do grep -q -- "--$v:" apps/web/styles/globals.css && echo "ok $v" || echo "MISSING $v"; done
```

Expected: 11 `ok` lines. Any `MISSING` → STOP.

- [ ] **10.3** Commit:

```bash
git add apps/web/styles/globals.css
git commit -m "style(web): docs, paths, downloads and screenshot styles"
```

---

### Task 11 — Skills catalogue page `/skills`

**Files:**

- Create: `apps/web/pages/skills/index.js`

**Executor:** sonnet

Spec: build the page by **moving** code from the current `apps/web/pages/index.js`, without retyping it.

- [ ] **11.1** Copy these from `pages/index.js` into the new file, character for character:
  - `COMMON_ENVIRONMENTS`, `COMMON_TAGS`
  - `matchesQuery`, `firstSentence`
  - `RecommendForm`, `SkillsSection`, `FamilyBar`, `SkillSearch`

  Then apply exactly these edits:
  - **a.** `SkillsSection` takes `{ skills, familyLabel }` and renders the family cell as `familyLabel(skill.name)` instead of `labelOf(familyOf(skill.name))`.
  - **b.** `FamilyBar` takes `{ families, counts, active, onSelect }` and uses `families` instead of the imported `FAMILIES`.
  - **c.** The page component is `SkillsPage({ skills, families, familyByName })`. It holds the same state and handlers as the old `HomePage` (`query`, `family`, `recommendedSkills`, `recommendLoading`, and the `handle*` functions).
    - Filtering uses `familyByName[s.name]` instead of `familyOf(s.name)`.
    - `familyLabel = name => (families.find(f => f.key === familyByName[name]) || { label: '—' }).label`.
  - **d.** The page renders `Layout` with `title: 'Skills'` and `description: 'Browse the Aegis cybersecurity skill pack by family.'`, then `div.container`. Inside:
    - a `div.page-head` with `h1` "Skills";
    - a `p` with `` `${skills.length} defensive security skills in ${families.length} families. Every skill is free to copy as a single-file prompt, download as a zip, install into your coding assistant, or read over MCP.` ``;
    - then, in this order: `RecommendForm`, `SkillSearch` (hidden while recommendations show), `FamilyBar` (hidden while recommendations show), the count line (moved unchanged from the old page), and `SkillsSection`.
  - **e.** No top-level `require` of anything except `react` and `../../components/Layout`.

- [ ] **11.2** Write `getStaticProps` exactly:

```js
async function getStaticProps () {
  const { listSkills, FAMILIES, familyOf } = require('../../lib/aegis')
  const skills = (await listSkills()).map(s => ({
    name: s.name,
    description: s.description || '',
    tags: s.tags || [],
    frameworks: s.frameworks || [],
    phases: s.phases ?? 0,
    authoredPhases: s.authoredPhases ?? s.phases ?? 0,
    live: !!s.live,
    context: s.context || null,
    healthScore: typeof s.healthScore === 'number' ? s.healthScore : null
  })).sort((a, b) => a.name.localeCompare(b.name))
  const familyByName = Object.fromEntries(skills.map(s => [s.name, familyOf(s.name)]))
  return { props: { skills, families: FAMILIES.map(f => ({ key: f.key, label: f.label })), familyByName } }
}
```

Export with the repo's pattern:

```js
module.exports = { default: SkillsPage, getStaticProps }
module.exports.default = SkillsPage
```

Don't add a `revalidate` (D8).

- [ ] **11.3** Verify that the page compiles in isolation:

```bash
(cd apps/web && node -e "require('next/dist/build/webpack-config')" >/dev/null 2>&1; npx jest tests/components 2>&1 | tail -n 3)
```

Expected: pass. The real check is the build in Task 20.

- [ ] **11.4** Commit:

```bash
git add apps/web/pages/skills/index.js
git commit -m "feat(web): skills catalogue page with family filter, search and recommend"
```

---

### Task 12 — Skill detail page `/skills/[name]`

**Files:**

- Rewrite: `apps/web/pages/skills/[name].js`
- Create: `apps/web/tests/pages/skill-detail.props.test.js`, `apps/web/tests/pages/skill-detail.render.test.js`

**Executor:** sonnet

- [ ] **12.1** Write the failing props test, `apps/web/tests/pages/skill-detail.props.test.js` (node environment):

```js
'use strict'

const path = require('path')
const { buildDownloads } = require('../../lib/downloads')
const { loadFlattener } = require('../../lib/flat-prompt')
const { SKILLS_DIR, DOWNLOADS_DIR, aegisVersion } = require('../../lib/site-paths')
const page = require('../../pages/skills/[name]')

jest.setTimeout(60000)

beforeAll(async () => {
  // Same output the prebuild script produces (gitignored).
  await buildDownloads({ skillsDir: SKILLS_DIR, outDir: DOWNLOADS_DIR, flatten: loadFlattener(), aegisVersion: aegisVersion() })
})

test('getStaticPaths lists every skill', async () => {
  const { paths, fallback } = await page.getStaticPaths()
  expect(fallback).toBe(false)
  expect(paths).toHaveLength(24)
})

test('every skill has a stamped prompt, a zip and a Scope and authorization section', async () => {
  const { paths } = await page.getStaticPaths()
  for (const { params } of paths) {
    const { props } = await page.getStaticProps({ params })
    expect(props.flatPrompt).toMatch(/intel as of/i)
    expect(props.download.zip).toBe(`/downloads/skills/${params.name}.zip`)
    expect(props.download.prompt).toBe(`/downloads/prompts/${params.name}.md`)
    expect(props.scopeHtml).toMatch(/authori[sz]ed/i)
    expect(props.manifest.phases.length).toBeGreaterThan(0)
    expect(JSON.parse(JSON.stringify(props))).toEqual(props) // serialisable, no undefined
  }
})

test('unknown skill is a 404', async () => {
  expect(await page.getStaticProps({ params: { name: 'does-not-exist' } })).toEqual({ notFound: true })
})

test('page module does not pull server-only modules at top level', () => {
  const src = require('fs').readFileSync(path.join(__dirname, '..', '..', 'pages', 'skills', '[name].js'), 'utf8')
  const topLevel = src.split(/async function getStatic/)[0]
  expect(topLevel).not.toMatch(/require\(['"](fs|path|marked|\.\.\/\.\.\/lib\/(aegis|markdown|downloads|site-paths|flat-prompt))['"]\)/)
})
```

- [ ] **12.2** Write the failing render test, `apps/web/tests/pages/skill-detail.render.test.js`:

```js
/**
 * @jest-environment jsdom
 */
'use strict'

const React = require('react')
const { render, screen } = require('@testing-library/react')
require('@testing-library/jest-dom')
const Page = require('../../pages/skills/[name]').default

const PROPS = {
  manifest: { name: 'compliance', version: '1.1.0', description: 'Compliance workflow.', tags: ['audit'], frameworks: ['nist-csf'],
    phases: [{ id: 'scope-definition', tokens: 1234, auto: false }, { id: 'live-threat-intel', tokens: 184, auto: true }] },
  family: { key: 'governance', label: 'Governance & Risk' },
  scopeHtml: '<ul><li>Use only on systems you own or are explicitly authorized to assess.</li></ul>',
  flatPrompt: '> Intel as of 2026-08-18\n\n# Compliance',
  intelAsOf: '2026-08-18',
  download: { prompt: '/downloads/prompts/compliance.md', zip: '/downloads/skills/compliance.zip', promptBytes: 31000, zipBytes: 9000 },
  packTabs: [{ id: 'codex', label: 'Codex', steps: [{ label: 'shell', code: 'npx aegis-skills install --platform codex' }] }]
}

test('renders description, phases, scope, downloads and install', () => {
  render(React.createElement(Page, PROPS))
  expect(screen.getByRole('heading', { level: 1, name: 'compliance' })).toBeInTheDocument()
  expect(screen.getByText('Compliance workflow.')).toBeInTheDocument()
  expect(screen.getByText('scope-definition')).toBeInTheDocument()
  expect(screen.getByText('LIVE')).toBeInTheDocument()
  expect(screen.getByText(/explicitly authorized/)).toBeInTheDocument()
  expect(screen.getByText(/Intel as of 2026-08-18/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'COPY PROMPT' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /download \.zip/i })).toHaveAttribute('href', '/downloads/skills/compliance.zip')
  expect(screen.getByRole('link', { name: /download \.md/i })).toHaveAttribute('href', '/downloads/prompts/compliance.md')
  expect(screen.getByText('npx aegis-skills install --platform codex')).toBeInTheDocument()
  expect(document.body.textContent).not.toMatch(/ChatGPT Action|openai-action/)
})
```

Run both. Expected: FAIL.

- [ ] **12.3** Rewrite `apps/web/pages/skills/[name].js`.

**Top-level requires:** only `react`, `../../components/Layout`, `../../components/InstallTabs`, `../../components/CopyButton`.

**`getStaticPaths`:**

```js
async function getStaticPaths () {
  const { listSkills } = require('../../lib/aegis')
  return { paths: (await listSkills()).map(s => ({ params: { name: s.name } })), fallback: false }
}
```

**`getStaticProps`:**

```js
async function getStaticProps ({ params }) {
  const fs = require('fs')
  const path = require('path')
  const { getSkillManifest, familyOf, labelOf } = require('../../lib/aegis')
  const { SKILLS_DIR, DOWNLOADS_DIR } = require('../../lib/site-paths')
  const { stripFrontmatter, extractSection } = require('../../lib/skill-page')
  const { renderMarkdown } = require('../../lib/markdown')
  const { PATHS } = require('../../lib/install-commands')

  const manifest = await getSkillManifest(params.name)
  if (!manifest) return { notFound: true }

  const indexPath = path.join(DOWNLOADS_DIR, 'index.json')
  if (!fs.existsSync(indexPath)) throw new Error('public/downloads is missing: run `npm run prebuild -w @aegis-skills/web`')
  const entry = JSON.parse(fs.readFileSync(indexPath, 'utf8')).skills.find(s => s.name === params.name)
  if (!entry) throw new Error(`no download entry for ${params.name}`)

  const flatPrompt = fs.readFileSync(path.join(DOWNLOADS_DIR, 'prompts', `${params.name}.md`), 'utf8')
  const body = stripFrontmatter(fs.readFileSync(path.join(SKILLS_DIR, params.name, 'SKILL.md'), 'utf8'))
  const scope = extractSection(body, 'Scope and authorization')
  const key = familyOf(params.name)

  return {
    props: {
      manifest: {
        name: manifest.name,
        version: manifest.version ?? entry.version ?? null,
        description: manifest.description || '',
        tags: manifest.tags || [],
        frameworks: manifest.frameworks || [],
        phases: (manifest.phases || []).map(p => ({ id: p.id, tokens: p.tokens ?? null, auto: !!p.auto }))
      },
      family: { key, label: labelOf(key) },
      scopeHtml: scope ? renderMarkdown(scope) : null,
      flatPrompt,
      intelAsOf: entry.intelAsOf,
      download: { prompt: entry.prompt, zip: entry.zip, promptBytes: entry.promptBytes, zipBytes: entry.zipBytes },
      packTabs: PATHS.find(p => p.id === 'skill-pack').platforms
    }
  }
}
```

**Page component** `SkillDetailPage(props)` renders `Layout` with `title: manifest.name` and `description: manifest.description.slice(0, 160)`, then `div.container`, with `style: { paddingTop: '80px', paddingBottom: '120px' }`. Sections, in this order:

1. **Meta bar**, reusing the old `.hero-meta` markup: dot, `SKILL`, `family.label`, and the version pill `v{version}` (the old gold pill style). Omit the pill if `version` is null.
2. **`h1`** — the name (old title styles). **`p`** — the description (old description styles).
3. **Tags/frameworks** pills: keep the old block.
4. **`01 Use it now`** — a `div.download-grid` with two `div.download-card`:
   - **Card 1:**
     - `h3` "Single-file prompt";
     - `p.meta` `` `Every phase in one file · Intel as of ${intelAsOf || 'unknown'} · ${Math.ceil(download.promptBytes / 1024)} KB` ``;
     - `p` "Paste it into any chat AI, or add the file to a Project, Gem or custom instructions.";
     - `div.download-actions` with `CopyButton { text: flatPrompt, label: 'COPY PROMPT' }` and `a.btn-ghost { href: download.prompt, download: '' }` with the text "Download .md".
   - **Card 2:**
     - `h3` "Skill zip";
     - `p.meta` `` `SKILL.md, skill.json and references/ · ${Math.ceil(download.zipBytes / 1024)} KB` ``;
     - `p` "Upload to Claude.ai (Settings → Capabilities → Skills) or unzip into any Agent Skills folder.";
     - `a.btn-primary { href: download.zip, download: '' }` with the text "Download .zip".
5. **`02 Phases`** — keep the old explanatory paragraph logic, but replace "refreshed by aegis intel-sync" with "refreshed weekly". Keep the `.lifecycle` list and the `LIVE` badge exactly as before.
6. **`03 Scope and authorization`** — `div.prose` with `dangerouslySetInnerHTML: { __html: scopeHtml }`. If `scopeHtml` is null, render `p` "This skill has no scope section." (the props test guarantees this never ships).
7. **`04 Install the whole pack`**:
   - `p` "Installs every Aegis skill, including this one, into your coding assistant.";
   - `InstallTabs { tabs: packTabs }`;
   - `p`: "Prefer MCP? Connect the " + `a { href: '/mcp' }` "hosted Aegis MCP" + ` and ask for get_skill with name "${manifest.name}".`

Section headers reuse the old `ds-num` + `h2` markup.

**Exports:**

```js
module.exports = { default: SkillDetailPage, getStaticPaths, getStaticProps }
module.exports.default = SkillDetailPage
```

- [ ] **12.4** Run `(cd apps/web && npx jest tests/pages 2>&1 | tail -n 6)`. Expected: 5 passed.

If the scope test fails for some skill → STOP. Phase 1 lint should have guaranteed the section; report which skill.

- [ ] **12.5** Commit:

```bash
git add "apps/web/pages/skills/[name].js" apps/web/tests/pages
git commit -m "feat(web): skill page with single-file prompt, zip, scope and install"
```

---

### Task 13 — Home `/` and Choose your path `/paths`

**Files:**

- Rewrite: `apps/web/pages/index.js`
- Create: `apps/web/pages/paths.js`, `apps/web/tests/pages/home-and-paths.render.test.js`

**Executor:** sonnet

- [ ] **13.1** Write the failing render test, `apps/web/tests/pages/home-and-paths.render.test.js`:

```js
/**
 * @jest-environment jsdom
 */
'use strict'

const React = require('react')
const { render, screen } = require('@testing-library/react')
require('@testing-library/jest-dom')
const Home = require('../../pages/index').default
const Paths = require('../../pages/paths').default
const { PATHS } = require('../../lib/install-commands')

test('home positions the pack and links to every entry point', () => {
  render(React.createElement(Home, { skillCount: 24, familyCount: 5, paths: PATHS }))
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/your own AI/i)
  for (const href of ['/paths', '/skills', '/themis', '/mcp', '/docs', '/security']) {
    expect(document.querySelector(`a[href="${href}"]`)).not.toBeNull()
  }
  expect(screen.getByText('Themis standalone')).toBeInTheDocument()
  expect(document.body.textContent).not.toMatch(/ChatGPT Action|\/api\/(audit|exposure|themis)|@aegis-skills\/core|aegis compile/)
})

test('paths page has one section per path with install tabs', () => {
  render(React.createElement(Paths, { paths: PATHS }))
  for (const p of PATHS) expect(document.getElementById(p.id)).not.toBeNull()
  expect(screen.getAllByRole('tablist')).toHaveLength(PATHS.length)
  expect(screen.getByText('npx @aegis-skills/themis dashboard')).toBeInTheDocument()
})
```

- [ ] **13.2** Rewrite `apps/web/pages/index.js`. Delete every old constant and component; `STEPS`, `COMMANDS` and the recommend/search code now live in `/skills`.

**Top-level requires:** `react`, `../components/Layout`, `../components/PathMatrix`.

**Props:** `{ skillCount, familyCount, paths }`.

**`getStaticProps`:**

```js
async function getStaticProps () {
  const { listSkills, FAMILIES } = require('../lib/aegis')
  const { PATHS } = require('../lib/install-commands')
  return { props: { skillCount: (await listSkills()).length, familyCount: FAMILIES.length, paths: PATHS } }
}
```

**Sections and copy:**

1. **Hero** (`.section > .container`):
   - `.hero-meta`: dot, `AEGIS + THEMIS`, `Open cybersecurity pack`.
   - `h1.hero-h1`: "Security skills and a SOC agent," `<br>` `<em>`"on your own AI"`</em>`"."
   - `p.hero-desc`: `` `Aegis is ${skillCount} defensive security skills in the open Agent Skills format. Themis is a governed security-operations agent that runs inside Claude Code, Codex or Gemini CLI, or as a local dashboard with your own model. No account, no hosted inference, Apache-2.0 OR MIT.` ``
   - Buttons row (`display:flex; gap:12px; margin-top:28px`):
     - `a.btn-primary { href: '/paths' }` "CHOOSE YOUR PATH"
     - `a.btn-ghost { href: '/skills' }` `` `BROWSE ${skillCount} SKILLS` ``
2. **`01 The pack`** — reuse the `.twin` markup from the old page:
   - **Aegis card:**
     - role: "Skill pack · open Agent Skills format";
     - text: `` `${skillCount} skills across ${familyCount} families: ATT&CK, ATLAS and Engage mapping, threat hunting, exposure validation, forensics, malware analysis, OT, identity, compliance and more. Each skill is plain markdown with a scope and authorization section, refreshed weekly with live threat intel.` ``;
     - link "Browse skills" → `/skills`.
   - **Themis card:**
     - role: "SOC agent · plugin or standalone";
     - text: "Plans a security task, fans it out to specialist skills, checks every output with guardrails, and writes a report stamped with the exact Themis and Aegis versions. Tools that write or execute only run after a human approves them.";
     - link "How Themis works" → `/themis`.
3. **`02 Choose your path`**:
   - `PathMatrix { paths }`;
   - then `p`: "Every path uses the same skills. Start with zero install and move up when you need more." + `a { href: '/paths' }` "All install commands →".
4. **`03 Why trust it`** — a `.steps-grid` with four `.step-cell`s (`n`, `h3`, `p`):
   - `01` "No hosted inference" — "The website never calls a model. Prompts and zips are static files; the hosted MCP only serves skill text."
   - `02` "Human-approved actions" — "Themis classifies every external tool as read, write or execute. Writes and executes wait for a person, never the model."
   - `03` "Scoped by design" — "Every skill states its defensive purpose and is for systems you own or are authorized to assess."
   - `04` "Open and portable" — "Apache-2.0 OR MIT. Markdown and JSON you can read, fork and run anywhere."
5. **`04 Self-updating intel`**:
   - `p`: "A weekly job pulls threat-intel feeds, extracts reusable attack patterns, and routes each one into the skills whose attack surface it lands on. Generated intel lives in its own reference file, is labelled LIVE, never edits hand-written tradecraft, and is excluded from health scoring. Every download carries an \"Intel as of\" date."
   - Keep the old `INTEL_STEPS` four cells unchanged; copy the constant back in.
   - Remove the `$ aegis intel-sync` terminal block.
6. **Footer links row** (`p`, muted): links "Docs" `/docs`, "Hosted MCP" `/mcp`, "Security" `/security`, "License" `/license`.

**Exports:**

```js
module.exports = { default: HomePage, getStaticProps }
module.exports.default = HomePage
```

- [ ] **13.3** Create `apps/web/pages/paths.js`.

**Top-level requires:** `react`, `../components/Layout`, `../components/PathMatrix`, `../components/InstallTabs`.

**`getStaticProps`:**

```js
async function getStaticProps () {
  const { PATHS } = require('../lib/install-commands')
  return { props: { paths: PATHS } }
}
```

**Render:**

- `Layout { title: 'Choose your path', description: 'Five ways to use Aegis and Themis, from zero install to a local SOC dashboard.' }`
- `div.container`, containing:
  - `div.page-head` with `h1` "Choose your path" and `p` "Five ways in, all using the same skills. Pick the lightest one that does the job.";
  - `PathMatrix { paths }`;
  - for each path, `section.path-section { id: p.id }` containing:
    - `h2` = `p.title`;
    - `p.path-for` = `` `FOR · ${p.audience.toUpperCase()}` ``;
    - `p` = `p.how`;
    - `InstallTabs { tabs: p.platforms }`;
    - `p` with `a { href: p.docs }` "Full guide →".

**Exports:** `module.exports = { default: PathsPage, getStaticProps }` plus `module.exports.default = PathsPage`.

- [ ] **13.4** Run `(cd apps/web && npx jest tests/pages 2>&1 | tail -n 6)`. Expected: all pass.

- [ ] **13.5** Commit:

```bash
git add apps/web/pages/index.js apps/web/pages/paths.js apps/web/tests/pages/home-and-paths.render.test.js
git commit -m "feat(web): new home and choose-your-path pages"
```

---

### Task 14 — Themis `/themis` and Hosted MCP `/mcp` pages

**Files:**

- Rewrite: `apps/web/pages/themis.js`
- Create: `apps/web/pages/mcp.js`, `apps/web/tests/pages/themis-mcp.render.test.js`

**Executor:** sonnet

Themis screenshot spec. These are placeholders until the USER captures them (USER ACTION U4).

| File (under `apps/web/public/img/themis/`) | Content | Caption |
|---|---|---|
| `dashboard-run.png` | Mode 2 Run page mid-run: task text, sub-agents streaming, guardrail status | "Run: sub-agents stream as each skill finishes." |
| `dashboard-approvals.png` | Approvals page with one pending `write` request showing server, tool and redacted args, plus Approve/Reject | "Approvals: nothing that writes or executes runs without a click." |
| `dashboard-models.png` | Models & Keys page: providers grouped, set/missing status, local endpoint test. **No key values visible.** | "Models & Keys: bring your own key or a local model." |
| `plugin-claude-code.png` | Claude Code session using the Themis plugin, showing an approval prompt (elicitation) | "Plugin mode: the host AI reasons; Themis governs." |

All images: PNG, 1600×1000, ≤ 400 KB, dark theme. No real hostnames, keys, IPs or customer data.

- [ ] **14.1** Write the failing test, `apps/web/tests/pages/themis-mcp.render.test.js`:

```js
/**
 * @jest-environment jsdom
 */
'use strict'

const React = require('react')
const { render, screen } = require('@testing-library/react')
require('@testing-library/jest-dom')
const Themis = require('../../pages/themis').default
const Mcp = require('../../pages/mcp').default
const { PATHS, MCP_URL } = require('../../lib/install-commands')

const shots = [{ file: 'dashboard-run.png', alt: 'Run page', caption: 'Run', exists: false }]

test('themis page explains both modes, approvals and install', () => {
  render(React.createElement(Themis, { paths: PATHS, shots }))
  expect(screen.getByRole('heading', { level: 1, name: 'Themis' })).toBeInTheDocument()
  expect(screen.getByText('Themis on your AI')).toBeInTheDocument()
  expect(screen.getByText('Themis standalone')).toBeInTheDocument()
  expect(document.body.textContent).toMatch(/only a human can approve/i)
  expect(screen.getByText(/Screenshot pending: Run page/)).toBeInTheDocument()
  expect(document.body.textContent).not.toMatch(/\/api\/themis|POST \/api|createReactAgent/)
})

test('mcp page shows the endpoint, the three tools and connection tabs', () => {
  render(React.createElement(Mcp, { paths: PATHS }))
  expect(screen.getAllByText(MCP_URL).length).toBeGreaterThan(0)
  for (const t of ['list_skills', 'get_skill', 'get_skill_phase']) expect(document.body.textContent).toContain(t)
  expect(screen.getByRole('tab', { name: 'Claude.ai' })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'ChatGPT' })).toBeInTheDocument()
})
```

- [ ] **14.2** Rewrite `apps/web/pages/themis.js`.

**Top-level requires:** `react`, `../components/Layout`, `../components/InstallTabs`, `../components/Screenshot`.

**`getStaticProps`:**

```js
const SHOTS = [
  { file: 'dashboard-run.png', alt: 'Themis dashboard Run page', caption: 'Run: sub-agents stream as each skill finishes.' },
  { file: 'dashboard-approvals.png', alt: 'Themis dashboard Approvals page', caption: 'Approvals: nothing that writes or executes runs without a click.' },
  { file: 'dashboard-models.png', alt: 'Themis dashboard Models and Keys page', caption: 'Models & Keys: bring your own key or a local model.' },
  { file: 'plugin-claude-code.png', alt: 'Themis plugin in Claude Code', caption: 'Plugin mode: the host AI reasons; Themis governs.' }
]
async function getStaticProps () {
  const fs = require('fs')
  const path = require('path')
  const { WEB_ROOT } = require('../lib/site-paths')
  const { PATHS } = require('../lib/install-commands')
  const shots = SHOTS.map(s => ({ ...s, exists: fs.existsSync(path.join(WEB_ROOT, 'public', 'img', 'themis', s.file)) }))
  return { props: { paths: PATHS, shots } }
}
```

`SHOTS` sits at the top level; that's allowed because it's plain data.

**Render** inside `Layout { title: 'Themis', description: 'A governed security-operations agent that runs on your AI or as a local dashboard.' }` and `div.container`:

- **`div.page-head`:**
  - `h1` "Themis";
  - `p`: "A security-operations agent built on Aegis. Give it a task, such as \"validate exposure to CVE-2026-12345 on our VPN gateways\". It plans the work, fans it out to specialist skills, checks every output, and writes a report stamped with the exact Themis and Aegis versions it used."
- **`01 Two ways to run`** — `table.platforms-table.compare-table` with header `["", "Themis on your AI", "Themis standalone"]` and these rows:
  - Where the model runs | Your assistant (Claude Code, Codex, Gemini CLI) | Your API key (Anthropic, OpenAI, Gemini) or a local model (Ollama, LM Studio)
  - API key needed | No | Yes, or a local model
  - Interface | Your assistant's chat | Local web dashboard on 127.0.0.1
  - Orchestration | Your assistant runs each step, guided by the Themis skill | LangGraph runs the same workflow definition
  - Approvals | Asked through your client's own prompt when it supports MCP elicitation; otherwise handed back for you to run | Approvals page in the dashboard
  - Tool governance | Tools you register with Themis are governed; tools connected straight to your assistant are not | Every tool call is governed
  - History and audit | Local SQLite in ~/.themis | Local SQLite in ~/.themis
  - Install | `/plugin install themis@…` or MCP config | `npx @aegis-skills/themis dashboard`
- **`02 The workflow`** — `.lifecycle` list (reuse markup), 7 steps with the kind as the right-hand label:
  - validate (deterministic)
  - decompose (reasoning)
  - schedule (deterministic)
  - fan-out (reasoning)
  - guardrail (reasoning)
  - synthesise (reasoning)
  - audit (deterministic)

  Before writing, confirm each kind with `node -e "console.log(Object.values(require('@aegis-skills/themis-core').THEMIS_WORKFLOW.steps).map(s=>s.id+':'+s.kind).join(' '))"` (run from `apps/web`). Use the printed kinds. If the package can't be resolved from `apps/web`, run it from the repo root. Note: `@aegis-skills/themis-core` is **not** added as a web dependency; this is a one-time copy check.

  Then `p`: "Deterministic steps are plain code in themis-core and behave the same in both modes. Reasoning steps are done by your assistant (plugin) or by the configured model (standalone)."
- **`03 Governance and approvals`**:
  - `ul` with:
    - "Every external tool is classified read, write or execute."
    - "Reads run automatically within a per-run call budget and timeout; secrets are redacted and the output is wrapped as untrusted data."
    - "Writes and executes become approval requests. Only a human can approve: the dashboard's Approvals page, or your client's own MCP prompt. No tool, graph node or model output can approve."
    - "Every call, result and decision is written to the audit log."
    - "An unreachable tool server degrades to \"no tools\"; it never crashes a run."
  - Then `p` (muted): "Honest boundary: in plugin mode, tools you connect directly to your assistant bypass Themis and are not governed or audited. Register security tools with Themis to govern them." + link "Governance details →" `/docs/themis/governance`.
- **`04 Screenshots`** — `div.screenshot-grid` with a `Screenshot { src: '/img/themis/' + s.file, alt, caption, exists }` per shot.
- **`05 Install`** — two `h3` + `InstallTabs` pairs:
  - "Themis on your AI" with `paths.find(p => p.id === 'themis-plugin').platforms`;
  - "Themis standalone" with `paths.find(p => p.id === 'themis-app').platforms`.
- **`06 Versions`** — `p`: "Themis reads skills from any installed Aegis with the same osk major version. Weekly intel and new skills are picked up automatically; an osk major bump needs a Themis release. The plugin uses your installed Aegis; the standalone app bundles its own." + link `/docs/themis/versions`.

**Exports:** `{ default, getStaticProps }`, same pattern as the other pages.

- [ ] **14.3** Create `apps/web/pages/mcp.js`.

**Top-level requires:** `react`, `../components/Layout`, `../components/InstallTabs`, `../components/CodeBlock`.

**`getStaticProps`** returns `{ props: { paths: PATHS } }` (lazy-require `../lib/install-commands`). The page imports `MCP_URL` from `../lib/install-commands` at the top level; that's allowed because the module is pure data with no `fs`.

**Render** inside `Layout { title: 'Hosted MCP', description: 'Connect Claude.ai, ChatGPT or any MCP client to the read-only Aegis skill server.' }` and `div.container`:

- **`div.page-head`:**
  - `h1` "Hosted Aegis MCP";
  - `p`: "Read every Aegis skill from Claude.ai, ChatGPT or any MCP client, with nothing to install. The server is read-only and serves public skill text only."
- **`01 Endpoint`** — `CodeBlock { label: 'Streamable HTTP', content: MCP_URL }`, then `ul`:
  - "No authentication and no sessions: each request is handled independently."
  - "No model calls, no accounts, no application logs or analytics. Vercel's standard platform request logs apply."
  - "Requests over 64 KB are rejected."
- **`02 Tools`** — `table.platforms-table` with header `["Tool", "Returns"]` and these rows:
  - `list_skills` | Every skill with its description, family and phases
  - `get_skill` | One skill's overview and phase list (argument: skill name)
  - `get_skill_phase` | The full text of one phase (arguments: skill name, phase id)

  Then `p`: "Tool names are stable; Themis depends on them."

  Confirm the argument names against `packages/aegis/mcp/server.js` (grep `registerTool\|tool(`) and use the real names in the "Returns" text.
- **`03 Connect`** — `InstallTabs { tabs: paths.find(p => p.id === 'hosted-mcp').platforms }`.
- **`04 Prefer local?`** — `p`: "Run the same server on your machine over stdio:" + `CodeBlock { label: 'MCP config', content: JSON.stringify({ mcpServers: { aegis: { command: 'npx', args: ['-y', 'aegis-skills', 'mcp'] } } }, null, 2) }`.
- **`05 Check it works`** — `CodeBlock { label: 'shell', content: ` + the curl command from P8, with the host replaced by `https://aegis-skills.vercel.app` + ` }`, then `p`: "You should see list_skills, get_skill and get_skill_phase." + link `/docs/web/hosted-mcp`.

- [ ] **14.4** Run `(cd apps/web && npx jest tests/pages 2>&1 | tail -n 6)`. Expected: all pass.

- [ ] **14.5** Commit:

```bash
git add apps/web/pages/themis.js apps/web/pages/mcp.js apps/web/tests/pages/themis-mcp.render.test.js
git commit -m "feat(web): Themis modes and governance page, hosted MCP page"
```

---

### Task 15 — Docs hub pages

**Files:**

- Delete: `apps/web/pages/docs.js`
- Create: `apps/web/pages/docs/index.js`, `apps/web/pages/docs/[...slug].js`, `apps/web/tests/pages/docs.render.test.js`

**Executor:** sonnet

- [ ] **15.1** Write the failing test, `apps/web/tests/pages/docs.render.test.js`:

```js
/**
 * @jest-environment jsdom
 */
'use strict'

const React = require('react')
const { render, screen } = require('@testing-library/react')
require('@testing-library/jest-dom')
const Hub = require('../../pages/docs/index').default
const DocPage = require('../../pages/docs/[...slug]').default

const NAV = [
  { key: 'aegis', title: 'Aegis', blurb: 'b', pages: [{ slug: 'index', title: 'Aegis', href: '/docs/aegis' }, { slug: 'install', title: 'Install Aegis', href: '/docs/aegis/install' }] },
  { key: 'themis', title: 'Themis', blurb: 'b', pages: [] },
  { key: 'web', title: 'Website & hosted MCP', blurb: 'b', pages: [] }
]

test('hub lists sections and pages', () => {
  render(React.createElement(Hub, { nav: NAV }))
  expect(screen.getByRole('heading', { level: 1, name: 'Docs' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Install Aegis' })).toHaveAttribute('href', '/docs/aegis/install')
})

test('doc page renders html, marks the current nav item and offers an edit link', () => {
  render(React.createElement(DocPage, { nav: NAV, title: 'Install Aegis', html: '<h1>Install Aegis</h1><p>body</p>',
    href: '/docs/aegis/install', editUrl: 'https://github.com/drupadsachania/aegis-skills/edit/main/docs/aegis/install.md' }))
  expect(screen.getByText('body')).toBeInTheDocument()
  expect(document.querySelector('a[aria-current="page"]').getAttribute('href')).toBe('/docs/aegis/install')
  expect(screen.getByRole('link', { name: /edit this page/i })).toHaveAttribute('href', expect.stringContaining('/edit/main/docs/aegis/install.md'))
})
```

- [ ] **15.2** Delete the old docs page:

```bash
git rm -q apps/web/pages/docs.js
```

- [ ] **15.3** Create `apps/web/pages/docs/index.js`:

```js
'use strict'

const React = require('react')
const Layout = require('../../components/Layout')

const h = React.createElement

function DocsHub ({ nav }) {
  return h(Layout, { title: 'Docs', description: 'Documentation for Aegis, Themis, the hosted MCP and the website.' },
    h('div', { className: 'container', style: { paddingBottom: '120px' } },
      h('div', { className: 'page-head' },
        h('h1', null, 'Docs'),
        h('p', null, 'Install guides, the hosted MCP, how Themis governs tools, and how the site is built. Every page is rendered from markdown in the repository.')),
      h('div', { className: 'doc-cards' },
        ...nav.map(sec => h('div', { key: sec.key, className: 'doc-card' },
          h('h3', null, sec.title),
          h('p', null, sec.blurb),
          h('ul', null, ...sec.pages.map(p => h('li', { key: p.href }, h('a', { href: p.href }, p.title)))))))))
}

async function getStaticProps () {
  const { listDocs } = require('../../lib/docs')
  const { DOCS_DIR } = require('../../lib/site-paths')
  return { props: { nav: listDocs(DOCS_DIR) } }
}

module.exports = { default: DocsHub, getStaticProps }
module.exports.default = DocsHub
```

- [ ] **15.4** Create `apps/web/pages/docs/[...slug].js`:

```js
'use strict'

const React = require('react')
const Layout = require('../../components/Layout')

const h = React.createElement

function DocPage ({ nav, title, html, href, editUrl }) {
  return h(Layout, { title },
    h('div', { className: 'container' },
      h('div', { className: 'docs-layout' },
        h('aside', { className: 'docs-nav', 'aria-label': 'Docs' },
          h('a', { href: '/docs' }, '← All docs'),
          ...nav.map(sec => h(React.Fragment, { key: sec.key },
            h('h4', null, sec.title),
            ...sec.pages.map(p => h('a', { key: p.href, href: p.href, 'aria-current': p.href === href ? 'page' : undefined }, p.title))))),
        h('article', null,
          h('div', { className: 'prose', dangerouslySetInnerHTML: { __html: html } }),
          h('p', { className: 'docs-edit' }, h('a', { href: editUrl, target: '_blank', rel: 'noopener noreferrer' }, 'Edit this page on GitHub ↗'))))))
}

async function getStaticPaths () {
  const { listDocs } = require('../../lib/docs')
  const { DOCS_DIR } = require('../../lib/site-paths')
  const paths = listDocs(DOCS_DIR).flatMap(sec => sec.pages.map(p => ({
    params: { slug: p.slug === 'index' ? [sec.key] : [sec.key, p.slug] }
  })))
  return { paths, fallback: false }
}

async function getStaticProps ({ params }) {
  const { listDocs, loadDoc } = require('../../lib/docs')
  const { renderMarkdown } = require('../../lib/markdown')
  const { DOCS_DIR } = require('../../lib/site-paths')
  const [section, slug = 'index', extra] = params.slug
  if (extra) return { notFound: true }
  const doc = loadDoc(DOCS_DIR, section, slug)
  if (!doc) return { notFound: true }
  return {
    props: {
      nav: listDocs(DOCS_DIR),
      title: doc.title,
      html: renderMarkdown(doc.markdown, { docPath: doc.docPath }),
      href: doc.href,
      editUrl: `https://github.com/drupadsachania/aegis-skills/edit/main/${doc.docPath}`
    }
  }
}

module.exports = { default: DocPage, getStaticPaths, getStaticProps }
module.exports.default = DocPage
```

- [ ] **15.5** Run `(cd apps/web && npx jest tests/pages tests/guard 2>&1 | tail -n 8)`. Expected: all pass, including the guard's removed-route test, because `pages/docs.js` is gone and `index.js`/`themis.js` are rewritten. If the guard still flags a file, remove the reference from that file.

- [ ] **15.6** Commit:

```bash
git add -A apps/web/pages/docs apps/web/pages/docs.js apps/web/tests/pages/docs.render.test.js
git commit -m "feat(web): docs hub rendered from repository markdown"
```

---

### Task 16 — Security `/security` and License `/license`

**Files:**

- Create: `apps/web/pages/security.js`, `apps/web/pages/license.js`, `apps/web/tests/pages/security-license.props.test.js`

**Executor:** haiku

- [ ] **16.1** Write the failing test, `apps/web/tests/pages/security-license.props.test.js`:

```js
'use strict'

const security = require('../../pages/security')
const license = require('../../pages/license')

test('security page renders SECURITY.md and reports whether the compliance mapping exists', async () => {
  const { props } = await security.getStaticProps()
  expect(props.securityHtml).toMatch(/<h1[^>]*>Security Policy<\/h1>/)
  expect(typeof props.hasComplianceMapping).toBe('boolean')
})

test('license page carries the dual-licence text', async () => {
  const { props } = await license.getStaticProps()
  expect(props.licenseText).toMatch(/Apache/)
  expect(props.licenseText).toMatch(/MIT/)
})
```

- [ ] **16.2** Create `apps/web/pages/security.js`:

```js
'use strict'

const React = require('react')
const Layout = require('../components/Layout')

const h = React.createElement

function SecurityPage ({ securityHtml, hasComplianceMapping }) {
  return h(Layout, { title: 'Security', description: 'Security policy, vulnerability reporting and how the site is hardened.' },
    h('div', { className: 'container', style: { paddingBottom: '120px' } },
      h('div', { className: 'page-head' }, h('h1', null, 'Security')),
      h('div', { className: 'prose', dangerouslySetInnerHTML: { __html: securityHtml } }),
      h('div', { className: 'prose' },
        h('h2', null, 'How this site is built'),
        h('ul', null,
          h('li', null, 'No model calls, no accounts, no cookies, no analytics, no database.'),
          h('li', null, 'Every API is read-only and serves public skill content only.'),
          h('li', null, 'Strict security headers on every response: HSTS, a same-origin Content-Security-Policy, X-Frame-Options DENY, nosniff and a locked-down Permissions-Policy.'),
          h('li', null, 'Docs are rendered from repository markdown with all raw HTML escaped.')),
        h('h2', null, 'Compliance mapping'),
        hasComplianceMapping
          ? h('p', null, 'Themis controls mapped to OWASP Top 10 for LLM and Agentic applications and the NIST AI RMF: ',
            h('a', { href: '/docs/themis/compliance-mapping' }, 'read the mapping'), '.')
          : h('p', null, 'The mapping of Themis controls to OWASP Top 10 for LLM and Agentic applications and the NIST AI RMF is published with the next release.'))))
}

async function getStaticProps () {
  const fs = require('fs')
  const path = require('path')
  const { REPO_ROOT, DOCS_DIR } = require('../lib/site-paths')
  const { renderMarkdown } = require('../lib/markdown')
  const md = fs.readFileSync(path.join(REPO_ROOT, 'SECURITY.md'), 'utf8')
  return {
    props: {
      securityHtml: renderMarkdown(md, { docPath: 'SECURITY.md' }),
      hasComplianceMapping: fs.existsSync(path.join(DOCS_DIR, 'themis', 'compliance-mapping.md'))
    }
  }
}

module.exports = { default: SecurityPage, getStaticProps }
module.exports.default = SecurityPage
```

- [ ] **16.3** Create `apps/web/pages/license.js`:

```js
'use strict'

const React = require('react')
const Layout = require('../components/Layout')

const h = React.createElement
const BLOB = 'https://github.com/drupadsachania/aegis-skills/blob/main/'

function LicensePage ({ licenseText }) {
  return h(Layout, { title: 'License', description: 'Aegis and Themis are dual-licensed Apache-2.0 OR MIT.' },
    h('div', { className: 'container', style: { paddingBottom: '120px' } },
      h('div', { className: 'page-head' },
        h('h1', null, 'License'),
        h('p', null, 'Every package in this repository is licensed under Apache-2.0 OR MIT, at your option. SPDX: (Apache-2.0 OR MIT).')),
      h('div', { className: 'prose' },
        h('ul', null,
          h('li', null, h('a', { href: BLOB + 'LICENSE-APACHE' }, 'Apache License 2.0 (LICENSE-APACHE)')),
          h('li', null, h('a', { href: BLOB + 'LICENSE-MIT' }, 'MIT License (LICENSE-MIT)'))),
        h('pre', null, licenseText))))
}

async function getStaticProps () {
  const fs = require('fs')
  const path = require('path')
  const { REPO_ROOT } = require('../lib/site-paths')
  return { props: { licenseText: fs.readFileSync(path.join(REPO_ROOT, 'LICENSE'), 'utf8') } }
}

module.exports = { default: LicensePage, getStaticProps }
module.exports.default = LicensePage
```

- [ ] **16.4** Run `(cd apps/web && npx jest tests/pages/security-license.props.test.js)`. Expected: 2 passed. If `SECURITY.md`'s H1 isn't `Security Policy` → STOP (Phase 0 must have used the contracts §9 text).

- [ ] **16.5** Commit:

```bash
git add apps/web/pages/security.js apps/web/pages/license.js apps/web/tests/pages/security-license.props.test.js
git commit -m "feat(web): security and license pages"
```

---

### Tasks 17–19 — Documentation content

Rules for every docs file:

- **Format.** Plain GitHub markdown. The first line is `# <Title>`, and that title is used in the nav. No raw HTML (it would be escaped). No front matter.
- **Links.** Link between docs with relative paths (`./mcp.md`, `../themis/governance.md`). Link to repo files with relative paths (`../../SECURITY.md`); they are rewritten to GitHub. Link to site pages with absolute paths (`/skills`, `/mcp`).
- **Install commands.** Copy them **verbatim** from `apps/web/lib/install-commands.js`. Never write `@aegis-skills/core`, `aegis compile`, `aegis init` as a primary command, ChatGPT Actions, `/api/themis`, `/api/audit`, `/api/exposure`, `/invoke`, Supabase or `better-sqlite3`.
- **Facts.** Each file below lists its section headings (H2) and the facts each section must state. Write 1–4 short paragraphs or a list or table per section, in plain English. Where a fact says "copy from X", open X and copy the exact value. If X doesn't contain it → STOP and report; don't guess.
- **Length.** 150–600 words per file.

### Task 17 — `docs/aegis/*.md` (7 files)

**Files:**

- Create: `docs/aegis/index.md`, `install.md`, `single-file-prompts.md`, `mcp.md`, `cli.md`, `skill-format.md`, `intel.md`

**Executor:** sonnet

- [ ] **17.1** `docs/aegis/index.md`, `# Aegis`:
  - `## What Aegis is`:
    - an open cybersecurity skill pack in the open Agent Skills format (link https://agentskills.io/specification);
    - content only (markdown + JSON);
    - never calls a model;
    - npm package `aegis-skills`;
    - licence Apache-2.0 OR MIT.
  - `## What's in the pack`:
    - a table of the 5 families and their skills. Copy the families and the skill→family mapping from `packages/aegis/mcp/skill-families.js` (24 skills).
  - `## How a skill is built`:
    - `SKILL.md` (overview and frontmatter) links to phase files in `references/` (progressive disclosure);
    - `skill.json` is the machine-readable sidecar;
    - link `./skill-format.md`.
  - `## Ways to use it`:
    - the 5 paths in one table, with the same titles, audiences and how-text as `PATHS` in `install-commands.js`;
    - link `/paths`.
  - `## Safety`:
    - every skill has a `## Scope and authorization` section;
    - for systems you own or are explicitly authorized to assess;
    - each skill states what's out of scope.

- [ ] **17.2** `docs/aegis/install.md`, `# Install Aegis`:
  - `## Requirements`:
    - Node.js 22.13 or later for every `npx` command;
    - no build tools.
  - `## Claude Code`:
    - both marketplace commands;
    - the `npx aegis-skills install --platform claude` alternative.
  - `## Codex`, `## Gemini CLI` (the extension line only if `GEMINI_EXTENSION_INSTALL` isn't null), `## Cursor`, `## VS Code Copilot`, `## Antigravity`:
    - the commands from the `skill-pack` path;
    - omit any platform that isn't in `AEGIS_PLATFORM_IDS`.
  - `## User or project install`:
    - the default installs for the user;
    - `--project` installs into the current project. Copy the semantics from `node packages/aegis/cli/aegis.js install --help`.
  - `## Where files go`:
    - a table with columns Platform | Location | Verified on, copied from `packages/aegis/lib/targets.js`;
    - mark disabled targets "not yet supported".
  - `## What gets installed`:
    - only `SKILL.md`, `skill.json` and `references/`;
    - never `intel-state.json`;
    - the MCP server is registered where the platform supports it (copy from targets.js if it records this).
  - `## Update and uninstall`:
    - `aegis update`, `aegis uninstall`;
    - installed skills refresh automatically after an upgrade;
    - files you edited are saved as `<file>.bak` first;
    - opt out with `AEGIS_NO_AUTO_REFRESH=1`.
  - `## Troubleshooting`:
    - `npx` is stuck on a prompt → add `-y`;
    - wrong Node version → `node --version`;
    - re-run `aegis list` to see what is installed where.

- [ ] **17.3** `docs/aegis/single-file-prompts.md`, `# Single-file prompts and skill zips`:
  - `## What they are`:
    - a single-file prompt is every phase of one skill flattened into one markdown file;
    - its first lines carry "Intel as of YYYY-MM-DD";
    - a skill zip is `<name>/SKILL.md`, `<name>/skill.json` and `<name>/references/*.md`.
  - `## Where to get them`:
    - every skill page has Copy prompt, Download .md and Download .zip;
    - stable URLs `/downloads/prompts/<name>.md` and `/downloads/skills/<name>.zip`;
    - machine-readable index `/downloads/index.json` (link `../web/downloads.md`).
  - `## Claude.ai`:
    - upload the zip at Settings → Capabilities → Skills → Upload skill;
    - or paste the prompt into a Project's instructions.
  - `## ChatGPT, Gemini and other chat AIs`:
    - add the .md as a Project/Gem file or attach it to a chat;
    - or paste it as the first message.
  - `## Freshness`:
    - files are regenerated on every deploy;
    - intel updates weekly;
    - a downloaded copy doesn't update itself — use the hosted MCP or the skill pack for always-current content.
  - `## Size`:
    - prompts are large (tens of KB);
    - if your tool truncates, use the zip or MCP instead.

- [ ] **17.4** `docs/aegis/mcp.md`, `# Aegis MCP server`:
  - `## Tools`:
    - `list_skills`, `get_skill`, `get_skill_phase` with their argument names, copied from `packages/aegis/mcp/server.js`;
    - read-only;
    - tool names are frozen because Themis depends on them.
  - `## Run it locally (stdio)`:
    - the JSON config `{ "mcpServers": { "aegis": { "command": "npx", "args": ["-y", "aegis-skills", "mcp"] } } }`;
    - or `aegis mcp` if installed globally.
  - `## Use the hosted server`:
    - URL `https://aegis-skills.vercel.app/api/mcp`;
    - link `../web/hosted-mcp.md`.
  - `## Guarantees`:
    - no model calls;
    - serves only public skill content;
    - no file paths are exposed;
    - dependencies are limited to `@modelcontextprotocol/sdk`, `zod` and `gray-matter`.

- [ ] **17.5** `docs/aegis/cli.md`, `# aegis CLI`:
  - `## Commands`:
    - a table of `install`, `uninstall`, `update`, `list` and `mcp`, with the one-line description each prints in `node packages/aegis/cli/aegis.js --help` (copy it);
    - `init` is an alias of `install`.
  - `## Options`:
    - every flag shown by `--help` for each command, copied (at least `--platform <p>` and `--project`).
  - `## Environment`:
    - `AEGIS_NO_AUTO_REFRESH=1`.
  - `## Exit codes`:
    - copy them if `--help` or the source documents any; otherwise write "0 on success, non-zero on failure".

- [ ] **17.6** `docs/aegis/skill-format.md`, `# Skill format`:
  - `## SKILL.md`:
    - the frontmatter block from contracts §5, verbatim (`name`, `description`, `license`, `metadata`);
    - `name` equals the folder name;
    - description ≤ 1024 characters and says what the skill does and when to use it.
  - `## Phases`:
    - the body links phases as relative markdown links into `references/`.
  - `## skill.json`:
    - fields `osk`, `phases` (`id`, `file`, `auto`, `tokens`), `frameworks`, `tags`, research/intel settings, `context`;
    - readers ignore unknown fields;
    - copy one real `skill.json` from `packages/aegis/skills/compliance/skill.json`, trimmed to its first two phases.
  - `## Scope and authorization`:
    - the required section, verbatim from contracts §5.
  - `## osk versions`:
    - `osk` is the format version (currently `1.1`);
    - its major is the Aegis↔Themis contract.
  - `## Lint`:
    - `npm run lint:skills` checks frontmatter, name/folder match, description length, that referenced files exist, token budgets, and the safety section.

- [ ] **17.7** `docs/aegis/intel.md`, `# Live threat intel`:
  - `## How it works`:
    - a weekly GitHub Actions job ingests threat-intel feeds;
    - extracts attack patterns;
    - routes each one to the skills whose attack surface it affects.
  - `## Where it lives`:
    - `references/live-threat-intel.md`, an `auto` phase shown as LIVE;
    - hand-written tradecraft is never edited;
    - excluded from health scoring;
    - `intel-state.json` is repo-only and never shipped.
  - `## Intel as of`:
    - every prompt download is stamped with the last sync date of that skill.
  - `## Releases`:
    - weekly intel commits are released as Aegis patch versions;
    - Themis picks them up automatically (link `../themis/versions.md`).

- [ ] **17.8** Commit:

```bash
git add docs/aegis
git commit -m "docs(aegis): install, prompts, MCP, CLI, format and intel guides"
```

### Task 18 — `docs/themis/*.md` (7 files)

**Files:**

- Create: `docs/themis/index.md`, `mode-1-plugin.md`, `mode-2-app.md`, `governance.md`, `workflow.md`, `configuration.md`, `versions.md`

**Executor:** sonnet

- [ ] **18.1** `docs/themis/index.md`, `# Themis`:
  - `## What Themis is`:
    - a security-operations agent built on Aegis.
  - `## Two modes`:
    - the same comparison table as the `/themis` page (Task 14.2 rows, verbatim).
  - `## Packages`:
    - `@aegis-skills/themis-core` is deterministic, with no model;
    - `@aegis-skills/themis-gateway` is the governed MCP client;
    - `@aegis-skills/themis-plugin` is mode 1, bin `themis-mcp`;
    - `@aegis-skills/themis` is mode 2, bin `themis`.
  - `## Next steps`:
    - links to every other page in this section.

- [ ] **18.2** `docs/themis/mode-1-plugin.md`, `# Themis on your AI`:
  - `## Requirements`:
    - Claude Code, Codex or Gemini CLI;
    - Node.js 22.13 or later;
    - no API key.
  - `## Install`:
    - the three tabs of the `themis-plugin` path, verbatim.
  - `## What you get`:
    - the MCP tools exposed by the plugin, copied as the exact list from `packages/themis-plugin` source (grep the tool registrations; expected to include `plan`, `schedule`, `validate_exposure`, `assess_risk`, `record_finding`, `request_approval`, `get_report`);
    - the orchestration skill;
    - sub-agents where the host supports them, otherwise steps run in sequence.
  - `## External security tools`:
    - tools registered with Themis appear as `themis__<server>__<tool>`;
    - reads run immediately within budget, redacted, wrapped as untrusted and audited;
    - writes/executes return an approval request.
  - `## Approvals`:
    - through MCP elicitation where the client supports it;
    - otherwise Themis never executes the action: it hands you the approved proposal to run with your assistant's own permission-gated tools, and records the outcome.
  - `## Honest boundary`:
    - tools connected straight to your assistant bypass Themis and are not governed or audited.
  - `## Runs and history`:
    - runs persist in `~/.themis/themis.db` and resume by run ID.
  - `## Example`:
    - a 5–8 line example prompt, e.g. "Use Themis to validate exposure to CVE-2026-12345 on vpn.example.internal; I am authorized to assess it."

- [ ] **18.3** `docs/themis/mode-2-app.md`, `# Themis standalone`:
  - `## Requirements`:
    - Node.js 22.13+ on Windows, macOS or Linux;
    - no Docker;
    - no build tools.
  - `## Start`:
    - both tabs of the `themis-app` path;
    - the default port, copied from the `packages/themis-app` source or README;
    - binds to 127.0.0.1 only.
  - `## Dashboard pages`:
    - Run, Sessions, Findings & Reports, Approvals, Skills, MCP servers, Models & Keys, Settings — one line each, as described in the master plan Phase 4.
  - `## Models`:
    - Anthropic, OpenAI and Gemini with your own key;
    - one OpenAI-compatible adapter for Ollama and LM Studio.
  - `## Skills`:
    - the app bundles its own Aegis copy;
    - the Skills page shows the version and intel freshness.
  - `## Data`:
    - everything lives in `~/.themis/` (link `./configuration.md`).

- [ ] **18.4** `docs/themis/governance.md`, `# Governance and approvals`:
  - `## Tool classes`:
    - read / write / execute, and their dispositions (auto vs approval).
  - `## Approval lifecycle`:
    - states pending → approved/rejected/expired;
    - `decidedBy` is always `human`.
  - `## Who can approve`:
    - only the dashboard Approvals page (after its session-token check), or the plugin's MCP elicitation response;
    - no tool, graph node or model output can approve.
  - `## Limits`:
    - per-run call budget, timeouts, size caps;
    - secret redaction;
    - output wrapped as `<external_tool_output untrusted>`.
  - `## Allowlists`:
    - default-deny;
    - a server is reachable only by the skills in its `allowedSkills`;
    - writes are proposed only if `allowWrite` is true.
  - `## Audit log`:
    - event kinds `step`, `tool_call`, `tool_result`, `approval_requested`, `approval_decided`, `finding`, `error`;
    - all redacted.
  - `## Failure behaviour`:
    - an unreachable server means no tools, never a crash.
  - `## Honest boundary`:
    - repeat the plugin-mode boundary.

- [ ] **18.5** `docs/themis/workflow.md`, `# Workflow`:
  - `## Steps`:
    - a table of step | kind | what happens, for the 7 steps. Copy the kinds from `THEMIS_WORKFLOW` (as in Task 14.2).
  - `## Transitions and guards`:
    - each step's allowed next steps and the guard rule, copied from `packages/themis-core` (the workflow definition file).
  - `## Run states`:
    - `running`, `awaiting_approval`, `completed`, `failed`.
  - `## One definition, two runtimes`:
    - the plugin runs the definition directly with the host AI doing the reasoning steps;
    - the app maps the same definition onto LangGraph.

- [ ] **18.6** `docs/themis/configuration.md`, `# Configuration`:
  - `## Home directory`:
    - `~/.themis/` holds `themis.db`, `config.json` and `.env`;
    - override with `THEMIS_HOME`.
  - `## External MCP servers`:
    - `config.json → mcpServers`, using the JSON format of today's `THEMIS_MCP_SERVERS`;
    - copy the example and every field (`id`, `transport`, `url`/`command`, `allowedSkills`, `allowWrite`, budget, timeout) from `packages/themis-core`'s `loadMcpServers` schema.
  - `## Model keys (standalone)`:
    - the env var names, copied exactly from `packages/themis-app` provider code;
    - keys stay in `~/.themis/.env` and are never sent anywhere except the chosen provider.
  - `## Local models`:
    - the OpenAI-compatible base URL setting name and the Ollama/LM Studio defaults, copied from `packages/themis-app`.

- [ ] **18.7** `docs/themis/versions.md`, `# Versions and compatibility`:
  - `## Version stamp`:
    - every report and run carries `{ themis, aegis, osk }`.
  - `## osk contract`:
    - Themis accepts any installed Aegis with the same osk major;
    - patch and minor updates are picked up automatically;
    - an osk major bump needs a Themis release.
  - `## Plugin vs app`:
    - the plugin doesn't bundle skills and pins `npx aegis-skills@^1 mcp` in its `.mcp.json`;
    - the app bundles Aegis.

- [ ] **18.8** Commit:

```bash
git add docs/themis
git commit -m "docs(themis): plugin, standalone app, governance, workflow and configuration"
```

### Task 19 — `docs/web/*.md`, README, TECHNICAL.md removal, docs content test

**Files:**

- Create: `docs/web/index.md`, `hosted-mcp.md`, `downloads.md`, `api.md`, `development.md`, `apps/web/tests/docs/content.test.js`
- Modify: `README.md`
- Delete: `docs/TECHNICAL.md` or `apps/web/docs/TECHNICAL.md` (the path from P5)

**Executor:** sonnet

- [ ] **19.1** `docs/web/index.md`, `# The website`:
  - `## What it hosts`:
    - catalogue, single-file prompts and zips, the hosted MCP, docs, and a read-only API.
  - `## What it doesn't do`:
    - no model calls, accounts, cookies, analytics or database;
    - it is built statically at deploy.
  - `## Security headers`:
    - list each header and value from `apps/web/next.config.js`, verbatim.
  - `## Source`:
    - `apps/web` in the repo;
    - deployed on Vercel at https://aegis-skills.vercel.app.

- [ ] **19.2** `docs/web/hosted-mcp.md`, `# Connect to the hosted Aegis MCP`:
  - `## Endpoint`:
    - the URL;
    - Streamable HTTP, stateless, no auth;
    - 64 KB request limit.
  - `## Claude.ai`, `## ChatGPT`, `## Claude Code`, `## Cursor`, `## VS Code`, `## Other clients`:
    - the `hosted-mcp` tabs, verbatim.
  - `## Check it works`:
    - the curl command from Task 14.3 and its expected output (three tool names).
  - `## Privacy`:
    - no application logs, analytics or accounts;
    - Vercel's standard platform request logs apply.
  - `## Prefer local?`:
    - link `../aegis/mcp.md`.

- [ ] **19.3** `docs/web/downloads.md`, `# Downloads`:
  - `## Files`:
    - URL patterns and zip layout.
  - `## index.json`:
    - the exact schema from Task 6 (all fields), with one example entry.
  - `## How they are built`:
    - the `prebuild` script `apps/web/scripts/build-downloads.js` runs before every build;
    - it uses the Phase 1 flattener `scripts/build-flat-prompts.js` and a dependency-free zip writer on `node:zlib`;
    - output goes to `apps/web/public/downloads/` and is never committed.
  - `## Reproducibility`:
    - zip timestamps are fixed to 1980-01-01, so the same skill content produces byte-identical zips;
    - `zipSha256` lets you verify a download.

- [ ] **19.4** `docs/web/api.md`, `# Read-only HTTP API`:
  - `## Endpoints`:
    - a table of method | path | returns:
      - `GET /api/skills`
      - `GET /api/<skill>/manifest`
      - `GET /api/<skill>/phase/<phaseId>` (text/markdown)
      - `POST /api/recommend` with body `{ "environments": [...], "attack_surface_tags": [...] }` (max 20 each, 4 KB)
      - `GET /api/health`
      - `/api/mcp`
    - every endpoint sends CORS `*` except `/api/mcp`.
  - `## Examples`:
    - curl for each, against `https://aegis-skills.vercel.app`.
  - `## Errors`:
    - 404 `skill not found` / `phase not found`;
    - 405;
    - 400 `Invalid request`.
  - `## Removed endpoints`:
    - `POST /api/<skill>/invoke` → use `GET /api/<skill>/phase/<phaseId>` or MCP `get_skill_phase`;
    - `/api/themis`, `/api/audit`, `/api/exposure` → moved into Themis standalone (link `../themis/mode-2-app.md`).
  - Note: this file is the one place where removed paths may appear. The content test in 19.7 allows them here only.

- [ ] **19.5** `docs/web/development.md`, `# Developing the website`:
  - `## Requirements`:
    - Node.js 22.13+.
  - `## Commands`:
    - `npm install` (repo root);
    - `npm run dev -w @aegis-skills/web`;
    - `npm run build -w @aegis-skills/web`;
    - `(cd apps/web && npx jest)`;
    - `npm run prebuild -w @aegis-skills/web`.
  - `## How docs are rendered`:
    - markdown from `docs/{aegis,themis,web}` via `marked`, with raw HTML escaped and relative links rewritten;
    - page order is set in `apps/web/lib/docs.js` (`SECTIONS`);
    - new files are appended alphabetically.
  - `## Adding a page`:
    - create `docs/<section>/<slug>.md` with a `# Title` and add the slug to `SECTIONS`.
  - `## Install commands`:
    - edit only `apps/web/lib/install-commands.js`;
    - tests pin it to the packages.
  - `## Deploy`:
    - Vercel builds with `npm run build`, which triggers `prebuild`;
    - no environment variables are needed.

- [ ] **19.6** Update `README.md`:
  - Remove every section about the website APIs `/api/themis`, `/api/audit`, `/api/exposure`, `/api/[skill]/invoke`, ChatGPT Actions, and "Deploying a skill" artifacts, if any remain after Phases 1/4.
  - Add or replace a `## Links` section with:
    - Website https://aegis-skills.vercel.app
    - Choose your path `/paths`
    - Docs `/docs`
    - Hosted MCP `/mcp`
    - Security `SECURITY.md`
    - License `LICENSE`

  Don't touch package-specific sections written by Phases 1–4.

- [ ] **19.7** Write the docs content test, `apps/web/tests/docs/content.test.js`:

```js
'use strict'

const fs = require('fs')
const path = require('path')
const { SECTIONS, listDocs, loadDoc } = require('../../lib/docs')
const { renderMarkdown } = require('../../lib/markdown')
const { DOCS_DIR, REPO_ROOT } = require('../../lib/site-paths')
const { AEGIS_PLATFORM_IDS } = require('../../lib/install-commands')

const FORBIDDEN = ['ChatGPT Action', 'openai-action', '@aegis-skills/core', 'aegis compile', 'better-sqlite3', 'Supabase']
const REMOVED = ['/api/themis', '/api/audit', '/api/exposure', '/invoke']

const allDocs = () => SECTIONS.flatMap(s => s.pages.map(p => loadDoc(DOCS_DIR, s.key, p)))

test('every page listed in SECTIONS exists and has an H1', () => {
  for (const s of SECTIONS) for (const p of s.pages) {
    const doc = loadDoc(DOCS_DIR, s.key, p)
    expect(doc && `${s.key}/${p}`).toBe(`${s.key}/${p}`)
    expect(doc.markdown.startsWith('# ')).toBe(true)
  }
})

test('no doc mentions removed products', () => {
  for (const d of allDocs()) {
    for (const bad of FORBIDDEN) expect(`${d.docPath}: ${d.markdown.includes(bad)}`).toBe(`${d.docPath}: false`)
    if (d.docPath !== 'docs/web/api.md') {
      for (const r of REMOVED) expect(`${d.docPath}: ${d.markdown.includes(r)}`).toBe(`${d.docPath}: false`)
    }
  }
})

test('README does not advertise removed website endpoints', () => {
  const readme = fs.readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf8')
  for (const bad of ['ChatGPT Action', 'openai-action', ...REMOVED]) expect(readme.includes(bad)).toBe(false)
})

test('every install --platform id in docs is real', () => {
  for (const d of allDocs()) {
    for (const m of d.markdown.matchAll(/install --platform ([a-z-]+)/g)) expect(AEGIS_PLATFORM_IDS).toContain(m[1])
  }
})

test('every internal /docs link resolves to a page', () => {
  const hrefs = new Set(listDocs(DOCS_DIR).flatMap(s => s.pages.map(p => p.href)).concat(['/docs']))
  for (const d of allDocs()) {
    const html = renderMarkdown(d.markdown, { docPath: d.docPath })
    for (const m of html.matchAll(/href="(\/docs[^"#]*)/g)) expect(`${d.docPath} → ${m[1]}: ${hrefs.has(m[1])}`).toBe(`${d.docPath} → ${m[1]}: true`)
  }
})
```

Run `(cd apps/web && npx jest tests/docs)`. Expected: 5 passed. Fix any doc the test names; don't weaken the test.

- [ ] **19.8** Delete `TECHNICAL.md`, using the path from P5:

```bash
git rm -q docs/TECHNICAL.md 2>/dev/null || git rm -q apps/web/docs/TECHNICAL.md
grep -rn "TECHNICAL.md" --include=*.md --include=*.js . --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=superpowers
```

Expected: no output. Remove any remaining link.

- [ ] **19.9** Commit:

```bash
git add -A docs/web README.md apps/web/tests/docs docs/TECHNICAL.md apps/web/docs 2>/dev/null; git add -A docs/web README.md apps/web/tests/docs
git commit -m "docs(web): hosted MCP, downloads, API and development guides; retire TECHNICAL.md"
```

---

### Task 20 — Full verification

**Files:** none (verification only)

**Executor:** sonnet

- [ ] **20.1** Run the whole web suite and the root suite:

```bash
(cd apps/web && npx jest 2>&1 | tail -n 8)
npx jest 2>&1 | tail -n 8
```

Expected: 0 failed in both.

- [ ] **20.2** Run the no-model sweep:

```bash
grep -rnE "@anthropic-ai|from 'openai'|require\('openai'\)|@google/generative-ai|@langchain|langsmith|better-sqlite3|supabase|process\.env\.(ANTHROPIC|OPENAI|GOOGLE|SUPABASE|NEXT_PUBLIC_SUPABASE|MISTRAL|DEEPSEEK|QWEN|NVIDIA|THEMIS)" apps/web --include=*.js --include=*.ts --include=*.tsx --include=*.json --exclude-dir=node_modules --exclude-dir=.next
```

Expected: no output.

- [ ] **20.3** Build:

```bash
npm run build -w @aegis-skills/web 2>&1 | tail -n 60
```

Expected:

- the first line of output contains `build-downloads: 24 prompts + 24 zips -> apps/web/public/downloads`;
- `✓ Compiled successfully`;
- the route table lists:
  - `/`, `/paths`, `/skills`, `/skills/[name]` (24 paths), `/themis`, `/mcp`, `/docs`, `/docs/[...slug]` (19 paths), `/security`, `/license`;
  - `/api/skills`, `/api/recommend`, `/api/health`, `/api/[skill]/manifest`, `/api/[skill]/phase/[phaseId]`, `/api/mcp`;
- no `/api/themis`, `/api/audit`, `/api/exposure` or `/api/[skill]/invoke`;
- no `Error`.

A "Large Page Data" warning for skill pages is acceptable; record it in the PR.

- [ ] **20.4** Runtime checks. Start the server in the background (`npm run start -w @aegis-skills/web`), wait for `Ready`, then run:

```bash
curl -s http://localhost:3000/api/skills | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).skills.length))"
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/compliance/invoke
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/themis
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" http://localhost:3000/downloads/skills/compliance.zip
curl -sI http://localhost:3000/downloads/prompts/compliance.md | grep -iE "cache-control|content-security-policy"
curl -s http://localhost:3000/api/compliance/phase/scope-definition | head -c 80; echo
curl -s -X POST http://localhost:3000/api/mcp -H "content-type: application/json" -H "accept: application/json, text/event-stream" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | grep -o '"name":"[a-z_]*"' | sort -u
for p in / /paths /skills /skills/compliance /themis /mcp /docs /docs/aegis /docs/aegis/install /docs/themis/governance /docs/web/hosted-mcp /security /license; do printf "%s " "$p"; curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000$p"; done
```

Expected, in order:

1. `24`
2. `404`
3. `404`
4. `200 application/zip`
5. both headers present (`Cache-Control: public, max-age=3600, must-revalidate`, plus the CSP)
6. markdown text
7. the 3 tool names
8. every page `200`

Leave the server running for 20.5.

- [ ] **20.5** Manual browser checklist. Open http://localhost:3000 in Chrome or Edge with DevTools. Tick each item in the PR:
  - [ ] Home: hero copy, twin cards, path matrix with 5 rows, four trust cells, intel section; all links work. No console errors (in particular no CSP violations).
  - [ ] `/paths`: 5 sections. The anchor links from the matrix scroll to them. Each tab switches content. COPY puts the exact command on the clipboard (paste into Notepad to check).
  - [ ] `/skills`: 24 rows; family buttons filter and their counts are right; search filters; "Find skills" with `cloud` + `api` returns ranked results; CLEAR resets.
  - [ ] `/skills/compliance`:
    - COPY PROMPT puts text starting with the intel stamp on the clipboard;
    - Download .md saves `compliance.md`;
    - Download .zip saves `compliance.zip`, which opens in Windows Explorer and shows `compliance/SKILL.md`, `skill.json` and `references/`;
    - the phases list shows LIVE on `live-threat-intel`;
    - the Scope and authorization section is rendered;
    - the install tabs work.
  - [ ] `/skills/does-not-exist` shows the 404 page.
  - [ ] `/themis`: comparison table, 7-step workflow, governance list, 4 screenshot placeholders, two install tab sets.
  - [ ] `/mcp`: endpoint, tools table, 6 connect tabs, local config, curl block.
  - [ ] `/docs`: 3 cards. Every link opens a page. The current page is highlighted in the side nav. A relative link inside a doc (e.g. install → mcp) goes to the site route, and "Edit this page" opens GitHub.
  - [ ] `/security` renders SECURITY.md plus the site facts. `/license` shows the dual licence and both links.
  - [ ] At 375 px width (DevTools device toolbar): there's no horizontal page scroll, tables scroll inside their box, and the docs nav stacks above the content.
  - [ ] Keyboard: Tab reaches the install tabs and copy buttons, and Enter activates them.

  Stop the server.

- [ ] **20.6** Confirm that no generated files are tracked:

```bash
git status --porcelain
```

Expected: empty. In particular, `apps/web/public/downloads` is not listed.

- [ ] **20.7** Run `graphify update .` (repo CLAUDE.md rule). Don't commit `graphify-out/` (contracts §8).

---

### Task 21 — Pull request

**Executor:** haiku

- [ ] **21.1** Push and open the PR:

```bash
git push -u origin restructure/phase-5-website
gh pr create --base main --title "Phase 5: website redesign and documentation hub" --body-file - <<'EOF'
## Summary
- Website presents Aegis + Themis as one pack: home, choose-your-path, catalogue, skill pages, Themis, hosted MCP, docs hub, security, license.
- Single-file prompts (intel-stamped) and skill zips generated at build time into public/downloads (gitignored), zip writer on node:zlib.
- Removed: /api/[skill]/invoke (ChatGPT Action), Supabase telemetry, Themis/audit/exposure remnants, LLM/LangChain/sqlite/Supabase deps, serverExternalPackages.
- Docs: docs/aegis (7), docs/themis (7), docs/web (5) rendered with marked (raw HTML escaped).

## Baseline
<paste P2–P8 outputs>

## Verification
<paste Task 20.1–20.4 outputs and the ticked 20.5 checklist>

## User actions after merge
See plan §USER ACTIONS: Vercel settings check, preview verification on Claude.ai/ChatGPT, then remove the old env vars and revoke unused provider keys.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```

Expected: a PR URL. Merging is a USER ACTION.

---

## 5. Caveats & pitfalls

1. **CommonJS pages bundle top-level requires into the client.** Next only removes `getStaticProps`-only imports for ES `import`. Any `require('fs')`, `lib/aegis`, `lib/markdown`, `lib/docs`, `lib/site-paths` or `marked` must sit **inside** `getStaticProps`/`getStaticPaths`. Top-level requires are limited to `react`, `next/head` (via Layout), components and the pure-data `lib/install-commands`. Task 12's test enforces this for the skill page; apply the same rule to every page.
2. **Never `require` the Phase 1 flattener from a page** (D7). Webpack can't bundle a computed `require(path.join(...))`. Pages read `public/downloads/*` with `fs`.
3. **`prebuild` must run before `next build`.** `npm run build` does that. If someone runs `npx next build` directly, the skill pages throw "public/downloads is missing". That's intentional and is the error message.
4. **cwd.** `lib/site-paths.js` handles both `apps/web` and the repo root. Don't add `process.cwd()` path logic anywhere else.
5. **`zlib.crc32`** exists from Node 22.2 / 20.15. Vercel's Node.js version must be 22.x or 24.x (USER ACTION U1).
6. **Jest jsdom uses the `browser` export condition.** Keep `marked` (and everything that requires it) out of jsdom test files. Render tests pass pre-built props; `getStaticProps` is tested in node-environment files.
7. **marked API.** On `marked@15` the renderer receives token objects (`html(token)` → `token.text`). Don't upgrade to a newer major in this phase.
8. **CSP is unchanged.** `img-src 'self' data:` means doc images must be served from `/img/...` in `public/`. External images won't load, by design.
9. **Clipboard** only works in secure contexts (https or localhost). That's fine on Vercel and on `localhost:3000`.
10. **`recommend` depends on `skill.json → context`.** P4 verifies it's there. If a later Aegis change drops `context`, the form returns everything with score 0. It doesn't crash.
11. **Next 14 vs 15 config keys.** Don't "replace" `serverExternalPackages` with `experimental.serverComponentsExternalPackages`; nothing needs it now.
12. **Tracing.** `/api/*` reads skills at runtime, so `outputFileTracingIncludes` must keep `packages/aegis/skills/**`. Pages are static and need no tracing.
13. **Windows line endings.** All parsers use `\r?\n`. Don't add `.gitattributes` changes in this phase.
14. **Large page data.** Skill pages embed the whole prompt for the copy button. Next may warn above 128 KB. Accept it and don't lazy-fetch (some browsers lose the user gesture before an async clipboard write).

## 6. STOP conditions (in addition to the universal ones in contracts §1)

- **S1.** Any P2/P4/P6/P8 expectation fails, beyond the bounded binding substitutions those steps allow.
- **S2.** `listSkills()` count ≠ 24, or any skill lacks `context`, or any skill lacks a `## Scope and authorization` section (Task 12).
- **S3.** Anything under `packages/` imports from `apps/web` (Task 1.1).
- **S4.** `apps/web/app/api/themis` exists but `packages/themis-app` has no exposure/audit code (Phase 4 not merged).
- **S5.** `next.config.js` has a top-level key outside the allowed list in 4.3.
- **S6.** `marked`'s `html` renderer receives a string instead of a token (wrong major).
- **S7.** A docs fact marked "copy from X" isn't present in X.
- **S8.** `SECURITY.md`'s H1 isn't `Security Policy`, or `LICENSE`/`LICENSE-APACHE`/`LICENSE-MIT` is missing.
- **S9.** A file outside this plan's File Structure (§2) would have to be edited to make a test pass. `packages/*` is read-only in this phase.
- **S10.** After Task 4, the build or a test needs a deleted package.

## 7. USER ACTIONS

- **U1. Before merge — Vercel project settings** (Settings → Build & Deployment). Confirm:
  - Root Directory is what Phase 0 set (expected `apps/web`);
  - Build Command is the default or `npm run build` (a bare `next build` override would skip `prebuild`);
  - Node.js Version is 22.x or 24.x;
  - "Include source files outside of the Root Directory in the Build Step" is **enabled** (the build reads `docs/`, `scripts/`, `packages/aegis/`, `SECURITY.md` and `LICENSE`).
- **U2. Preview deployment check** on the PR's Vercel preview URL. These need your logins:
  - Claude.ai → Settings → Connectors → Add custom connector with `<preview>/api/mcp`. Ask "list the Aegis skills".
  - ChatGPT → Settings → Apps & Connectors → Advanced → Developer mode → create a connector with the same URL, no auth. Ask the same question.
  - Claude.ai → Settings → Capabilities → Skills → upload `compliance.zip` from the preview's skill page.

  If any menu label differs from the text in `apps/web/lib/install-commands.js` or `docs/web/hosted-mcp.md`, tell the executor the exact labels so it can update both files.
- **U3. Merge the PR.** After the production deploy passes the U2 checks against `https://aegis-skills.vercel.app`, remove these environment variables from the Vercel project (all environments) — nothing in the site reads them any more:
  - `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `MISTRAL_API_KEY`, `DEEPSEEK_API_KEY`, `QWEN_API_KEY`, `NVIDIA_API_KEY`
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `THEMIS_MCP_SERVERS`, `THEMIS_DB_PATH`, `NEXT_PUBLIC_SITE_URL`
  - any `LANGCHAIN_*` / `LANGSMITH_*` variables

  Leave Vercel's system variables (`VERCEL_*`). Then revoke those provider API keys at Anthropic, OpenAI, Google and the others if they were created only for this site. Decide whether to pause or delete the Supabase project; its tables (`themis_rate_limits`, `themis_audit_log`, `themis_exposure_log`, `invocations`) are no longer written by anything.
- **U4. Optional — Themis screenshots.** Capture the four PNGs specified in Task 14 and add them under `apps/web/public/img/themis/`. The page switches from placeholders automatically on the next build.

## 8. Out of scope

- Phase 6 content: the compliance mapping (`docs/themis/compliance-mapping.md`; the Security page links to it automatically once it exists), the privacy policy, test prompts and marketplace listings.
- Any change under `packages/*`, root `scripts/*` or `.claude-plugin/*`.
- Publishing to npm, GitHub releases, and attaching zips to releases (Phase 7 may reuse `apps/web/lib/zip.js`).
- Playwright or other browser automation; site search; analytics; i18n; a theme switcher; visual rebrand (the existing palette and type stay).
- Authentication, rate limiting, or browser CORS for `/api/mcp`.
- Redirects for old URLs (`/docs` keeps its URL; old `/#skills` anchors are dropped).

## 9. Exit checklist

- [ ] `apps/web/package.json` dependencies are exactly `@modelcontextprotocol/sdk`, `aegis-skills`, `marked`, `next`, `react`, `react-dom`. The devDependencies are exactly the 13 listed in 4.2.
- [ ] `next.config.js` has no `serverExternalPackages`, the same security headers as before, a `/downloads` cache header, and tracing includes for `packages/aegis/skills`.
- [ ] Routes present: `/api/skills`, `/api/[skill]/manifest`, `/api/[skill]/phase/[phaseId]`, `/api/recommend`, `/api/health`, `/api/mcp`. Absent: invoke, themis, audit, exposure.
- [ ] No telemetry, no Supabase, no `lib/themis` and no `supabase/` folder remain in the repo.
- [ ] `npm run build -w @aegis-skills/web` generates 24 prompts and 24 zips. The build succeeds with the route table from 20.3.
- [ ] `public/downloads/` is gitignored and untracked.
- [ ] Pages exist: `/`, `/paths`, `/skills`, `/skills/[name]` (24), `/themis`, `/mcp`, `/docs`, `/docs/...` (19), `/security`, `/license`.
- [ ] Every install command on the site comes from `lib/install-commands.js` and is pinned by tests to the package names, bins, marketplace name and installer targets.
- [ ] `(cd apps/web && npx jest)` and root `npx jest` are green. The guard, docs-content, install-commands, zip, downloads and skill-page tests are all present.
- [ ] Task 20.4 runtime checks and the 20.5 manual checklist are ticked in the PR.
- [ ] `docs/TECHNICAL.md` is deleted. README has a Links section and no removed endpoints.
- [ ] PR is open. U1–U3 are listed for the user.
