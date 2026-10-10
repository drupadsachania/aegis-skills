# Phase 7 — Release Pipeline & CI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the monorepo a CI that guards every phase as it lands (Part A), then a tag-driven release pipeline that publishes each package independently to npm with provenance, attaches skill zips, a flattened-prompts bundle, Gemini extension archives and SHA256 checksums to a GitHub Release, turns the weekly intel commits into automatic Aegis patch releases, and deprecates `@aegis-skills/core` (Part B).

**Architecture:** One data table (`scripts/lib/release-manifests.js`) lists every file that embeds a package version. `bump-version.js` writes it and `check-versions.js` fails CI when anything drifts. A release is a commit on `main` plus an annotated tag `<npm-name>@<X.Y.Z>`. The tag push runs `release.yml`: resolve → verify (no secrets) → publish (OIDC, no `npm ci`, exact verified tarball) → GitHub Release + smoke tests from the registry. `intel-release.yml` runs every Monday, picking up what the maintainer's local Saturday intel-sync task committed. If only intel content changed since the last Aegis tag, it bumps the patch version, then pushes the commit and the tag with a bot PAT, which triggers `release.yml`. No changesets.

**Tech Stack:** GitHub Actions (ubuntu/windows/macos runners, actions pinned to commit SHAs), Node 22 (min 22.13.0) and 24, npm 11.21.0 in the publish job, npm trusted publishing (OIDC) with provenance, `gh` CLI, plain CommonJS Node scripts with `node:test`. No new npm dependencies.

> **AMENDMENT 2026-10-10 (binding; overrides anything below that conflicts) — monthly cadence, internal health.**
> 1. `skill-health.yml` cron becomes monthly (`0 0 1 * *`) instead of weekly; its output (`packages/aegis/health.json`, the below-threshold PR) is internal maintainer tooling and is never published or surfaced on the website.
> 2. `intel-release.yml` runs monthly (`0 6 2 * *`, the day after health) instead of every Monday; every "weekly" in release notes, commit messages, pin-churn caveats and Dependabot copy means "monthly" except Dependabot's action-pin bumps, which stay weekly.
> 3. The local intel-sync task cadence is the maintainer's own business and may stay as is; the guard (D13) must still accept its commits whenever they land.
> 4. Before the health score is ever made public, the scorer's keyword bias must be fixed (tracked finding); until then it stays internal.

---

## Decisions (binding for the executor)

| # | Decision | Why |
|---|---|---|
| D1 | **No changesets.** One script, `scripts/bump-version.js`, plus a drift check. | Changesets would add a dev dependency, a `.changeset/` workflow and a bot PR loop. It also only rewrites `package.json`, but five of our version-bearing files are not package.json (`plugin.json`, `gemini-extension.json`, `server.json`, `marketplace.json`, `.mcp.json` pins), so we would still need our own sync script. With five packages released by one maintainer, a 2-line manual procedure is simpler. The weekly intel release is a mechanical patch and needs no changeset. |
| D2 | Tags are `<npm-name>@<X.Y.Z>`: `aegis-skills@1.1.0`, `@aegis-skills/themis-core@0.1.0`, `@aegis-skills/themis-gateway@0.1.0`, `@aegis-skills/themis-plugin@0.1.0`, `@aegis-skills/themis@0.1.0`. Annotated tags only. | Same format as `npm pack`/lerna; one glob per family in the workflow trigger. |
| D3 | First versions: `aegis-skills@1.1.0` (continues `@aegis-skills/core@1.0.0`; matches osk `1.1`); every Themis package `0.1.0`. **No prereleases** (`bump-version` rejects `-rc` etc.); dist-tag is always `latest`. | Pre-publish testing is done with `npm pack` + tarball installs (contracts §3), so a `next` channel adds nothing. |
| D4 | Internal dependency ranges are always `^X.Y.Z`. `bump-version` rewrites a dependent's range to `^<new>` **only when the old range no longer accepts the new version**. | Weekly Aegis patches then never touch Themis manifests. A 0.x minor bump (not accepted by `^0.1.0`) or a major bump updates dependents, which prevents npm workspaces from silently fetching an old copy from the registry. |
| D5 | `SKILL.md` `metadata.version` and `skill.json` `version` are **per-skill content versions**. The bump script does not touch them. | Contracts §5 shows `"1.1.0"` as an example, but syncing them with the package version would rewrite 24 skills on every weekly patch. Reported as a contract clarification. |
| D6 | Publish order: `aegis-skills` (independent) → `themis-core` → `themis-gateway` → `themis-plugin` and `themis` (app). Enforced twice: tags are pushed one at a time (USER), and the publish job runs `scripts/wait-for-deps.js`, which blocks until every internal `^range` resolves on the registry. | Tag pushes start independent runs; GitHub `concurrency` would *cancel* queued runs, so it cannot serialise them. |
| D7 | Auth: **npm trusted publishing (OIDC)** for every release. New package names cannot have a trusted publisher until they exist, so the first version of each package is published by the same workflow with a short-lived granular token (`NPM_BOOTSTRAP_TOKEN`, environment secret). Then the trusted publishers are configured, a validation patch of each package is published within 48 h, tokens are disallowed on each package, and the secret is deleted. | Verified facts F1–F3. Provenance is kept for the bootstrap versions with `--provenance`. |
| D8 | The publish job never runs `npm ci` or any project install script. It downloads the tarball that the verify job built and checked, and runs `npm publish <tarball>`. | The job that holds `id-token: write` runs no third-party code except npm itself. |
| D9 | GitHub Release assets for Aegis are built from the website's own download generator (Phase 5 `apps/web/scripts/build-downloads.js`), so release zips are byte-identical to the site's. The zip writer moves from `apps/web/lib/zip.js` to `scripts/lib/zip.js`, and a re-export shim stays at the old path. | The master plan forbids anything depending on the web app. A neutral `scripts/lib` module serves both. |
| D10 | Gemini (finding 6.8): the repo root has no `gemini-extension.json`, and Gemini needs it at the archive or repo root (F6). So each Aegis release attaches `darwin.<ext>.zip`, `linux.<ext>.zip` and `win32.<ext>.zip` (identical content: the npm file list of `packages/aegis` at the archive root). Only Aegis releases are marked **Latest**. Every Themis release uses `--latest=false`. | Gemini looks for assets on the repo's *Latest* release (F6). If a Themis release were Latest, `gemini extensions install https://github.com/drupadsachania/aegis-skills` would break. |
| D11 | `@aegis-skills/core` gets `npm deprecate` only. **No final 1.x notice release.** | The deprecation warning already prints on every install and update of core. A notice release would mean publishing the old monolith again (Next, LangChain, `better-sqlite3`) with a token, because core has no trusted publisher. It would reach only users who update, and they already see the warning. |
| D12 | Intel-sync is **not** CI (cross-phase finding 0.5). It is a local Claude scheduled task on the maintainer's machine that runs on **Saturdays**. `scripts/intel-sync.js` reads local corpora (`C:/Users/Drupad/Cybersec-News`, `C:/Users/Drupad/God mode`), and the maintainer's account commits and pushes the result ("chore: weekly Aegis intel sync …"). Its state file `packages/aegis/.intel-sync-state.json` is gitignored and never reaches CI. Some skills (`exposure-validation`, `threat-modeling`) have no `intel-state.json`. `intel-release.yml` never runs intel-sync and never reads its state file. It only looks at what is committed on `main`. It runs on **Monday at 06:00 UTC**: after the Saturday sync was pushed and after the Monday 00:00 UTC health run. If the Saturday sync did not run or pushed nothing, the decision is simply `release=false`. | Running intel-sync in Actions is impossible (no corpus on the runner). Releasing from committed state means a missed or late local run is harmless. |
| D16 | **Exact version pins** everywhere a manifest launches one of our packages through `npx` (finding 6.1). This covers `packages/aegis/.mcp.json`, `packages/aegis/gemini-extension.json`, `packages/themis-plugin/.mcp.json` and `packages/themis-plugin/gemini-extension.json`. Examples: `aegis-skills@1.1.3` and `@aegis-skills/themis-plugin@0.1.1`, never `@^1`. `check-versions` fails on any range pin, and on any pin that differs from the current workspace version. `bump-version` rewrites every pin of the bumped package. This **supersedes** the `npx aegis-skills@^1 mcp` example in the master plan and contracts §6 (reported as a contract conflict). | The Anthropic plugin directory rejects unpinned `npx` packages. Consequence: every weekly Aegis patch also rewrites the Aegis pin in `packages/themis-plugin/.mcp.json`, inside the same release commit. Marketplace users of the Themis plugin get the new pin from git without a Themis npm release. |
| D17 | ChatGPT (finding 6.7): submission is a ZIP plugin package in the Agent Plugins format, checked 2026-10-08 at <https://developers.openai.com/plugins/deploy/submission.md>. Its layout is root `plugin.json` (`$schema` agent-plugins 1.0.0) + root `mcp.json` (remote `url`) + `skills/<name>/SKILL.md` (+ `references/`). Phase 6 owns the listing source in `listings/chatgpt/` (`plugin.json`, `mcp.json`, `assets/`). Phase 7 owns `scripts/build-chatgpt-bundle.js`, which assembles and validates the ZIP. Every Aegis release attaches it as `aegis-chatgpt-plugin-<version>.zip` once `listings/chatgpt/plugin.json` exists. `listings/chatgpt/plugin.json` `version` is synced by `bump-version` (optional manifest). | Keeps the listing text with Phase 6 and the packaging and versioning with the release pipeline. The bundle reuses the exact skill files that ship on npm. |
| D13 | Auto-release guard: release only if (a) the Aegis `package.json` version equals the newest `aegis-skills@*` tag, (b) every file changed under `packages/aegis/` since that tag is intel-managed (`skills/*/references/live-threat-intel.md`, `skills/*/intel-state.json`, `health.json`, `.intel-sync-state.json`), and (c) at least one changed file actually ships in the package (`live-threat-intel.md`). Anything else is skipped with a reason in the job summary, never failed. | Prevents empty releases and stops human edits from being released as patches without a human choosing the version. |
| D14 | Bot pushes (health scores, intel release commits and tags) use PATs, never `GITHUB_TOKEN`. | Pushes made with `GITHUB_TOKEN` do not trigger other workflows (F8), so the tag would never start `release.yml`. |
| D15 | Every repo-level script is plain CommonJS with only Node built-ins and is tested with `node --test` (root script `test:scripts`), not Jest. | It does not depend on the Jest `projects` layout that other phases own, and it runs on Windows and Linux. |

---

## Preconditions

Run everything in **Git Bash** from the repo root (`openskill/`).

- **Part A** starts after Phase 0 is merged. Its tasks land in three slices (see "Landing schedule").
- **Part B** starts after Phases 1–5 are merged, and before any Phase 6 listing that needs a published package (MCP Registry, Gemini gallery).

Layout facts this plan relies on. They come from `phase-0-scaffold.md` decisions D1, D2 and D6; Task A0 re-checks them:

- `scripts/` stays at the repo root.
- `health.json` lives at `packages/aegis/health.json`. `.intel-sync-state.json` lives at `packages/aegis/.intel-sync-state.json` and is gitignored.
- The root `package.json` is `aegis-skills-monorepo`, private, with workspaces `packages/*` and `apps/*`, and `npm test` = `jest`.
- `packages/aegis/package.json` is named `aegis-skills`. Phase 0 makes it private, version 1.0.0. Phase 1 removes `private`.
- Package `repository.url` is `https://github.com/drupadsachania/aegis-skills`, with `directory` set.
- Phase 1 provides `scripts/build-flat-prompts.js`, `npm run lint:skills` and `npm run check:deps`.
- Phase 5 provides `apps/web/lib/zip.js` (`createZip`), `apps/web/scripts/build-downloads.js` and `npm run prebuild -w @aegis-skills/web`. These write `apps/web/public/downloads/{index.json,prompts/*.md,skills/*.zip}`.

### Landing schedule

| Slice | Branch | When | Tasks |
|---|---|---|---|
| A-early | `restructure/phase-7a-ci` | right after Phase 0 merges (parallel with Phase 1) | A0, A1 |
| A-tooling | `restructure/phase-7b-release-tooling` | right after Phase 1 merges | A2, A3, A4, A5 |
| A-themis | `restructure/phase-7c-themis-ci` | after Phase 2 merges (A6) and again after Phases 3+4 merge (A7) | A6, A7 |
| B | `restructure/phase-7d-release` | after Phase 5 merges | B1–B5, then USER gate B6, then B7–B9 on `main` |

CI jobs in `ci.yml` switch themselves on as the parts they test appear (the `detect` job), so A1 can merge before anything else exists.

## Verified external facts (checked 2026-10-07/08)

- **F1** npm trusted publishing (<https://docs.npmjs.com/trusted-publishers>):
  - needs npm CLI ≥ 11.5.1 and Node ≥ 22.14.0, and the job needs `permissions: id-token: write`;
  - GitHub-hosted runners only;
  - provenance is automatic for public repo + public package;
  - workflow filename must match exactly (case-sensitive, cannot be edited later), environment name optional;
  - with reusable workflows the *calling* workflow's name is checked;
  - "A newly created trusted publisher configuration must complete its first successful publish within 2 days … it expires";
  - docs recommend "Require two-factor authentication and disallow tokens" afterwards;
  - dist-tag operations via OIDC need npm ≥ 11.21.0.
- **F2** Trusted publishers are configured in an *existing* package's settings. The docs do not describe a pre-publish (pending) configuration, so new names need a first publish by another method (community reports agree).
- **F3** npm token changes (GitHub changelog 2025-09-29, 2025-11-05, 2025-12-09):
  - classic tokens are revoked;
  - granular write tokens default to a 7-day expiry, with a 90-day maximum, and need an explicit "Bypass 2FA" option for CI;
  - `npm login` sessions last 2 h.
- **F4** npm today: `npm@11.21.0` is the newest 11.x and `npm@12.2.0` is `latest`. `aegis-skills` and `@aegis-skills/themis` return 404 (unclaimed). `@aegis-skills/core` has 0.1.3, 0.2.0, 0.3.0, 1.0.0.
- **F5** Action SHAs (lightweight tags, so the SHA is the commit). Task A0 re-verifies them:
  - `actions/checkout` v7.0.1 = `3d3c42e5aac5ba805825da76410c181273ba90b1`;
  - `actions/setup-node` v7.0.0 = `820762786026740c76f36085b0efc47a31fe5020`;
  - `actions/upload-artifact` v7.0.2 = `cf430e030ddbb5b0abf93d22962f4752f3646cd9`;
  - `actions/download-artifact` v8.0.2 = `9000827ccba6bdab643e8b6fd33ac0654aef8333`.
  - checkout v7 blocks fork-PR checkout under `pull_request_target`/`workflow_run`.
  - setup-node v6+ caches npm automatically when it detects npm; disable with `package-manager-cache: false`.
- **F6** Gemini CLI extensions (<https://geminicli.com/docs/extensions/releasing/>):
  - "Ensure your `gemini-extension.json` file is in the absolute root of the repository or the release archive";
  - release assets are matched as `{platform}.{arch}.{name}.{ext}`, then `{platform}.{name}.{ext}`, and a single generic asset is the fallback; platforms `darwin|linux|win32`, ext `.tar.gz|.zip`;
  - "Gemini CLI checks for updates by looking for the **Latest** release on GitHub."
- **F7** MCP Registry `server.json` (schema `2025-12-11`) has a top-level `version` and `packages[]` entries `{ registryType: "npm", identifier, version, transport }`.
- **F8** GitHub Actions:
  - events caused by `GITHUB_TOKEN` (except `workflow_dispatch`/`repository_dispatch`) do not start new workflow runs;
  - a `[skip ci]` in the head commit message suppresses `push` workflows, tag pushes included, so release commits must **not** contain `[skip ci]`;
  - a `concurrency` group keeps at most one pending run and cancels older pending runs.
- **F10** ChatGPT plugin submission (<https://developers.openai.com/plugins/deploy/submission.md>, checked 2026-10-08):
  - submit "the package you've already built as a ZIP" and keep secrets out of it;
  - Agent Plugins format: root `plugin.json` with `$schema` `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`; `name` ≤ 64 chars, lowercase, single hyphens;
  - MCP servers are declared in root `mcp.json`, and only one MCP server may be connected per plugin; skills go in `skills/<name>/SKILL.md`;
  - icons must be PNG/JPEG/WebP/SVG, ≤ 5 MiB, square, at least 48 px;
  - ZIPs with `apps`/`.app.json` or lifecycle hooks are rejected.
- **F9** `gh release create` supports `--verify-tag`, `--generate-notes`, `--notes-start-tag`, `--notes-file` and `--latest=false`.

---

## File Structure

| Path | Task | Purpose |
|---|---|---|
| `.github/workflows/ci.yml` | A1 | PR/push CI: lint, guards, Jest matrix, web build, pack assertions, clean tarball installs (Windows included) |
| `.github/dependabot.yml` | A1 | Weekly bumps of the pinned action SHAs |
| `scripts/ci-detect.js` | A1 | Reports which parts of the restructure exist |
| `scripts/assert-no-native.js` | A1 | Fails if an installed tree contains `*.node` or `binding.gyp` |
| `scripts/lib/release-manifests.js` | A2 (+A4 `packFiles`) | Version table, semver helpers, pin helpers, npm file list |
| `scripts/__tests__/release-manifests.test.js` | A2 | Unit tests |
| `scripts/check-versions.js` | A3 | Drift check; `--tag` mode for the release workflow |
| `scripts/bump-version.js` | A3 | The only way to change a package version |
| `scripts/__tests__/bump-version.test.js` | A3 | Fixture tests for bump + check |
| `package.json` (root) | A3 | Adds `check:versions`, `bump`, `test:scripts` |
| `scripts/assert-pack.js` | A4 | Tarball content assertion per package |
| `scripts/pack-to.js` | A4 | Packs one workspace into a folder and prints the tarball path |
| `packages/*/LICENSE`, `LICENSE-APACHE`, `LICENSE-MIT` | A4, A6, A7 | Licence files inside every publishable package |
| `.github/workflows/skill-health.yml` | A5 | Hardened: SHA pins, least privilege, no `npm ci` |
| `scripts/lib/zip.js` (moved), `apps/web/lib/zip.js` (shim) | B1 | Shared zip writer |
| `scripts/build-chatgpt-bundle.js` | B2 | ChatGPT plugin ZIP (Agent Plugins format) from `listings/chatgpt/` + skills |
| `scripts/build-release-assets.js` | B2 | Builds release assets + `SHA256SUMS` |
| `scripts/wait-for-deps.js` | B3 | Publish-order guard |
| `.github/workflows/release.yml` | B3 | Tag-triggered publish + GitHub Release + smoke |
| `scripts/intel-release-check.js`, `scripts/__tests__/intel-release-check.test.js` | B4 | Auto-release decision |
| `.github/workflows/intel-release.yml` | B4 | Weekly automated Aegis patch release |
| `.github/release-notes/aegis-skills@1.1.0.md` | B5 | Migration notes (deprecation target) |
| `.gitignore` | B5 | Adds `dist-release/` |

Conventions for every task:
- After any code change, run `graphify update .` if the `graphify` command exists. `graphify-out/` is never committed.
- Never commit `.env*`, `graphify-out/`, `*.tgz`, `node_modules/` or `dist-release/`.

---

# Part A — CI that lands with Phases 0–4

### Task A0: Baseline and preconditions — executor: haiku

**Files:** none (read-only).

- [ ] **A0.1** Create the branch:
  ```bash
  git switch main && git pull --ff-only && git switch -c restructure/phase-7a-ci
  ```
- [ ] **A0.2** Check the Phase 0 layout:
  ```bash
  node -e "const p=require('./package.json');console.log(p.name,p.private,JSON.stringify(p.workspaces),p.scripts.test)"
  for f in scripts/skill-health.js scripts/intel-sync.js packages/aegis/health.json packages/aegis/package.json apps/web/package.json .github/workflows/skill-health.yml; do test -e "$f" && echo "ok $f" || echo "MISSING $f"; done
  test ! -e health.json && echo "ok no root health.json"
  grep -c "packages', 'aegis'" scripts/skill-health.js scripts/intel-sync.js
  ```
  Expected:
  - `aegis-skills-monorepo true ["packages/*","apps/*"] jest`;
  - six `ok` lines, then `ok no root health.json`;
  - both grep counts are ≥ 1.

  Anything else: STOP.
- [ ] **A0.3** Re-verify the action SHAs (F5):
  ```bash
  for x in "actions/checkout v7.0.1" "actions/setup-node v7.0.0" "actions/upload-artifact v7.0.2" "actions/download-artifact v8.0.2"; do set -- $x; git ls-remote "https://github.com/$1.git" "refs/tags/$2" "refs/tags/$2^{}"; done
  ```
  Expected, exactly one line each:
  - `3d3c42e5aac5ba805825da76410c181273ba90b1	refs/tags/v7.0.1`
  - `820762786026740c76f36085b0efc47a31fe5020	refs/tags/v7.0.0`
  - `cf430e030ddbb5b0abf93d22962f4752f3646cd9	refs/tags/v7.0.2`
  - `9000827ccba6bdab643e8b6fd33ac0654aef8333	refs/tags/v8.0.2`

  If a `^{}` line appears, use its SHA. If a SHA differs: STOP (possible retag).
- [ ] **A0.4** Baseline:
  ```bash
  npm ci && npm test 2>&1 | tail -n 5
  ```
  Expected: Jest summary with `failed` absent. Record the pass counts. Failures → universal STOP 2.

### Task A1: `ci.yml`, detection, native guard, Dependabot — executor: sonnet

**Files:** create `.github/workflows/ci.yml`, `.github/dependabot.yml`, `scripts/ci-detect.js`, `scripts/assert-no-native.js`.

- [ ] **A1.1** Create `scripts/ci-detect.js`:
  ```js
  #!/usr/bin/env node
  'use strict'
  // Tells CI which parts of the restructure exist yet, so jobs switch on as phases land.
  // Prints key=value lines and appends them to $GITHUB_OUTPUT when set.
  const fs = require('fs')

  const has = f => fs.existsSync(f)
  const nameOf = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')).name } catch { return null } }
  const scripts = JSON.parse(fs.readFileSync('package.json', 'utf8')).scripts || {}
  const packTool = has('scripts/assert-pack.js') && has('scripts/pack-to.js')

  const PKGS = [
    ['aegis', 'packages/aegis', 'aegis-skills'],
    ['themis-core', 'packages/themis-core', '@aegis-skills/themis-core'],
    ['themis-gateway', 'packages/themis-gateway', '@aegis-skills/themis-gateway'],
    ['themis-plugin', 'packages/themis-plugin', '@aegis-skills/themis-plugin'],
    ['themis', 'packages/themis-app', '@aegis-skills/themis']
  ]
  const present = PKGS.filter(([, dir, name]) => nameOf(`${dir}/package.json`) === name).map(([key]) => key)

  const out = {
    lint_skills: Boolean(scripts['lint:skills']),
    check_deps: Boolean(scripts['check:deps']),
    release_scripts: has('scripts/check-versions.js') && Boolean(scripts['check:versions']) && Boolean(scripts['test:scripts']),
    aegis: packTool && present.includes('aegis'),
    themis_app: packTool && ['themis-core', 'themis-gateway', 'themis'].every(k => present.includes(k)),
    web: has('apps/web/package.json'),
    packs: JSON.stringify(packTool ? present : [])
  }
  const lines = Object.entries(out).map(([k, v]) => `${k}=${v}`)
  console.log(lines.join('\n'))
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, lines.join('\n') + '\n')
  ```
- [ ] **A1.2** Create `scripts/assert-no-native.js`:
  ```js
  #!/usr/bin/env node
  'use strict'
  // Fails if an installed dependency tree contains native addons (*.node) or node-gyp projects (binding.gyp).
  // Usage: node scripts/assert-no-native.js <node_modules dir>
  const fs = require('fs')
  const path = require('path')

  const root = path.resolve(process.argv[2] || 'node_modules')
  if (!fs.existsSync(root)) { console.error(`assert-no-native: ${root} does not exist`); process.exit(2) }

  const hits = []
  let scanned = 0
  const stack = [root]
  while (stack.length) {
    const dir = stack.pop()
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isSymbolicLink()) continue
      if (e.isDirectory()) { stack.push(p); continue }
      scanned++
      if (e.name.endsWith('.node') || e.name === 'binding.gyp') hits.push(path.relative(root, p))
    }
  }
  if (hits.length) {
    console.error(`assert-no-native: ${hits.length} native artefact(s) found:`)
    hits.slice(0, 50).forEach(h => console.error(`  - ${h}`))
    process.exit(1)
  }
  console.log(`assert-no-native: OK (${scanned} files scanned, no *.node or binding.gyp)`)
  ```
- [ ] **A1.3** Create `.github/workflows/ci.yml` with exactly:
  ```yaml
  name: CI

  on:
    pull_request:
      branches: [main]
    push:
      branches: [main]
    workflow_dispatch:

  # Least privilege for every job. Nothing here uses secrets, so fork PRs run safely.
  # Never add pull_request_target or workflow_run triggers to this file.
  permissions:
    contents: read

  concurrency:
    group: ci-${{ github.event.pull_request.number || github.ref }}
    cancel-in-progress: ${{ github.event_name == 'pull_request' }}

  defaults:
    run:
      shell: bash

  jobs:
    detect:
      name: Detect layout
      runs-on: ubuntu-latest
      outputs:
        lint_skills: ${{ steps.d.outputs.lint_skills }}
        check_deps: ${{ steps.d.outputs.check_deps }}
        release_scripts: ${{ steps.d.outputs.release_scripts }}
        aegis: ${{ steps.d.outputs.aegis }}
        themis_app: ${{ steps.d.outputs.themis_app }}
        web: ${{ steps.d.outputs.web }}
        packs: ${{ steps.d.outputs.packs }}
      steps:
        - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
          with:
            persist-credentials: false
        - id: d
          run: node scripts/ci-detect.js

    lint:
      name: Lint & guards
      needs: detect
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
          with:
            persist-credentials: false
        - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
          with:
            node-version: '22'
            cache: npm
        - run: npm ci
        - name: Skill lint
          if: needs.detect.outputs.lint_skills == 'true'
          run: npm run lint:skills
        - name: Dependency guards
          if: needs.detect.outputs.check_deps == 'true'
          run: npm run check:deps
        - name: Version drift
          if: needs.detect.outputs.release_scripts == 'true'
          run: npm run check:versions

    test:
      name: Test (${{ matrix.os }}, Node ${{ matrix.node }})
      needs: detect
      runs-on: ${{ matrix.os }}
      strategy:
        fail-fast: false
        matrix:
          include:
            - { os: ubuntu-latest, node: '22.13.0' }
            - { os: ubuntu-latest, node: '22' }
            - { os: ubuntu-latest, node: '24' }
            - { os: windows-latest, node: '22' }
      steps:
        - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
          with:
            persist-credentials: false
        - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
          with:
            node-version: ${{ matrix.node }}
            cache: npm
        - run: npm ci
        - name: Build TypeScript packages (tests import dist/)
          run: |
            for d in themis-core themis-gateway themis-plugin themis-app; do
              if [ -f "packages/$d/package.json" ]; then npm run build --workspace "packages/$d" --if-present; fi
            done
        - run: npm test
        - name: Release script tests
          if: needs.detect.outputs.release_scripts == 'true'
          run: npm run test:scripts

    web:
      name: Web build
      needs: detect
      if: needs.detect.outputs.web == 'true'
      runs-on: ubuntu-latest
      env:
        NEXT_TELEMETRY_DISABLED: '1'
        # Non-secret placeholders so module-level client construction does not throw at build time.
        SUPABASE_URL: https://ci-placeholder.invalid
        SUPABASE_ANON_KEY: ci-placeholder
        NEXT_PUBLIC_SUPABASE_URL: https://ci-placeholder.invalid
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ci-placeholder
        NEXT_PUBLIC_SITE_URL: http://localhost:3000
      steps:
        - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
          with:
            persist-credentials: false
        - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
          with:
            node-version: '22'
            cache: npm
        - run: npm ci
        - run: npm run build --workspace apps/web

    pack:
      name: Pack (${{ matrix.package }})
      needs: detect
      if: needs.detect.outputs.packs != '[]'
      runs-on: ubuntu-latest
      strategy:
        fail-fast: false
        matrix:
          package: ${{ fromJSON(needs.detect.outputs.packs) }}
      env:
        PKG_KEY: ${{ matrix.package }}
      steps:
        - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
          with:
            persist-credentials: false
            fetch-depth: 0
        - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
          with:
            node-version: '22'
            cache: npm
        - run: npm ci
        - name: Build TypeScript packages
          run: |
            for d in themis-core themis-gateway themis-plugin themis-app; do
              if [ -f "packages/$d/package.json" ]; then npm run build --workspace "packages/$d" --if-present; fi
            done
        - name: Assert tarball contents
          run: node scripts/assert-pack.js "$PKG_KEY"
        - name: Build release assets (dry run)
          if: matrix.package == 'aegis' && hashFiles('scripts/build-release-assets.js') != ''
          run: |
            npm run prebuild --workspace @aegis-skills/web
            node scripts/build-release-assets.js --package aegis --out "$RUNNER_TEMP/assets"
            cat "$RUNNER_TEMP/assets/SHA256SUMS"

    install-aegis:
      name: Install aegis-skills (${{ matrix.os }})
      needs: detect
      if: needs.detect.outputs.aegis == 'true'
      runs-on: ${{ matrix.os }}
      strategy:
        fail-fast: false
        matrix:
          os: [ubuntu-latest, windows-latest, macos-latest]
      steps:
        - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
          with:
            persist-credentials: false
        - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
          with:
            node-version: '22'
            package-manager-cache: false
        - name: Install the packed tarball into a clean project and run the CLI
          env:
            npm_config_node_gyp: /nonexistent/node-gyp.js
            AEGIS_NO_AUTO_REFRESH: '1'
          run: |
            T=$(node -p "process.env.RUNNER_TEMP.split(require('path').sep).join('/')")
            TGZ=$(node scripts/pack-to.js aegis "$T/pkgs")
            mkdir -p "$T/aegis-install" "$T/home"
            cd "$T/aegis-install"
            npm init -y > /dev/null
            npm install --no-audit --no-fund "$TGZ"
            node "$GITHUB_WORKSPACE/scripts/assert-no-native.js" node_modules
            V=$(node -p "require('aegis-skills/package.json').version")
            OUT=$(npx --no -- aegis --version)
            echo "aegis --version -> $OUT"
            case "$OUT" in *"$V"*) ;; *) echo "::error::expected version $V"; exit 1 ;; esac
            HOME="$T/home" USERPROFILE="$T/home" npx --no -- aegis install --platform claude --project
            EXPECTED=$(node -p "require('fs').readdirSync('node_modules/aegis-skills/skills',{withFileTypes:true}).filter(e=>e.isDirectory()).length")
            GOT=$(node -p "const fs=require('fs');fs.readdirSync('.claude/skills',{withFileTypes:true}).filter(e=>e.isDirectory()&&fs.existsSync('.claude/skills/'+e.name+'/SKILL.md')).length")
            echo "skills installed: $GOT / $EXPECTED"
            test "$GOT" = "$EXPECTED"

    install-themis:
      name: Install themis (${{ matrix.os }})
      needs: detect
      if: needs.detect.outputs.themis_app == 'true'
      runs-on: ${{ matrix.os }}
      strategy:
        fail-fast: false
        matrix:
          os: [ubuntu-latest, windows-latest]
      steps:
        - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
          with:
            persist-credentials: false
        - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
          with:
            node-version: '22'
            cache: npm
        - run: npm ci
        - name: Build TypeScript packages
          run: |
            for d in themis-core themis-gateway themis-plugin themis-app; do
              if [ -f "packages/$d/package.json" ]; then npm run build --workspace "packages/$d" --if-present; fi
            done
        - name: Install themis from tarballs with native builds disabled
          env:
            # A bogus node-gyp path makes any native compile fail, even on runners that have build tools.
            npm_config_node_gyp: /nonexistent/node-gyp.js
          run: |
            T=$(node -p "process.env.RUNNER_TEMP.split(require('path').sep).join('/')")
            : > "$T/tgz.txt"
            for k in aegis themis-core themis-gateway themis; do node scripts/pack-to.js "$k" "$T/pkgs" >> "$T/tgz.txt"; done
            mkdir -p "$T/themis-install" "$T/home"
            cd "$T/themis-install"
            npm init -y > /dev/null
            npm install --no-audit --no-fund $(cat "$T/tgz.txt")
            node "$GITHUB_WORKSPACE/scripts/assert-no-native.js" node_modules
            HOME="$T/home" USERPROFILE="$T/home" THEMIS_HOME="$T/home/.themis" npx --no -- themis --help | tee help.txt
            grep -q dashboard help.txt
  ```
- [ ] **A1.4** Create `.github/dependabot.yml`:
  ```yaml
  version: 2
  updates:
    - package-ecosystem: github-actions
      directory: /
      schedule:
        interval: weekly
      groups:
        actions:
          patterns: ['*']
  ```
- [ ] **A1.5** Verify locally:
  ```bash
  node scripts/ci-detect.js
  node scripts/assert-no-native.js packages/aegis 2>&1 | tail -n 1
  node -e "for (const f of ['.github/workflows/ci.yml','.github/dependabot.yml']) { const t=require('fs').readFileSync(f,'utf8'); if (/\t/.test(t)) throw new Error('tab in '+f) } console.log('no tabs')"
  ```
  Expected:
  - `lint_skills=false` (or `true` if Phase 1 already merged), `check_deps=…`, `release_scripts=false`, `aegis=false`, `themis_app=false`, `web=true`, `packs=[]`;
  - `assert-no-native: OK (N files scanned, …)`;
  - `no tabs`.
- [ ] **A1.6** Commit, push, open the PR:
  ```bash
  git add .github/workflows/ci.yml .github/dependabot.yml scripts/ci-detect.js scripts/assert-no-native.js
  git commit -m "ci: add monorepo CI with layout detection, Node 22 matrix and Windows install checks"
  git push -u origin restructure/phase-7a-ci
  gh pr create --base main --title "ci: monorepo CI (Phase 7 part A, early slice)" --body "Adds ci.yml (lint/guards/test matrix/web build/pack/install jobs that switch on as phases land), Dependabot for pinned action SHAs, and two helper scripts. No secrets are used; safe for fork PRs.

  🤖 Generated with [Claude Code](https://claude.com/claude-code)"
  ```
  Then wait for the PR checks: `gh pr checks --watch`. Expected: `Detect layout`, `Lint & guards`, all four `Test (…)` jobs and `Web build` pass. `Pack`, `Install aegis-skills` and `Install themis` show as skipped.
  - If `Web build` fails with an error about a missing env var, add only that variable name with a `ci-placeholder` value to the `web` job `env`, then re-push.
  - Any other failure: STOP.

  Merging is a USER ACTION.

### Task A2: Release manifest library — executor: sonnet (lands after Phase 1)

**Files:** create `scripts/lib/release-manifests.js`, `scripts/__tests__/release-manifests.test.js`.

- [ ] **A2.0** Branch and check Phase 1 outputs:
  ```bash
  git switch main && git pull --ff-only && git switch -c restructure/phase-7b-release-tooling
  for f in packages/aegis/.claude-plugin/plugin.json packages/aegis/.mcp.json packages/aegis/gemini-extension.json packages/aegis/GEMINI.md packages/aegis/server.json .claude-plugin/marketplace.json; do test -e "$f" && echo "ok $f" || echo "MISSING $f"; done
  node -e "const p=require('./packages/aegis/package.json');console.log(p.name,p.version,p.private===true?'PRIVATE':'public',p.license,p.engines&&p.engines.node,JSON.stringify(p.repository))"
  node -e "const m=require('./.claude-plugin/marketplace.json');console.log(m.plugins.map(p=>p.name+'@'+p.version).join(','))"
  node -e "const s=require('./packages/aegis/server.json');console.log(s.version,JSON.stringify(s.packages.map(p=>[p.registryType,p.identifier,p.version])))"
  ```
  Expected:
  - six `ok`;
  - `aegis-skills <ver> public (Apache-2.0 OR MIT) >=22.13 {"type":"git","url":"https://github.com/drupadsachania/aegis-skills","directory":"packages/aegis"}`;
  - the marketplace list contains `aegis@<ver>`;
  - server.json shows `<ver> [["npm","aegis-skills","<ver>"]]`.

  Different shape (for example no version in marketplace entries, or no npm entry in server.json): STOP. Phase 1 owns these files.

  Also run `grep -noE '(@aegis-skills/[a-z-]+|aegis-skills)@[^" ]*' packages/aegis/.mcp.json packages/aegis/gemini-extension.json`. Every hit must be exactly `aegis-skills@<ver>` (D16). Range pins such as `@^1` are the one Phase 1 shape this plan corrects. In A3, after the scripts exist, replace each such pin string with `aegis-skills@<ver>` in a separate commit: `fix(aegis): pin the MCP adapter to an exact version for directory submission`.
- [ ] **A2.1** Write the failing test `scripts/__tests__/release-manifests.test.js`:
  ```js
  'use strict'
  const test = require('node:test')
  const assert = require('node:assert/strict')
  const lib = require('../lib/release-manifests')

  test('satisfiesCaret follows npm caret rules', () => {
    assert.equal(lib.satisfiesCaret('1.1.0', '1.1.0'), true)
    assert.equal(lib.satisfiesCaret('1.1.0', '1.9.3'), true)
    assert.equal(lib.satisfiesCaret('1.1.0', '2.0.0'), false)
    assert.equal(lib.satisfiesCaret('1.1.0', '1.0.9'), false)
    assert.equal(lib.satisfiesCaret('0.1.0', '0.1.7'), true)
    assert.equal(lib.satisfiesCaret('0.1.0', '0.2.0'), false)
    assert.equal(lib.satisfiesCaret('0.0.3', '0.0.4'), false)
  })

  test('nextVersion bumps and rejects bad input', () => {
    assert.equal(lib.nextVersion('1.1.0', 'patch'), '1.1.1')
    assert.equal(lib.nextVersion('1.1.3', 'minor'), '1.2.0')
    assert.equal(lib.nextVersion('1.1.3', 'major'), '2.0.0')
    assert.equal(lib.nextVersion('0.1.0', '0.3.0'), '0.3.0')
    assert.throws(() => lib.nextVersion('1.1.0', '1.1.0'), /not greater/)
    assert.throws(() => lib.nextVersion('1.1.0', '1.2.0-rc.1'), /prereleases/)
  })

  test('pins must be exact and current; rewrite touches only the bumped package', () => {
    const versions = { 'aegis-skills': '1.1.0', '@aegis-skills/themis-plugin': '0.1.0' }
    const text = '{"a":["-y","aegis-skills@^1","mcp"],"b":"aegis-skills@1.1.0","c":["-y","@aegis-skills/themis-plugin@0.1.0"],"d":"aegis-skills@1.0.9"}'
    const pins = lib.findPins(text)
    assert.deepEqual(pins.map(m => m[1]), ['aegis-skills', 'aegis-skills', '@aegis-skills/themis-plugin', 'aegis-skills'])
    const problems = pins.map(m => lib.pinProblem(m, versions))
    assert.match(problems[0], /must be an exact pin: aegis-skills@1\.1\.0/)
    assert.equal(problems[1], null)
    assert.equal(problems[2], null)
    assert.match(problems[3], /must equal aegis-skills@1\.1\.0/)
    assert.match(lib.pinProblem(lib.findPins('@aegis-skills/other@1.0.0')[0], versions), /not a package in this repo/)
    const out = lib.rewritePins(text, 'aegis-skills', '1.1.1')
    assert.equal((out.match(/aegis-skills@1\.1\.1/g) || []).length, 3)
    assert.match(out, /"@aegis-skills\/themis-plugin@0\.1\.0"/)
    assert.equal(lib.rewritePins(text, '@aegis-skills/themis-plugin', '0.1.1').includes('@aegis-skills/themis-plugin@0.1.1'), true)
  })
  ```
  Run `node --test "scripts/__tests__/*.test.js"`. Expected: fails with `Cannot find module '../lib/release-manifests'`.
- [ ] **A2.2** Create `scripts/lib/release-manifests.js`:
  ```js
  'use strict'
  // Single source of truth for which files embed which package version.
  // Used by bump-version.js, check-versions.js, assert-pack.js, pack-to.js and build-release-assets.js.
  // Node built-ins only. AEGIS_RELEASE_ROOT overrides the repo root (tests use fixtures).
  const fs = require('fs')
  const path = require('path')

  const ROOT = process.env.AEGIS_RELEASE_ROOT
    ? path.resolve(process.env.AEGIS_RELEASE_ROOT)
    : path.resolve(__dirname, '..', '..')
  const LICENSE = '(Apache-2.0 OR MIT)'
  const ENGINES_NODE = '>=22.13'
  const REPO_URL = 'https://github.com/drupadsachania/aegis-skills'
  const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']

  // kind 'version': top-level "version". kind 'server': MCP Registry server.json (top-level + npm packages[] entry).
  // kind 'marketplace': the plugins[] entry whose name is `plugin`. optional: may be absent.
  const PACKAGES = [
    { key: 'aegis', name: 'aegis-skills', dir: 'packages/aegis', assets: true, manifests: [
      { file: 'packages/aegis/.claude-plugin/plugin.json', kind: 'version' },
      { file: 'packages/aegis/gemini-extension.json', kind: 'version' },
      { file: 'packages/aegis/server.json', kind: 'server' },
      { file: '.claude-plugin/marketplace.json', kind: 'marketplace', plugin: 'aegis' },
      { file: 'listings/chatgpt/plugin.json', kind: 'version', optional: true }
    ] },
    { key: 'themis-core', name: '@aegis-skills/themis-core', dir: 'packages/themis-core', assets: false, manifests: [] },
    { key: 'themis-gateway', name: '@aegis-skills/themis-gateway', dir: 'packages/themis-gateway', assets: false, manifests: [] },
    { key: 'themis-plugin', name: '@aegis-skills/themis-plugin', dir: 'packages/themis-plugin', assets: false, manifests: [
      { file: 'packages/themis-plugin/.claude-plugin/plugin.json', kind: 'version' },
      { file: 'packages/themis-plugin/gemini-extension.json', kind: 'version', optional: true },
      { file: 'packages/themis-plugin/server.json', kind: 'server', optional: true },
      { file: '.claude-plugin/marketplace.json', kind: 'marketplace', plugin: 'themis' }
    ] },
    { key: 'themis', name: '@aegis-skills/themis', dir: 'packages/themis-app', assets: false, manifests: [] }
  ]
  // Never published, but their package.json may depend on the packages above.
  const DEPENDENT_ONLY_DIRS = ['apps/web']
  // Directory-submitted manifests that launch our packages through npx. Every `<npm-name>@<spec>` in them must be an
  // exact X.Y.Z equal to the workspace version (D16, cross-phase finding 6.1).
  const PIN_FILES = [
    'packages/aegis/.mcp.json', 'packages/aegis/gemini-extension.json',
    'packages/themis-plugin/.mcp.json', 'packages/themis-plugin/gemini-extension.json'
  ]
  // Groups: 1 npm name, 2 caret, 3 major, 4 minor, 5 patch. The lookbehind stops "aegis-skills" matching inside "@aegis-skills/x".
  const PIN_RE = /(?<![\w@/-])(aegis-skills|@aegis-skills\/[a-z-]+)@(\^?)(\d+)(?:\.(\d+)\.(\d+))?(?![\w.-])/g

  const abs = rel => path.join(ROOT, rel)
  const exists = rel => fs.existsSync(abs(rel))
  function readJson (rel) { const text = fs.readFileSync(abs(rel), 'utf8'); return { text, data: JSON.parse(text) } }
  function writeJson (rel, data, originalText = '') {
    const m = /\n([ \t]+)"/.exec(originalText)
    const nl = originalText === '' || /\n$/.test(originalText) ? '\n' : ''
    fs.writeFileSync(abs(rel), JSON.stringify(data, null, m ? m[1] : 2) + nl)
  }

  function parse (v) { const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(v)); return m ? m.slice(1).map(Number) : null }
  function cmp (a, b) { for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0 }
  function satisfiesCaret (base, version) {
    const b = parse(base), v = parse(version)
    if (!b || !v || cmp(v, b) < 0) return false
    if (b[0] > 0) return v[0] === b[0]
    if (b[1] > 0) return v[0] === 0 && v[1] === b[1]
    return cmp(v, b) === 0
  }
  function nextVersion (current, spec) {
    const c = parse(current)
    if (!c) throw new Error(`current version "${current}" is not X.Y.Z`)
    if (spec === 'major') return `${c[0] + 1}.0.0`
    if (spec === 'minor') return `${c[0]}.${c[1] + 1}.0`
    if (spec === 'patch') return `${c[0]}.${c[1]}.${c[2] + 1}`
    const e = parse(spec)
    if (!e) throw new Error(`"${spec}" is not patch, minor, major or X.Y.Z (prereleases are not used)`)
    if (cmp(e, c) <= 0) throw new Error(`${spec} is not greater than ${current}`)
    return spec
  }

  const findPackage = q => PACKAGES.find(p => p.key === q || p.name === q) || null
  const isInternal = name => PACKAGES.some(p => p.name === name)
  const presentPackages = () => PACKAGES.filter(p => exists(`${p.dir}/package.json`))
  const dependentDirs = () => [...PACKAGES.map(p => p.dir), ...DEPENDENT_ONLY_DIRS].filter(d => exists(`${d}/package.json`))

  function slots (pkg, m, data) {
    if (m.kind === 'version') return [{ label: 'version', obj: data }]
    if (m.kind === 'server') {
      const out = [{ label: 'version', obj: data }]
      ;(data.packages || []).forEach((p, i) => {
        if (p.registryType === 'npm' && p.identifier === pkg.name) out.push({ label: `packages[${i}].version`, obj: p })
      })
      if (out.length === 1) out.push({ label: `packages[] npm entry for ${pkg.name}`, missing: true })
      return out
    }
    if (m.kind === 'marketplace') {
      const entry = (data.plugins || []).find(p => p.name === m.plugin)
      return [entry ? { label: `plugins[name=${m.plugin}].version`, obj: entry } : { label: `plugins[name=${m.plugin}]`, missing: true }]
    }
    throw new Error(`unknown manifest kind ${m.kind}`)
  }

  const findPins = text => [...String(text).matchAll(PIN_RE)]
  // versions: { [npmName]: 'X.Y.Z' } of the packages present in the repo.
  function pinProblem (match, versions) {
    const [whole, name, caret, major, minor, patch] = match
    if (!(name in versions)) return `${whole} pins ${name}, which is not a package in this repo`
    if (caret || minor === undefined) return `${whole} must be an exact pin: ${name}@${versions[name]}`
    const spec = `${major}.${minor}.${patch}`
    return spec === versions[name] ? null : `${whole} must equal ${name}@${versions[name]}`
  }
  // Rewrites every pin of `name` (any form) to the exact `version`; other packages' pins are untouched.
  function rewritePins (text, name, version) {
    return String(text).replace(PIN_RE, (whole, n) => (n === name ? `${name}@${version}` : whole))
  }

  module.exports = {
    ROOT, LICENSE, ENGINES_NODE, REPO_URL, DEP_FIELDS, PACKAGES, DEPENDENT_ONLY_DIRS, PIN_FILES,
    abs, exists, readJson, writeJson, parse, cmp, satisfiesCaret, nextVersion,
    findPackage, isInternal, presentPackages, dependentDirs, slots, findPins, pinProblem, rewritePins
  }
  ```
- [ ] **A2.3** Run `node --test "scripts/__tests__/*.test.js" 2>&1 | grep -E "^# (pass|fail)"`. Expected: `# pass 3`, `# fail 0`.
- [ ] **A2.4** Commit:
  ```bash
  git add scripts/lib/release-manifests.js scripts/__tests__/release-manifests.test.js
  git commit -m "feat(release): add version manifest table and semver helpers"
  ```

### Task A3: `check-versions.js`, `bump-version.js`, root scripts — executor: sonnet

**Files:** create `scripts/check-versions.js`, `scripts/bump-version.js`, `scripts/__tests__/bump-version.test.js`; modify root `package.json`.

- [ ] **A3.1** Write the failing fixture test `scripts/__tests__/bump-version.test.js`:
  ```js
  'use strict'
  const test = require('node:test')
  const assert = require('node:assert/strict')
  const fs = require('fs')
  const os = require('os')
  const path = require('path')
  const { spawnSync } = require('child_process')

  const SCRIPTS = path.join(__dirname, '..')
  const PKG = (dir, name, version, extra = {}) => ({
    name, version, license: '(Apache-2.0 OR MIT)', engines: { node: '>=22.13' },
    repository: { type: 'git', url: 'https://github.com/drupadsachania/aegis-skills', directory: dir }, ...extra
  })

  function fixture () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-rel-'))
    const w = (rel, obj) => {
      fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true })
      fs.writeFileSync(path.join(root, rel), JSON.stringify(obj, null, 2) + '\n')
    }
    const appDeps = { 'aegis-skills': '^1.1.0', '@aegis-skills/themis-core': '^0.1.0' }
    w('packages/aegis/package.json', PKG('packages/aegis', 'aegis-skills', '1.1.0'))
    w('packages/aegis/.claude-plugin/plugin.json', { name: 'aegis', version: '1.1.0' })
    w('packages/aegis/gemini-extension.json', { name: 'aegis-skills', version: '1.1.0', mcpServers: { aegis: { command: 'npx', args: ['-y', 'aegis-skills@1.1.0', 'mcp'] } } })
    w('packages/aegis/server.json', { name: 'io.github.drupadsachania/aegis-skills', version: '1.1.0', packages: [{ registryType: 'npm', identifier: 'aegis-skills', version: '1.1.0', transport: { type: 'stdio' } }] })
    w('.claude-plugin/marketplace.json', { name: 'aegis-skills', plugins: [{ name: 'aegis', source: './packages/aegis', version: '1.1.0' }] })
    w('packages/themis-core/package.json', PKG('packages/themis-core', '@aegis-skills/themis-core', '0.1.0'))
    w('packages/themis-app/package.json', PKG('packages/themis-app', '@aegis-skills/themis', '0.1.0', { dependencies: { ...appDeps } }))
    w('package-lock.json', { name: 'aegis-skills-monorepo', lockfileVersion: 3, packages: {
      '': { name: 'aegis-skills-monorepo' },
      'packages/aegis': { name: 'aegis-skills', version: '1.1.0' },
      'packages/themis-core': { name: '@aegis-skills/themis-core', version: '0.1.0' },
      'packages/themis-app': { name: '@aegis-skills/themis', version: '0.1.0', dependencies: { ...appDeps } }
    } })
    return root
  }
  const run = (root, script, args = []) => spawnSync(process.execPath, [path.join(SCRIPTS, script), ...args],
    { env: { ...process.env, AEGIS_RELEASE_ROOT: root, GITHUB_OUTPUT: '' }, encoding: 'utf8' })
  const read = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'))

  test('check-versions passes on a consistent fixture', () => {
    const r = run(fixture(), 'check-versions.js')
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /check-versions: OK \(3 package\(s\)/)
  })

  test('aegis patch updates every manifest, pin and lockfile, but not themis ranges', () => {
    const root = fixture()
    const r = run(root, 'bump-version.js', ['aegis', 'patch'])
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /^TAG=aegis-skills@1\.1\.1$/m)
    assert.equal(read(root, 'packages/aegis/package.json').version, '1.1.1')
    assert.equal(read(root, 'packages/aegis/.claude-plugin/plugin.json').version, '1.1.1')
    const gem = read(root, 'packages/aegis/gemini-extension.json')
    assert.equal(gem.version, '1.1.1')
    assert.equal(gem.mcpServers.aegis.args[1], 'aegis-skills@1.1.1')
    const server = read(root, 'packages/aegis/server.json')
    assert.deepEqual([server.version, server.packages[0].version], ['1.1.1', '1.1.1'])
    assert.equal(read(root, '.claude-plugin/marketplace.json').plugins[0].version, '1.1.1')
    assert.equal(read(root, 'package-lock.json').packages['packages/aegis'].version, '1.1.1')
    assert.equal(read(root, 'packages/themis-app/package.json').dependencies['aegis-skills'], '^1.1.0')
  })

  test('a 0.x minor bump rewrites dependent ranges in package.json and the lockfile', () => {
    const root = fixture()
    const r = run(root, 'bump-version.js', ['themis-core', 'minor'])
    assert.equal(r.status, 0, r.stderr)
    assert.equal(read(root, 'packages/themis-core/package.json').version, '0.2.0')
    assert.equal(read(root, 'packages/themis-app/package.json').dependencies['@aegis-skills/themis-core'], '^0.2.0')
    const lock = read(root, 'package-lock.json')
    assert.equal(lock.packages['packages/themis-core'].version, '0.2.0')
    assert.equal(lock.packages['packages/themis-app'].dependencies['@aegis-skills/themis-core'], '^0.2.0')
  })

  test('an aegis major bump moves dependents to the new major', () => {
    const root = fixture()
    const r = run(root, 'bump-version.js', ['aegis-skills', 'major'])
    assert.equal(r.status, 0, r.stderr)
    assert.equal(read(root, 'packages/themis-app/package.json').dependencies['aegis-skills'], '^2.0.0')
    assert.equal(read(root, 'packages/aegis/gemini-extension.json').mcpServers.aegis.args[1], 'aegis-skills@2.0.0')
  })

  test('drift is reported and blocks bumping', () => {
    const root = fixture()
    const f = path.join(root, 'packages/aegis/server.json')
    const s = JSON.parse(fs.readFileSync(f, 'utf8'))
    s.packages[0].version = '1.0.9'
    fs.writeFileSync(f, JSON.stringify(s, null, 2) + '\n')
    const c = run(root, 'check-versions.js')
    assert.equal(c.status, 1)
    assert.match(c.stderr, /server\.json: packages\[0\]\.version is "1\.0\.9", expected "1\.1\.0"/)
    assert.equal(run(root, 'bump-version.js', ['aegis', 'patch']).status, 1)
  })
  ```
- [ ] **A3.2** Create `scripts/check-versions.js`:
  ```js
  #!/usr/bin/env node
  'use strict'
  // Fails (exit 1) when a manifest, lockfile entry, internal range or adapter pin drifts from package.json.
  //   node scripts/check-versions.js             check the repo
  //   node scripts/check-versions.js --tag <t>   also require tag <npm-name>@<X.Y.Z> to match, then print
  //                                              name/dir/key/version/latest/prev_tag (and append to $GITHUB_OUTPUT)
  const fs = require('fs')
  const { execFileSync } = require('child_process')
  const lib = require('./lib/release-manifests')

  function collectProblems () {
    const problems = []
    const versions = {}
    for (const p of lib.presentPackages()) {
      const where = `${p.dir}/package.json`
      const pj = lib.readJson(where).data
      if (pj.name !== p.name) problems.push(`${where}: name is "${pj.name}", expected "${p.name}"`)
      if (!lib.parse(pj.version)) problems.push(`${where}: version "${pj.version}" is not X.Y.Z`)
      if (pj.private) problems.push(`${where}: a publishable package must not be "private"`)
      if (pj.license !== lib.LICENSE) problems.push(`${where}: license must be "${lib.LICENSE}"`)
      if (!pj.engines || pj.engines.node !== lib.ENGINES_NODE) problems.push(`${where}: engines.node must be "${lib.ENGINES_NODE}"`)
      const repo = pj.repository || {}
      const url = String(repo.url || '').replace(/^git\+/, '').replace(/\.git$/, '')
      if (url !== lib.REPO_URL || repo.directory !== p.dir) problems.push(`${where}: repository must be { "url": "${lib.REPO_URL}", "directory": "${p.dir}" } (npm provenance checks it)`)
      versions[p.name] = pj.version
      for (const m of p.manifests) {
        if (!lib.exists(m.file)) { if (!m.optional) problems.push(`${m.file}: missing (embeds the ${p.name} version)`); continue }
        for (const s of lib.slots(p, m, lib.readJson(m.file).data)) {
          if (s.missing) problems.push(`${m.file}: ${s.label} missing`)
          else if (s.obj.version !== pj.version) problems.push(`${m.file}: ${s.label} is "${s.obj.version}", expected "${pj.version}" (${p.name})`)
        }
      }
    }
    const lock = lib.exists('package-lock.json') ? lib.readJson('package-lock.json').data : null
    if (!lock) problems.push('package-lock.json: missing')
    for (const p of lib.presentPackages()) {
      const e = lock && lock.packages && lock.packages[p.dir]
      if (lock && !e) problems.push(`package-lock.json: no entry for "${p.dir}" (run npm install)`)
      else if (e && e.version !== versions[p.name]) problems.push(`package-lock.json: packages["${p.dir}"].version is "${e.version}", expected "${versions[p.name]}"`)
    }
    for (const dir of lib.dependentDirs()) {
      const pj = lib.readJson(`${dir}/package.json`).data
      const le = lock && lock.packages && lock.packages[dir]
      for (const field of lib.DEP_FIELDS) {
        for (const [dep, range] of Object.entries(pj[field] || {})) {
          if (!lib.isInternal(dep)) continue
          const where = `${dir}/package.json ${field}["${dep}"]`
          if (!(dep in versions)) { problems.push(`${where}: ${dep} does not exist in this repo`); continue }
          const m = /^\^(\d+\.\d+\.\d+)$/.exec(range)
          if (!m) problems.push(`${where}: "${range}" must have the form ^X.Y.Z`)
          else if (!lib.satisfiesCaret(m[1], versions[dep])) problems.push(`${where}: "${range}" does not accept the workspace version ${versions[dep]}`)
          if (le && le[field] && le[field][dep] !== undefined && le[field][dep] !== range) problems.push(`package-lock.json: packages["${dir}"].${field}["${dep}"] is "${le[field][dep]}", expected "${range}"`)
        }
      }
    }
    for (const f of lib.PIN_FILES) {
      if (!lib.exists(f)) continue
      for (const match of lib.findPins(fs.readFileSync(lib.abs(f), 'utf8'))) {
        const why = lib.pinProblem(match, versions)
        if (why) problems.push(`${f}: ${why}`)
      }
    }
    return { problems, versions }
  }

  function tagInfo (tag, versions) {
    const m = /^(aegis-skills|@aegis-skills\/[a-z-]+)@(\d+\.\d+\.\d+)$/.exec(tag)
    if (!m) throw new Error(`tag "${tag}" is not <npm-name>@X.Y.Z`)
    const pkg = lib.PACKAGES.find(p => p.name === m[1])
    if (!pkg) throw new Error(`tag "${tag}" names no package in the release table`)
    if (versions[pkg.name] !== m[2]) throw new Error(`tag ${tag} but ${pkg.dir}/package.json is ${versions[pkg.name]}`)
    const mine = lib.parse(m[2])
    const others = execFileSync('git', ['tag', '--list', `${pkg.name}@*`], { cwd: lib.ROOT, encoding: 'utf8' })
      .split('\n').map(s => s.trim()).filter(Boolean)
      .map(t => ({ t, v: lib.parse(t.slice(pkg.name.length + 1)) })).filter(x => x.v)
    const older = others.filter(x => lib.cmp(x.v, mine) < 0).sort((a, b) => lib.cmp(b.v, a.v))
    const newer = others.some(x => lib.cmp(x.v, mine) > 0)
    return {
      name: pkg.name, dir: pkg.dir, key: pkg.key, version: m[2],
      latest: String(pkg.key === 'aegis' && !newer), prev_tag: older.length ? older[0].t : ''
    }
  }

  if (require.main === module) {
    const args = process.argv.slice(2)
    const { problems, versions } = collectProblems()
    if (problems.length) {
      console.error(`check-versions: ${problems.length} problem(s)`)
      problems.forEach(p => console.error(`  - ${p}`))
      process.exit(1)
    }
    const i = args.indexOf('--tag')
    if (i !== -1) {
      let info
      try { info = tagInfo(args[i + 1] || '', versions) } catch (e) { console.error(`check-versions: ${e.message}`); process.exit(1) }
      const lines = Object.entries(info).map(([k, v]) => `${k}=${v}`)
      console.log(lines.join('\n'))
      if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, lines.join('\n') + '\n')
    }
    console.log(`check-versions: OK (${Object.keys(versions).length} package(s): ${Object.entries(versions).map(([n, v]) => `${n}@${v}`).join(', ')})`)
  }

  module.exports = { collectProblems, tagInfo }
  ```
- [ ] **A3.3** Create `scripts/bump-version.js`:
  ```js
  #!/usr/bin/env node
  'use strict'
  // The only supported way to change a package version. Rewrites package.json, every manifest that embeds
  // the version, dependents' ^ranges that no longer accept it, aegis-skills@ pins and package-lock.json,
  // then re-runs the drift check.
  //   node scripts/bump-version.js <aegis|themis-core|themis-gateway|themis-plugin|themis|npm-name> <patch|minor|major|X.Y.Z> [--commit]
  //   --commit: git add the changed files, commit "chore(release): <tag>" and create annotated tag <tag> (no push).
  const fs = require('fs')
  const { execFileSync } = require('child_process')
  const lib = require('./lib/release-manifests')
  const { collectProblems } = require('./check-versions')

  function fail (msg, code = 1) { console.error(`bump-version: ${msg}`); process.exit(code) }
  const git = args => execFileSync('git', args, { cwd: lib.ROOT, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' })

  function main () {
    const args = process.argv.slice(2)
    const commit = args.includes('--commit')
    const pos = args.filter(a => !a.startsWith('--'))
    if (pos.length !== 2) fail('usage: node scripts/bump-version.js <package> <patch|minor|major|X.Y.Z> [--commit]', 2)
    const pkg = lib.findPackage(pos[0])
    if (!pkg) fail(`unknown package "${pos[0]}"`, 2)
    if (!lib.exists(`${pkg.dir}/package.json`)) fail(`${pkg.dir}/package.json does not exist`, 2)

    const before = collectProblems().problems
    if (before.length) fail(`the repo already has version drift; fix it first (npm run check:versions):\n  - ${before.join('\n  - ')}`)
    if (commit) { try { git(['diff', '--cached', '--quiet']) } catch { fail('the git index has staged changes; commit or unstage them first') } }

    const current = lib.readJson(`${pkg.dir}/package.json`).data.version
    let next
    try { next = lib.nextVersion(current, pos[1]) } catch (e) { fail(e.message, 2) }

    const changed = new Set()
    const edit = (file, mutate) => { const r = lib.readJson(file); mutate(r.data); lib.writeJson(file, r.data, r.text); changed.add(file) }

    edit(`${pkg.dir}/package.json`, d => { d.version = next })
    for (const m of pkg.manifests) {
      if (!lib.exists(m.file)) continue
      edit(m.file, d => { for (const s of lib.slots(pkg, m, d)) { if (s.missing) throw new Error(`${m.file}: ${s.label} missing`); s.obj.version = next } })
    }
    const rangeChanges = []
    for (const dir of lib.dependentDirs()) {
      const file = `${dir}/package.json`
      const r = lib.readJson(file)
      let touched = false
      for (const field of lib.DEP_FIELDS) {
        const deps = r.data[field]
        if (!deps || !(pkg.name in deps)) continue
        const base = /^\^(\d+\.\d+\.\d+)$/.exec(deps[pkg.name])
        if (base && lib.satisfiesCaret(base[1], next)) continue
        deps[pkg.name] = `^${next}`
        rangeChanges.push({ dir, field, range: `^${next}` })
        touched = true
      }
      if (touched) { lib.writeJson(file, r.data, r.text); changed.add(file) }
    }
    for (const f of lib.PIN_FILES) {
      if (!lib.exists(f)) continue
      const text = fs.readFileSync(lib.abs(f), 'utf8')
      const out = lib.rewritePins(text, pkg.name, next)
      if (out !== text) { fs.writeFileSync(lib.abs(f), out); changed.add(f) }
    }
    if (lib.exists('package-lock.json')) {
      edit('package-lock.json', lock => {
        const e = lock.packages && lock.packages[pkg.dir]
        if (e) e.version = next
        for (const c of rangeChanges) {
          const le = lock.packages && lock.packages[c.dir]
          if (le && le[c.field] && pkg.name in le[c.field]) le[c.field][pkg.name] = c.range
        }
      })
    }

    const after = collectProblems().problems
    if (after.length) fail(`drift after bump (files were modified; inspect with git diff):\n  - ${after.join('\n  - ')}`)

    const tag = `${pkg.name}@${next}`
    console.log(`bump-version: ${pkg.name} ${current} -> ${next}`)
    ;[...changed].sort().forEach(f => console.log(`  updated ${f}`))
    if (commit) {
      git(['add', '--', ...changed])
      git(['commit', '-q', '-m', `chore(release): ${tag}`])
      git(['tag', '-a', tag, '-m', tag])
      console.log(`bump-version: committed and tagged ${tag} (not pushed)`)
    }
    console.log(`TAG=${tag}`)
  }

  main()
  ```
- [ ] **A3.4** Add three entries to the `"scripts"` object of the root `package.json`, directly after `"check:layout"`. Keep every existing key:
  ```json
  "check:versions": "node scripts/check-versions.js",
  "bump": "node scripts/bump-version.js",
  "test:scripts": "node --test \"scripts/__tests__/*.test.js\""
  ```
- [ ] **A3.5** Run the tests and the real-repo check:
  ```bash
  npm run test:scripts 2>&1 | grep -E "^# (pass|fail)"
  npm run check:versions
  ```
  Expected: `# pass 8`, `# fail 0`; then `check-versions: OK (1 package(s): aegis-skills@<ver>)` (more packages if Phase 2+ already merged).

  If the real-repo check reports problems, they fall into two cases:
  - Only `must be an exact pin` lines (Phase 1 range pins, see A2.0): commit A3.6 first. Then edit just those pin strings to the exact version and commit them separately with `fix(aegis): pin the MCP adapter to an exact version for directory submission`. Re-run until it prints OK.
  - Any other drift in Phase 1 files: STOP and report the list. Do not edit Phase 1 files by hand.
- [ ] **A3.6** Commit:
  ```bash
  git add scripts/check-versions.js scripts/bump-version.js scripts/__tests__/bump-version.test.js package.json
  git commit -m "feat(release): add bump-version and version drift check"
  ```

### Task A4: Tarball assertion, `pack-to`, licence files — executor: sonnet

**Files:** create `scripts/assert-pack.js`, `scripts/pack-to.js`, `packages/aegis/{LICENSE,LICENSE-APACHE,LICENSE-MIT}`; modify `scripts/lib/release-manifests.js` (add `packFiles`) and, if it has a `files` array, `packages/aegis/package.json`.

- [ ] **A4.1** In `scripts/lib/release-manifests.js`, insert above `module.exports`:
  ```js
  // Files npm would publish for one workspace package (no lifecycle scripts run).
  function packFiles (dir, { ignoreScripts = true } = {}) {
    const { execSync } = require('child_process')
    const out = execSync(`npm pack --dry-run --json${ignoreScripts ? ' --ignore-scripts' : ''} --workspace "${dir}"`,
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
    const start = out.search(/^\[\s*\{/m)
    if (start === -1) throw new Error(`npm pack printed no JSON for ${dir}`)
    const info = JSON.parse(out.slice(start))[0]
    return { files: info.files.map(f => f.path.replace(/\\/g, '/')).sort(), unpackedSize: info.unpackedSize, filename: info.filename }
  }
  ```
  and add `packFiles` to the `module.exports` list.
- [ ] **A4.2** Create `scripts/assert-pack.js`:
  ```js
  #!/usr/bin/env node
  'use strict'
  // Asserts that one workspace package's npm tarball contains exactly what it should. Run after building it.
  // Usage: node scripts/assert-pack.js <aegis|themis-core|themis-gateway|themis-plugin|themis|npm-name>
  const fs = require('fs')
  const path = require('path')
  const lib = require('./lib/release-manifests')

  const COMMON = [/^package\.json$/, /^README\.md$/, /^CHANGELOG\.md$/, /^LICENSE$/, /^LICENSE-APACHE$/, /^LICENSE-MIT$/, /^SECURITY\.md$/]
  const FORBIDDEN = [
    /(^|\/)intel-state\.json$/, /(^|\/)health\.json$/, /(^|\/)\.intel-sync-state\.json$/, /(^|\/)\.env/, /\.tgz$/,
    /(^|\/)__tests__\//, /\.test\.[cm]?[jt]sx?$/, /\.tsbuildinfo$/, /(^|\/)artifacts\//, /(^|\/)node_modules\//, /(^|\/)\.DS_Store$/
  ]
  const DIST = /^dist\/[\w@./-]+\.(c?js|d\.ts|js\.map|d\.ts\.map|json)$/
  const RULES = {
    'aegis-skills': { maxUnpacked: 10e6, required: ['.claude-plugin/plugin.json', '.mcp.json', 'gemini-extension.json', 'GEMINI.md', 'server.json'], allowed: [
      /^skills\/[a-z0-9-]+\/SKILL\.md$/, /^skills\/[a-z0-9-]+\/skill\.json$/, /^skills\/[a-z0-9-]+\/references\/[a-z0-9-]+\.md$/,
      /^cli\/[\w./-]+\.c?js$/, /^lib\/[\w./-]+\.(c?js|json)$/, /^mcp\/[\w./-]+\.(c?js|json)$/,
      /^\.claude-plugin\/plugin\.json$/, /^\.mcp\.json$/, /^gemini-extension\.json$/, /^GEMINI\.md$/, /^server\.json$/] },
    '@aegis-skills/themis-core': { maxUnpacked: 5e6, required: [], allowed: [DIST] },
    '@aegis-skills/themis-gateway': { maxUnpacked: 5e6, required: [], allowed: [DIST] },
    '@aegis-skills/themis-plugin': { maxUnpacked: 5e6, required: ['.claude-plugin/plugin.json', '.mcp.json'], allowed: [
      DIST, /^agents\/[\w./-]+\.md$/, /^skills\/[\w./-]+\.(md|json)$/,
      /^\.claude-plugin\/plugin\.json$/, /^\.mcp\.json$/, /^gemini-extension\.json$/, /^GEMINI\.md$/, /^server\.json$/] },
    '@aegis-skills/themis': { maxUnpacked: 40e6, required: ['dist/ui/index.html'], allowed: [DIST, /^dist\/ui\/[\w@./-]+$/] }
  }

  function entryPoints (pj) {
    const out = []
    const add = v => { if (typeof v === 'string') out.push(path.posix.normalize(v.replace(/^\.\//, ''))) }
    add(pj.main); add(pj.types); add(pj.typings)
    if (typeof pj.bin === 'string') add(pj.bin); else Object.values(pj.bin || {}).forEach(add)
    return out
  }

  function main () {
    const pkg = lib.findPackage(process.argv[2] || '')
    if (!pkg) { console.error('usage: node scripts/assert-pack.js <aegis|themis-core|themis-gateway|themis-plugin|themis>'); process.exit(2) }
    const rules = RULES[pkg.name]
    const pj = lib.readJson(`${pkg.dir}/package.json`).data
    const { files, unpackedSize } = lib.packFiles(pkg.dir)
    const have = new Set(files)
    const problems = []
    for (const f of files) {
      if (FORBIDDEN.some(r => r.test(f))) problems.push(`forbidden file in tarball: ${f}`)
      else if (![...COMMON, ...rules.allowed].some(r => r.test(f))) problems.push(`unexpected file in tarball: ${f}`)
    }
    for (const f of ['package.json', 'README.md', 'LICENSE', 'LICENSE-APACHE', 'LICENSE-MIT', ...rules.required, ...entryPoints(pj)]) {
      if (!have.has(f)) problems.push(`required file missing from tarball: ${f}`)
    }
    if (pkg.name === 'aegis-skills') {
      const skillsDir = lib.abs(`${pkg.dir}/skills`)
      const skills = fs.readdirSync(skillsDir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name)
      if (!skills.length) problems.push('no skills found in packages/aegis/skills')
      for (const s of skills) {
        for (const f of ['SKILL.md', 'skill.json']) if (!have.has(`skills/${s}/${f}`)) problems.push(`skill file missing from tarball: skills/${s}/${f}`)
        const refDir = path.join(skillsDir, s, 'references')
        if (!fs.existsSync(refDir)) continue
        for (const r of fs.readdirSync(refDir)) {
          if (r.endsWith('.md') && !have.has(`skills/${s}/references/${r}`)) problems.push(`reference missing from tarball: skills/${s}/references/${r}`)
        }
      }
    }
    if (unpackedSize > rules.maxUnpacked) problems.push(`unpacked size ${unpackedSize} exceeds ${rules.maxUnpacked}`)
    if (problems.length) {
      console.error(`assert-pack: ${pkg.name} — ${problems.length} problem(s)`)
      problems.forEach(p => console.error(`  - ${p}`))
      process.exit(1)
    }
    console.log(`assert-pack: OK ${pkg.name}@${pj.version} — ${files.length} files, ${unpackedSize} bytes unpacked`)
  }

  main()
  ```
- [ ] **A4.3** Create `scripts/pack-to.js`:
  ```js
  #!/usr/bin/env node
  'use strict'
  // Packs one workspace package into <destDir> (its prepack script runs) and prints the tarball path with '/' separators.
  // Usage: node scripts/pack-to.js <aegis|themis-core|themis-gateway|themis-plugin|themis|npm-name> <destDir>
  const fs = require('fs')
  const path = require('path')
  const { execSync } = require('child_process')
  const lib = require('./lib/release-manifests')

  const pkg = lib.findPackage(process.argv[2] || '')
  const dest = process.argv[3]
  if (!pkg || !dest) { console.error('usage: node scripts/pack-to.js <package> <destDir>'); process.exit(2) }
  const abs = path.resolve(dest)
  fs.mkdirSync(abs, { recursive: true })
  const out = execSync(`npm pack --json --workspace "${pkg.dir}" --pack-destination "${abs}"`,
    { cwd: lib.ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 64 * 1024 * 1024 })
  const start = out.search(/^\[\s*\{/m)
  if (start === -1) { console.error(`pack-to: npm pack printed no JSON for ${pkg.dir}`); process.exit(1) }
  const file = path.join(abs, JSON.parse(out.slice(start))[0].filename)
  if (!fs.existsSync(file)) { console.error(`pack-to: ${file} was not written`); process.exit(1) }
  console.log(file.split(path.sep).join('/'))
  ```
- [ ] **A4.4** Copy the licences into the Aegis package. npm only auto-includes `LICENSE`/`LICENCE` files, not `LICENSE-MIT`/`LICENSE-APACHE`:
  ```bash
  for f in LICENSE LICENSE-APACHE LICENSE-MIT; do node -e "require('fs').copyFileSync(process.argv[1], process.argv[2])" "$f" "packages/aegis/$f"; done
  node -e "const p=require('./packages/aegis/package.json');console.log(Array.isArray(p.files)?JSON.stringify(p.files):'no files array')"
  ```
  If it prints a `files` array, add `"LICENSE"`, `"LICENSE-APACHE"`, `"LICENSE-MIT"` to it, unless they are already covered.
- [ ] **A4.5** Run:
  ```bash
  node scripts/assert-pack.js aegis
  T=$(node -p "require('os').tmpdir().split(require('path').sep).join('/')")/aegis-pack-check && rm -rf "$T" && node scripts/pack-to.js aegis "$T"
  ```
  Expected: `assert-pack: OK aegis-skills@<ver> — N files, M bytes unpacked`, then a path ending in `/aegis-skills-<ver>.tgz`.
  - If assert-pack lists files that are **forbidden**, or **missing** README/skill files: STOP and report. Phase 1 owns `packages/aegis` contents.
  - If only "unexpected file" lines appear for a file class that clearly belongs to the package (for example `lib/targets.json`), STOP and report, and do not widen the allowlist yourself.
- [ ] **A4.6** Commit:
  ```bash
  git add scripts/lib/release-manifests.js scripts/assert-pack.js scripts/pack-to.js packages/aegis/LICENSE packages/aegis/LICENSE-APACHE packages/aegis/LICENSE-MIT packages/aegis/package.json
  git commit -m "feat(release): assert tarball contents and ship licence files with aegis-skills"
  ```

### Task A5: Harden `skill-health.yml` — executor: haiku

**Files:** modify `.github/workflows/skill-health.yml`.

- [ ] **A5.1** Preconditions:
  ```bash
  grep -c "artifacts" scripts/skill-health.js
  grep -nE "require\('[^.]" scripts/skill-health.js | grep -vE "require\('(fs|path|https|child_process|os|crypto|url|util)'\)" | wc -l
  ```
  Expected: `0` and `0`.
  - The first means Phase 1 switched scoring from `artifacts/system-prompt.txt` to the source files.
  - The second means the script uses Node built-ins only, so the job needs no `npm ci`.

  Either non-zero: STOP and report. Without the Phase 1 change, scores would collapse when the artifacts disappear.
- [ ] **A5.2** Replace `.github/workflows/skill-health.yml` with exactly:
  ```yaml
  name: Skill Health Check

  on:
    schedule:
      - cron: '0 0 1 * *'
    workflow_dispatch:

  # GITHUB_TOKEN gets nothing. Pushes and the PR use SKILL_HEALTH_PAT (needs bypass on main, see USER ACTIONS).
  permissions: {}

  concurrency:
    group: skill-health
    cancel-in-progress: false

  jobs:
    skill-health:
      name: Score skill health against ATT&CK + NVD
      runs-on: ubuntu-latest
      permissions:
        contents: read

      steps:
        - name: Checkout repository
          uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
          with:
            token: ${{ secrets.SKILL_HEALTH_PAT }}

        - name: Set up Node.js 22
          uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
          with:
            node-version: '22'
            package-manager-cache: false

        # No npm ci: skill-health.js uses Node built-ins only, so no third-party code runs next to the PAT.
        - name: Run skill-health script
          id: health
          run: |
            node scripts/skill-health.js
            echo "exit_code=$?" >> $GITHUB_OUTPUT
          continue-on-error: true

        - name: Check health.json was written
          run: |
            if [ ! -f packages/aegis/health.json ]; then
              echo "ERROR: packages/aegis/health.json was not written"
              exit 1
            fi
            node -e "
              const j=JSON.parse(require('fs').readFileSync('packages/aegis/health.json','utf8'));
              Object.entries(j.skills).forEach(([k,v]) => {
                const badge = v['health-score']>=0.90?'GREEN ':v['health-score']>=0.75?'YELLOW':'RED   ';
                console.log(badge+' '+k+': '+v['health-score']);
              });
            "

        - name: Commit updated health.json
          run: |
            git config user.name "github-actions[bot]"
            git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
            git add packages/aegis/health.json
            git diff --staged --quiet || git commit -m "chore(health): update skill health scores [skip ci]"
            git pull --rebase origin main
            git push origin HEAD:main

        - name: Check for skills persistently below threshold
          id: threshold
          run: |
            FAILING=$(node -e "
              const h=require('./packages/aegis/health.json');
              const t=h['health-threshold']||0.80;
              const hyst=h['hysteresis-runs']||2;
              const failing=Object.entries(h.skills)
                .filter(([,v])=>v['health-score']<t && (v['below-streak']||0)>=hyst)
                .map(([k,v])=>k+' ('+v['health-score']+', '+v['below-streak']+' runs)');
              console.log(failing.join(', '));
            ")
            if [ -n "$FAILING" ]; then
              echo "failing=$FAILING" >> $GITHUB_OUTPUT
              echo "needs_pr=true" >> $GITHUB_OUTPUT
            else
              echo "needs_pr=false" >> $GITHUB_OUTPUT
            fi

        - name: Create PR for stale skills
          if: steps.threshold.outputs.needs_pr == 'true'
          env:
            GH_TOKEN: ${{ secrets.SKILL_HEALTH_PAT }}
            FAILING_SKILLS: ${{ steps.threshold.outputs.failing }}
            RUN_NUMBER: ${{ github.run_number }}
          run: |
            if [ -z "$GH_TOKEN" ]; then
              echo "SKILL_HEALTH_PAT secret not set — skipping PR creation"
              exit 0
            fi
            BRANCH="skill-health-update/$RUN_NUMBER"
            git checkout -b "$BRANCH" || git checkout "$BRANCH"
            git push -u origin "$BRANCH" 2>/dev/null || true
            printf "## Skill Health Alert\n\nThe following skills are below the **0.80 threshold**:\n\n**Failing skills:** %s\n\n### What to do\n\n1. Review \`packages/aegis/health.json\` for the specific gaps\n2. Update skill phases with newer ATT&CK techniques or patched CVEs\n3. Re-run \`node scripts/skill-health.js\` locally to verify\n4. Merge this PR\n\n---\n*Generated by skill-health workflow*\n" "$FAILING_SKILLS" > "$RUNNER_TEMP/pr_body.md"
            gh pr create \
              --title "Skill health update required - skills below 0.80" \
              --body-file "$RUNNER_TEMP/pr_body.md" \
              --base main \
              --head "$BRANCH" \
              --label "skill-health" \
              --label "automated" \
            && echo "PR created successfully" \
            || echo "PR already exists or branch has no changes vs main — skipping"
  ```
- [ ] **A5.3** Verify: `grep -nE "uses: actions/[a-z-]+@v[0-9]" .github/workflows/*.yml` prints nothing, and `node scripts/skill-health.js` exits 0 locally. It makes network requests and writes `packages/aegis/health.json`. Afterwards run `git checkout -- packages/aegis/health.json` so the local score file is not committed.
- [ ] **A5.4** Commit, push, open the PR:
  ```bash
  git add .github/workflows/skill-health.yml
  git commit -m "ci(health): pin action SHAs, drop npm ci, least-privilege permissions"
  npm run test:scripts && npm run check:versions && node scripts/assert-pack.js aegis
  git push -u origin restructure/phase-7b-release-tooling
  gh pr create --base main --title "feat(release): version tooling and tarball checks (Phase 7 part A)" --body "bump-version / check-versions with a single manifest table, tarball assertions, pack-to helper, licence files in aegis-skills, hardened skill-health workflow. ci.yml switches on Version drift, Pack (aegis) and Install aegis-skills jobs automatically.

  🤖 Generated with [Claude Code](https://claude.com/claude-code)"
  gh pr checks --watch
  ```
  Expected: all checks pass, including `Pack (aegis)` and `Install aegis-skills (ubuntu-latest|windows-latest|macos-latest)`.
  - `Install aegis-skills` failing on `aegis install --platform claude --project` (wrong flag or path): STOP and report. The Phase 1 CLI contract differs.

  Merging is a USER ACTION.

### Task A6: Activate Themis core/gateway CI — executor: haiku (after Phase 2 merges)

**Files:** create `packages/themis-core/{LICENSE,LICENSE-APACHE,LICENSE-MIT}`, `packages/themis-gateway/{LICENSE,LICENSE-APACHE,LICENSE-MIT}`; modify their `package.json` `files` arrays if present.

- [ ] **A6.1** `git switch main && git pull --ff-only && git switch -c restructure/phase-7c-themis-ci`
- [ ] **A6.2** Copy the licences (same loop as A4.4 for `packages/themis-core` and `packages/themis-gateway`). Add them to `files` if a `files` array exists.
- [ ] **A6.3** Run:
  ```bash
  npm ci && npm run build -w packages/themis-core && npm run build -w packages/themis-gateway
  npm run check:versions && node scripts/assert-pack.js themis-core && node scripts/assert-pack.js themis-gateway
  npm run check:deps
  ```
  Expected: `check-versions: OK (3 package(s): …)` and two `assert-pack: OK` lines. `check:deps` exits 0.
  - drift or forbidden files: STOP and report;
  - `check:deps` does not cover `themis-core` (it does not mention themis-core in its output or source, see `grep -c themis-core scripts/check-deps.js`): STOP and report; that is a Phase 2 gap.
- [ ] **A6.4** Commit `chore(release): ship licence files with themis-core and themis-gateway`, push, open a PR titled `chore(release): activate Phase 7 CI for themis-core and themis-gateway`, and watch the checks. Expected: `Pack (themis-core)` and `Pack (themis-gateway)` pass.

### Task A7: Activate themis-plugin/app CI — executor: haiku (after Phases 3 and 4 merge)

**Files:** licence copies in `packages/themis-plugin/` and `packages/themis-app/`; their `files` arrays if present.

- [ ] **A7.1** Repeat A6.1–A6.2 for `packages/themis-plugin` and `packages/themis-app`. Use branch `restructure/phase-7c-themis-app-ci`.
- [ ] **A7.2** Run:
  ```bash
  npm ci
  for d in themis-core themis-gateway themis-plugin themis-app; do npm run build -w "packages/$d" --if-present; done
  test -f packages/themis-app/dist/ui/index.html && echo "ok ui"
  npm run check:versions
  for k in themis-plugin themis; do node scripts/assert-pack.js "$k"; done
  grep -oE '(@aegis-skills/[a-z-]+|aegis-skills)@[^" ]*' packages/themis-plugin/.mcp.json
  ```
  Expected:
  - `ok ui`;
  - `check-versions: OK (5 package(s): …)`;
  - two `assert-pack: OK` lines;
  - exact pins only (D16): `aegis-skills@<aegis version>` and `@aegis-skills/themis-plugin@<plugin version>`.

  If Phase 3 shipped `aegis-skills@^1`, `check-versions` reports `must be an exact pin`. Fix only that pin string to the exact current version (this is the one hand edit allowed, because finding 6.1 overrides the contract example). Then re-run.

  `dist/ui/index.html` missing after `npm run build -w packages/themis-app`: STOP and report (Phase 4 must build the UI in `build`).
- [ ] **A7.3** Commit `chore(release): ship licence files with themis-plugin and themis-app`, push, open a PR, and watch the checks. Expected: `Install themis (ubuntu-latest)` and `Install themis (windows-latest)` pass.
  - `assert-no-native` failing lists the offending module: STOP and report (Phase 4 dependency problem).
  - `themis --help` not mentioning `dashboard`: STOP.

---

# Part B — Release and publish

### Task B0: Part B preconditions — executor: haiku

- [ ] **B0.1** Run:
  ```bash
  git switch main && git pull --ff-only && git switch -c restructure/phase-7d-release
  for f in apps/web/lib/zip.js apps/web/scripts/build-downloads.js scripts/build-flat-prompts.js packages/themis-plugin/package.json packages/themis-app/package.json; do test -e "$f" && echo "ok $f" || echo "MISSING $f"; done
  node scripts/ci-detect.js
  npm view aegis-skills name 2>&1 | grep -c E404; npm view @aegis-skills/themis name 2>&1 | grep -c E404
  ```
  Expected:
  - five `ok`;
  - detect prints `true` for every flag and `packs=["aegis","themis-core","themis-gateway","themis-plugin","themis"]`;
  - `1` and `1` (names still free).

  If a name is now taken by someone else: STOP (contracts §3 fallback is a USER decision at this point).
- [ ] **B0.2** `gh run list --branch main --workflow CI --limit 1 --json conclusion -q '.[0].conclusion'`. Expected: `success`.

### Task B1: Move the zip writer to `scripts/lib` — executor: haiku

**Files:** move `apps/web/lib/zip.js` → `scripts/lib/zip.js`; create the shim `apps/web/lib/zip.js`.

- [ ] **B1.1** Move commit (contracts §8):
  ```bash
  git mv apps/web/lib/zip.js scripts/lib/zip.js
  git commit -m "refactor(release): move the zip writer to scripts/lib for shared use"
  ```
- [ ] **B1.2** Create `apps/web/lib/zip.js`:
  ```js
  'use strict'
  // The writer lives in scripts/lib/zip.js (Phase 7) so release tooling can share it without depending on the web app.
  module.exports = require('../../../scripts/lib/zip')
  ```
- [ ] **B1.3** Verify:
  ```bash
  (cd apps/web && npx jest tests/lib/zip.test.js 2>&1 | tail -n 4)
  node -e "const {createZip}=require('./scripts/lib/zip');const b=createZip([{name:'.claude-plugin/plugin.json',data:Buffer.from('x')},{name:'.mcp.json',data:Buffer.from('y')}]);console.log(b.length>22)"
  npm run check:layout
  ```
  Expected: the zip tests pass; `true`; check:layout exits 0.
  - If `createZip` throws on dot-file names: STOP and report (the Gemini archive needs them).
  - If check:layout fails: STOP and report.
- [ ] **B1.4** Commit: `git add apps/web/lib/zip.js && git commit -m "refactor(web): re-export the shared zip writer"`.

### Task B2: `build-chatgpt-bundle.js` and `build-release-assets.js` — executor: sonnet

**Files:** create `scripts/build-chatgpt-bundle.js`, `scripts/build-release-assets.js`.

- [ ] **B2.0** Create `scripts/build-chatgpt-bundle.js` (D17, finding 6.7):
  ```js
  #!/usr/bin/env node
  'use strict'
  // Builds the ChatGPT plugin ZIP (Agent Plugins format) for directory submission.
  // Layout: plugin.json, mcp.json and assets/** from listings/chatgpt/ (Phase 6 owns them), plus
  // skills/<name>/SKILL.md and skills/<name>/references/*.md from packages/aegis/skills (the files that ship on npm).
  // Nothing else from listings/chatgpt/ is packed, so review notes or credentials kept there never enter the ZIP.
  // Rules checked 2026-10-08 against https://developers.openai.com/plugins/deploy/submission.md
  // Usage: node scripts/build-chatgpt-bundle.js --out <dir>   (exit 0 with "skipped" until listings/chatgpt/plugin.json exists)
  const fs = require('fs')
  const path = require('path')
  const lib = require('./lib/release-manifests')
  const { createZip } = require('./lib/zip')

  const SRC = 'listings/chatgpt'
  const SCHEMA = 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json'
  const ICON_EXT = /\.(png|jpe?g|webp|svg)$/i

  function filesUnder (rel) {
    if (!lib.exists(rel)) return []
    const out = []
    const stack = ['']
    while (stack.length) {
      const sub = stack.pop()
      for (const e of fs.readdirSync(lib.abs(sub ? `${rel}/${sub}` : rel), { withFileTypes: true })) {
        const p = sub ? `${sub}/${e.name}` : e.name
        if (e.isDirectory()) stack.push(p)
        else if (e.isFile()) out.push(p)
      }
    }
    return out.sort()
  }

  function buildChatgptBundle (outDir) {
    if (!lib.exists(`${SRC}/plugin.json`)) return null
    const version = lib.readJson('packages/aegis/package.json').data.version
    const plugin = lib.readJson(`${SRC}/plugin.json`).data
    const mcp = lib.readJson(`${SRC}/mcp.json`).data
    const problems = []
    if (plugin.$schema !== SCHEMA) problems.push(`plugin.json "$schema" must be ${SCHEMA}`)
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(plugin.name || '') || plugin.name.length > 64) problems.push('plugin.json "name": lowercase letters, digits and single hyphens, at most 64 characters')
    if (plugin.version !== version) problems.push(`plugin.json "version" is ${plugin.version}, aegis-skills is ${version}`)
    if (plugin.hooks || plugin.apps) problems.push('plugin.json must not declare "hooks" or "apps" (rejected for directory submission)')
    const servers = Object.entries(mcp.mcpServers || {})
    if (servers.length !== 1) problems.push(`mcp.json "mcpServers" must declare exactly one server (found ${servers.length})`)
    for (const [id, s] of servers) {
      if (!/^https:\/\//.test(s.url || '') || s.command) problems.push(`mcp.json mcpServers.${id} must be a remote https "url" with no "command"`)
    }
    const entries = [
      { name: 'plugin.json', data: fs.readFileSync(lib.abs(`${SRC}/plugin.json`)) },
      { name: 'mcp.json', data: fs.readFileSync(lib.abs(`${SRC}/mcp.json`)) }
    ]
    for (const f of filesUnder(`${SRC}/assets`)) {
      const data = fs.readFileSync(lib.abs(`${SRC}/assets/${f}`))
      if (!ICON_EXT.test(f)) problems.push(`assets/${f}: only PNG, JPEG, WebP or SVG are allowed`)
      if (data.length > 5 * 1024 * 1024) problems.push(`assets/${f}: larger than 5 MiB`)
      entries.push({ name: `assets/${f}`, data })
    }
    const skillsRoot = 'packages/aegis/skills'
    for (const s of fs.readdirSync(lib.abs(skillsRoot), { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort()) {
      if (!lib.exists(`${skillsRoot}/${s}/SKILL.md`)) continue
      entries.push({ name: `skills/${s}/SKILL.md`, data: fs.readFileSync(lib.abs(`${skillsRoot}/${s}/SKILL.md`)) })
      for (const r of filesUnder(`${skillsRoot}/${s}/references`).filter(f => /^[a-z0-9-]+\.md$/.test(f))) {
        entries.push({ name: `skills/${s}/references/${r}`, data: fs.readFileSync(lib.abs(`${skillsRoot}/${s}/references/${r}`)) })
      }
    }
    if (problems.length) throw new Error(`ChatGPT bundle invalid:\n  - ${problems.join('\n  - ')}`)
    const file = path.join(outDir, `aegis-chatgpt-plugin-${version}.zip`)
    fs.writeFileSync(file, createZip(entries))
    return file
  }

  if (require.main === module) {
    const i = process.argv.indexOf('--out')
    if (i === -1 || !process.argv[i + 1]) { console.error('usage: node scripts/build-chatgpt-bundle.js --out <dir>'); process.exit(2) }
    const out = path.resolve(process.argv[i + 1])
    fs.mkdirSync(out, { recursive: true })
    try {
      const file = buildChatgptBundle(out)
      console.log(file ? `build-chatgpt-bundle: ${file.split(path.sep).join('/')}` : 'build-chatgpt-bundle: skipped (listings/chatgpt/plugin.json not present yet; Phase 6 creates it)')
    } catch (e) { console.error(`build-chatgpt-bundle: ${e.message}`); process.exit(1) }
  }

  module.exports = { buildChatgptBundle }
  ```
  Run `node scripts/build-chatgpt-bundle.js --out "$(node -p "require('os').tmpdir()")/aegis-chatgpt-check"`.
  - Before Phase 6, expect `build-chatgpt-bundle: skipped (…)`.
  - If `listings/chatgpt/plugin.json` already exists, expect a path ending in `/aegis-chatgpt-plugin-<ver>.zip`. Any `ChatGPT bundle invalid` line means the Phase 6 listing source breaks a submission rule: STOP and report the list. If `mcp.json` uses a top-level key other than `mcpServers`, STOP and report as well; do not guess the format.

- [ ] **B2.1** Create `scripts/build-release-assets.js`:
  ```js
  #!/usr/bin/env node
  'use strict'
  // Builds GitHub Release assets for one package into an empty --out directory.
  //   aegis: per-skill zips and a prompts bundle (from the site's build-downloads output, so they match the site byte
  //          for byte), Gemini extension archives (darwin/linux/win32, manifest at the archive root), the npm tarball,
  //          SHA256SUMS.
  //   others: the npm tarball and SHA256SUMS.
  // For aegis, run `npm run prebuild --workspace @aegis-skills/web` first.
  // Usage: node scripts/build-release-assets.js --package <key|npm-name> --out <dir> [--npm-tarball <file>]
  const fs = require('fs')
  const path = require('path')
  const crypto = require('crypto')
  const lib = require('./lib/release-manifests')
  const { createZip } = require('./lib/zip')
  const { buildChatgptBundle } = require('./build-chatgpt-bundle')

  const DOWNLOADS = 'apps/web/public/downloads'
  const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex')
  const arg = name => { const i = process.argv.indexOf(name); return i === -1 ? null : process.argv[i + 1] }

  function aegisAssets (out) {
    const dir = 'packages/aegis'
    const version = lib.readJson(`${dir}/package.json`).data.version
    if (!lib.exists(`${DOWNLOADS}/index.json`)) throw new Error(`${DOWNLOADS}/index.json missing; run: npm run prebuild --workspace @aegis-skills/web`)
    const index = lib.readJson(`${DOWNLOADS}/index.json`).data
    if (index.aegisVersion !== version) throw new Error(`${DOWNLOADS} was built for aegis ${index.aegisVersion}, the package is ${version}; re-run the prebuild`)
    const onDisk = fs.readdirSync(lib.abs(`${dir}/skills`), { withFileTypes: true }).filter(e => e.isDirectory()).length
    if (index.skills.length !== onDisk) throw new Error(`index.json lists ${index.skills.length} skills, ${dir}/skills has ${onDisk}`)

    const prompts = []
    for (const s of index.skills) {
      const zip = fs.readFileSync(lib.abs(`${DOWNLOADS}/skills/${s.name}.zip`))
      if (sha256(zip) !== s.zipSha256) throw new Error(`skills/${s.name}.zip does not match its index.json sha256`)
      fs.writeFileSync(path.join(out, `aegis-skill-${s.name}-${version}.zip`), zip)
      prompts.push({ name: `${s.name}.md`, data: fs.readFileSync(lib.abs(`${DOWNLOADS}/prompts/${s.name}.md`)) })
    }
    fs.writeFileSync(path.join(out, `aegis-prompts-${version}.zip`), createZip(prompts))

    const gem = lib.readJson(`${dir}/gemini-extension.json`).data
    if (!/^[a-z0-9-]+$/.test(gem.name || '')) throw new Error('gemini-extension.json "name" must use lowercase letters, digits and hyphens')
    for (const [id, s] of Object.entries(gem.mcpServers || {})) {
      if (s.command !== 'npx') throw new Error(`gemini-extension.json mcpServers.${id}.command must be "npx": the archive ships no node_modules`)
    }
    const files = lib.packFiles(dir).files
    if (!files.includes('gemini-extension.json')) throw new Error('gemini-extension.json is not in the npm file list')
    const archive = createZip(files.map(f => ({ name: f, data: fs.readFileSync(lib.abs(`${dir}/${f}`)) })))
    for (const platform of ['darwin', 'linux', 'win32']) fs.writeFileSync(path.join(out, `${platform}.${gem.name}.zip`), archive)
    const chatgpt = buildChatgptBundle(out)
    return `${index.skills.length} skill zips, 1 prompts bundle, 3 Gemini archives, ${chatgpt ? '1 ChatGPT plugin bundle' : 'no ChatGPT bundle (listings/chatgpt not present yet)'}`
  }

  function main () {
    const pkg = lib.findPackage(arg('--package') || '')
    const outArg = arg('--out')
    if (!pkg || !outArg) { console.error('usage: node scripts/build-release-assets.js --package <key|npm-name> --out <dir> [--npm-tarball <file>]'); process.exit(2) }
    const out = path.resolve(outArg)
    if (fs.existsSync(out) && fs.readdirSync(out).length) throw new Error(`${outArg} is not empty; delete it first`)
    fs.mkdirSync(out, { recursive: true })
    if (pkg.assets) console.log(`build-release-assets: ${aegisAssets(out)}`)
    const tgz = arg('--npm-tarball')
    if (tgz) fs.copyFileSync(path.resolve(tgz), path.join(out, path.basename(tgz)))
    const names = fs.readdirSync(out).sort()
    fs.writeFileSync(path.join(out, 'SHA256SUMS'), names.map(f => `${sha256(fs.readFileSync(path.join(out, f)))}  ${f}`).join('\n') + '\n')
    console.log(`build-release-assets: ${names.length} asset(s) + SHA256SUMS in ${outArg}`)
  }

  try { main() } catch (e) { console.error(`build-release-assets: ${e.message}`); process.exit(1) }
  ```
- [ ] **B2.2** Verify against the real repo:
  ```bash
  npm run prebuild --workspace @aegis-skills/web
  rm -rf dist-release && TGZ=$(node scripts/pack-to.js aegis dist-release/npm)
  node scripts/build-release-assets.js --package aegis --out dist-release/assets --npm-tarball "$TGZ"
  ls dist-release/assets | wc -l
  (cd dist-release/assets && sha256sum -c SHA256SUMS | grep -vc ': OK$')
  powershell -NoProfile -Command "Expand-Archive -Force dist-release/assets/win32.$(node -p "require('./packages/aegis/gemini-extension.json').name").zip $env:TEMP/aegis-gem-check; Test-Path $env:TEMP/aegis-gem-check/gemini-extension.json"
  ```
  Expected:
  - `build-release-assets: 24 skill zips, 1 prompts bundle, 3 Gemini archives, no ChatGPT bundle (listings/chatgpt not present yet)`. After Phase 6 adds `listings/chatgpt/`, it ends `1 ChatGPT plugin bundle` instead;
  - `build-release-assets: 29 asset(s) + SHA256SUMS in dist-release/assets` (30 with the ChatGPT bundle);
  - `30`: 24 + 1 + 3 + tarball + SHA256SUMS (31 with the ChatGPT bundle);
  - `0` (every checksum OK; `grep -vc` prints 0);
  - `True`.
- [ ] **B2.3** Commit: `git add scripts/build-chatgpt-bundle.js scripts/build-release-assets.js && git commit -m "feat(release): build GitHub Release assets, ChatGPT plugin bundle and SHA256SUMS"`. `dist-release/` is ignored after B5. Until then, do not `git add` it.

### Task B3: `wait-for-deps.js` and `release.yml` — executor: sonnet

**Files:** create `scripts/wait-for-deps.js`, `.github/workflows/release.yml`.

- [ ] **B3.1** Create `scripts/wait-for-deps.js`:
  ```js
  #!/usr/bin/env node
  'use strict'
  // Blocks until every internal dependency range (aegis-skills, @aegis-skills/*) of a package.json resolves on npm.
  // Enforces publish order: core -> gateway -> plugin/app. Uses only the npm CLI; installs nothing.
  // Usage: node scripts/wait-for-deps.js <package.json> [--timeout-min 20]
  const fs = require('fs')
  const { execSync } = require('child_process')

  const file = process.argv[2]
  const ti = process.argv.indexOf('--timeout-min')
  const timeoutMin = ti === -1 ? 20 : Number(process.argv[ti + 1])
  if (!file || !(timeoutMin > 0)) { console.error('usage: node scripts/wait-for-deps.js <package.json> [--timeout-min N]'); process.exit(2) }

  const pj = JSON.parse(fs.readFileSync(file, 'utf8'))
  const wanted = []
  for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const [name, range] of Object.entries(pj[field] || {})) {
      if (name !== 'aegis-skills' && !name.startsWith('@aegis-skills/')) continue
      if (!/^[a-z0-9@/._-]+$/.test(name) || !/^\^\d+\.\d+\.\d+$/.test(range)) { console.error(`wait-for-deps: refusing unexpected spec ${name}@${range}`); process.exit(1) }
      wanted.push(`${name}@${range}`)
    }
  }
  const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
  const resolves = spec => {
    try { return execSync(`npm view "${spec}" version --json`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().length > 0 } catch { return false }
  }
  const deadline = Date.now() + timeoutMin * 60000
  let pending = [...wanted]
  for (;;) {
    pending = pending.filter(s => !resolves(s))
    if (!pending.length) break
    if (Date.now() > deadline) { console.error(`wait-for-deps: unresolved after ${timeoutMin} min: ${pending.join(', ')}. Publish those packages first.`); process.exit(1) }
    console.log(`wait-for-deps: waiting for ${pending.join(', ')}`)
    sleep(30000)
  }
  console.log(wanted.length ? `wait-for-deps: OK (${wanted.join(', ')})` : 'wait-for-deps: no internal dependencies')
  ```
- [ ] **B3.2** Create `.github/workflows/release.yml` with exactly:
  ```yaml
  name: Release

  # The npm trusted publisher of every package is bound to this exact filename (release.yml) and environment (npm).
  # Do not rename this file or the environment without reconfiguring all five trusted publishers on npmjs.com.
  on:
    push:
      tags:
        - 'aegis-skills@*'
        - '@aegis-skills/*@*'
    workflow_dispatch:
      inputs:
        tag:
          description: 'Existing tag to (re)release, e.g. aegis-skills@1.1.0. A version already on npm is not republished.'
          required: true
          type: string

  permissions: {}

  concurrency:
    group: release-${{ github.event_name == 'workflow_dispatch' && inputs.tag || github.ref_name }}
    cancel-in-progress: false

  defaults:
    run:
      shell: bash

  env:
    RELEASE_TAG: ${{ github.event_name == 'workflow_dispatch' && inputs.tag || github.ref_name }}

  jobs:
    resolve:
      name: Resolve tag
      runs-on: ubuntu-latest
      permissions:
        contents: read
      outputs:
        name: ${{ steps.meta.outputs.name }}
        dir: ${{ steps.meta.outputs.dir }}
        key: ${{ steps.meta.outputs.key }}
        version: ${{ steps.meta.outputs.version }}
        latest: ${{ steps.meta.outputs.latest }}
        prev_tag: ${{ steps.meta.outputs.prev_tag }}
      steps:
        - name: Validate tag format
          run: |
            if ! [[ "$RELEASE_TAG" =~ ^(aegis-skills|@aegis-skills/[a-z-]+)@[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
              echo "::error::'$RELEASE_TAG' is not <npm-name>@X.Y.Z"
              exit 1
            fi
        - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
          with:
            ref: refs/tags/${{ env.RELEASE_TAG }}
            fetch-depth: 0
            persist-credentials: false
        - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
          with:
            node-version: '22'
            package-manager-cache: false
        - name: Tag must point at a commit on main
          run: |
            git fetch --no-tags origin main
            git merge-base --is-ancestor HEAD FETCH_HEAD || { echo "::error::$RELEASE_TAG is not on main"; exit 1; }
        - id: meta
          run: node scripts/check-versions.js --tag "$RELEASE_TAG"

    verify:
      name: Verify ${{ needs.resolve.outputs.name }}@${{ needs.resolve.outputs.version }}
      needs: resolve
      runs-on: ubuntu-latest
      permissions:
        contents: read
      env:
        NAME: ${{ needs.resolve.outputs.name }}
        VERSION: ${{ needs.resolve.outputs.version }}
        PKG_KEY: ${{ needs.resolve.outputs.key }}
        PKG_DIR: ${{ needs.resolve.outputs.dir }}
      steps:
        - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
          with:
            ref: refs/tags/${{ env.RELEASE_TAG }}
            fetch-depth: 0
            persist-credentials: false
        - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
          with:
            node-version: '22'
            package-manager-cache: false
        - run: npm ci
        - name: Lint, guards and tests
          run: |
            npm run check:versions
            npm run lint:skills
            npm run check:deps
            npm run test:scripts
            for d in themis-core themis-gateway themis-plugin themis-app; do
              if [ -f "packages/$d/package.json" ]; then npm run build --workspace "packages/$d" --if-present; fi
            done
            npm test
        - name: Assert tarball contents
          run: node scripts/assert-pack.js "$PKG_KEY"
        - name: npm publish --dry-run
          run: |
            if npm view "$NAME@$VERSION" version > /dev/null 2>&1; then
              echo "$NAME@$VERSION is already on npm; dry run skipped"
            else
              npm publish --dry-run --ignore-scripts --workspace "$PKG_DIR"
            fi
        - name: Pack the exact tarball to publish
          run: node scripts/pack-to.js "$PKG_KEY" dist-release/npm
        - name: Build site downloads (aegis only)
          if: needs.resolve.outputs.key == 'aegis'
          run: npm run prebuild --workspace @aegis-skills/web
        - name: Build release assets
          run: node scripts/build-release-assets.js --package "$PKG_KEY" --out dist-release/assets --npm-tarball "$(ls dist-release/npm/*.tgz)"
        - uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
          with:
            name: npm-tarball
            path: dist-release/npm/
            if-no-files-found: error
            retention-days: 7
        - uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
          with:
            name: release-assets
            path: dist-release/assets/
            if-no-files-found: error
            retention-days: 7

    publish:
      name: Publish to npm
      needs: [resolve, verify]
      runs-on: ubuntu-latest
      environment: npm
      permissions:
        contents: read
        id-token: write
      env:
        NAME: ${{ needs.resolve.outputs.name }}
        VERSION: ${{ needs.resolve.outputs.version }}
      steps:
        # Checkout only for scripts/wait-for-deps.js. This job never runs npm ci or project scripts.
        - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
          with:
            ref: refs/tags/${{ env.RELEASE_TAG }}
            persist-credentials: false
        - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
          with:
            node-version: '22'
            registry-url: https://registry.npmjs.org
            package-manager-cache: false
        - name: npm 11.21.0 (trusted publishing needs >= 11.5.1)
          run: npm install -g npm@11.21.0 && npm --version
        - uses: actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333 # v8.0.2
          with:
            name: npm-tarball
            path: dist-release/npm
        - name: Check the tarball identity
          run: |
            mkdir -p "$RUNNER_TEMP/meta"
            tar -xzf dist-release/npm/*.tgz -C "$RUNNER_TEMP/meta" package/package.json
            node -e 'const p=require(process.argv[1]); if (p.name!==process.env.NAME||p.version!==process.env.VERSION) { console.error(`tarball is ${p.name}@${p.version}`); process.exit(1) }' "$RUNNER_TEMP/meta/package/package.json"
        - id: exists
          name: Skip versions already on npm
          run: |
            if npm view "$NAME@$VERSION" version > /dev/null 2>&1; then
              echo "published=true" >> "$GITHUB_OUTPUT"; echo "$NAME@$VERSION is already on npm; not republishing"
            else
              echo "published=false" >> "$GITHUB_OUTPUT"
            fi
        - name: Wait for internal dependencies on the registry
          if: steps.exists.outputs.published == 'false'
          run: node scripts/wait-for-deps.js "$RUNNER_TEMP/meta/package/package.json" --timeout-min 20
        - name: Publish with provenance
          if: steps.exists.outputs.published == 'false'
          env:
            # Empty once trusted publishing is configured (OIDC is used). Set only during the one-time bootstrap.
            NODE_AUTH_TOKEN: ${{ secrets.NPM_BOOTSTRAP_TOKEN }}
          run: |
            cd dist-release/npm
            npm publish ./*.tgz --provenance --access public --tag latest

    github-release:
      name: GitHub Release
      needs: [resolve, publish]
      runs-on: ubuntu-latest
      permissions:
        contents: write
      env:
        NAME: ${{ needs.resolve.outputs.name }}
        VERSION: ${{ needs.resolve.outputs.version }}
        LATEST: ${{ needs.resolve.outputs.latest }}
        PREV_TAG: ${{ needs.resolve.outputs.prev_tag }}
        GH_TOKEN: ${{ github.token }}
        GH_REPO: ${{ github.repository }}
      steps:
        - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
          with:
            ref: refs/tags/${{ env.RELEASE_TAG }}
            persist-credentials: false
        - uses: actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333 # v8.0.2
          with:
            name: release-assets
            path: dist-release/assets
        - name: Write release notes
          run: |
            NOTES_FILE=".github/release-notes/${RELEASE_TAG//\//__}.md"
            {
              if [ -f "$NOTES_FILE" ]; then cat "$NOTES_FILE"; echo; fi
              echo "**npm:** https://www.npmjs.com/package/$NAME/v/$VERSION (published by this workflow with npm provenance)"
              echo
              echo 'Verify downloads with `sha256sum -c SHA256SUMS`.'
            } > "$RUNNER_TEMP/notes.md"
        - name: Create or update the release
          run: |
            if gh release view "$RELEASE_TAG" > /dev/null 2>&1; then
              gh release upload "$RELEASE_TAG" dist-release/assets/* --clobber
            else
              ARGS=(--verify-tag --title "$RELEASE_TAG" --notes-file "$RUNNER_TEMP/notes.md" --generate-notes "--latest=$LATEST")
              if [ -n "$PREV_TAG" ]; then ARGS+=(--notes-start-tag "$PREV_TAG"); fi
              gh release create "$RELEASE_TAG" "${ARGS[@]}" dist-release/assets/*
            fi

    smoke:
      name: Smoke test from npm (${{ matrix.os }})
      needs: [resolve, publish]
      runs-on: ${{ matrix.os }}
      permissions: {}
      strategy:
        fail-fast: false
        matrix:
          os: [ubuntu-latest, windows-latest, macos-latest]
      env:
        NAME: ${{ needs.resolve.outputs.name }}
        VERSION: ${{ needs.resolve.outputs.version }}
        PKG_KEY: ${{ needs.resolve.outputs.key }}
        AEGIS_NO_AUTO_REFRESH: '1'
      steps:
        - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
          with:
            node-version: '22'
            package-manager-cache: false
        - name: Install from the registry, run the CLI, verify signatures and provenance
          run: |
            for i in $(seq 1 40); do npm view "$NAME@$VERSION" version > /dev/null 2>&1 && break; sleep 15; done
            npm view "$NAME@$VERSION" version > /dev/null 2>&1 || { echo "::error::$NAME@$VERSION not visible on npm after 10 minutes"; exit 1; }
            T=$(node -p "process.env.RUNNER_TEMP.split(require('path').sep).join('/')")
            mkdir -p "$T/smoke" "$T/home" && cd "$T/smoke"
            export HOME="$T/home" USERPROFILE="$T/home" THEMIS_HOME="$T/home/.themis"
            npm init -y > /dev/null
            npm install --no-audit --no-fund "$NAME@$VERSION"
            node -e "require('fs').accessSync('node_modules/' + process.env.NAME + '/package.json')"
            case "$PKG_KEY" in
              aegis)
                OUT=$(npx -y "aegis-skills@$VERSION" --version); echo "$OUT"
                case "$OUT" in *"$VERSION"*) ;; *) echo "::error::expected $VERSION"; exit 1 ;; esac ;;
              themis)
                npx -y "@aegis-skills/themis@$VERSION" --help ;;
            esac
            npm audit signatures | tee audit.txt
            grep -qi "verified attestation" audit.txt
  ```
- [ ] **B3.3** Static checks:
  ```bash
  node -e "const t=require('fs').readFileSync('.github/workflows/release.yml','utf8'); if(/\t/.test(t)) throw 1; if(/uses: [^#]+@v\d/.test(t)) throw 2; console.log('ok', (t.match(/id-token: write/g)||[]).length)"
  ```
  Expected: `ok 1` (only the publish job may mint OIDC tokens).
- [ ] **B3.4** Commit: `git add scripts/wait-for-deps.js .github/workflows/release.yml && git commit -m "ci(release): tag-driven npm publish with provenance, GitHub Release and smoke tests"`.

### Task B4: Intel auto-release — executor: sonnet

**Files:** create `scripts/intel-release-check.js`, `scripts/__tests__/intel-release-check.test.js`, `.github/workflows/intel-release.yml`.

- [ ] **B4.1** Write the failing test `scripts/__tests__/intel-release-check.test.js`:
  ```js
  'use strict'
  const test = require('node:test')
  const assert = require('node:assert/strict')
  const fs = require('fs')
  const os = require('os')
  const path = require('path')
  const { execFileSync, spawnSync } = require('child_process')

  const SCRIPT = path.join(__dirname, '..', 'intel-release-check.js')

  test('auto-release only for intel-only changes that ship', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-intel-'))
    const w = (rel, text) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text) }
    const git = (...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.invalid', '-c', 'commit.gpgsign=false', '-c', 'tag.gpgsign=false', ...a], { cwd: root, encoding: 'utf8' })
    const commit = msg => { git('add', '-A'); git('commit', '-q', '-m', msg) }
    const decide = () => {
      const r = spawnSync(process.execPath, [SCRIPT], { env: { ...process.env, AEGIS_RELEASE_ROOT: root, GITHUB_OUTPUT: '', GITHUB_STEP_SUMMARY: '' }, encoding: 'utf8' })
      assert.equal(r.status, 0, r.stderr)
      return /^release=(true|false)$/m.exec(r.stdout)[1]
    }
    const S = 'packages/aegis/skills/demo'
    w('packages/aegis/package.json', JSON.stringify({ name: 'aegis-skills', version: '1.1.0' }))
    w(`${S}/SKILL.md`, '# demo\n')
    w(`${S}/references/live-threat-intel.md`, 'v1\n')
    w(`${S}/intel-state.json`, '{}\n')
    w('packages/aegis/health.json', '{}\n')
    git('init', '-q'); commit('init'); git('tag', 'aegis-skills@1.1.0')

    assert.equal(decide(), 'false', 'no changes')
    w(`${S}/intel-state.json`, '{"a":1}\n'); w('packages/aegis/health.json', '{"b":1}\n'); commit('state only')
    assert.equal(decide(), 'false', 'nothing shipped changed')
    w(`${S}/references/live-threat-intel.md`, 'v2\n'); commit('chore: weekly Aegis intel sync')
    assert.equal(decide(), 'true', 'intel changed')
    w(`${S}/SKILL.md`, '# demo v2\n'); commit('human edit')
    assert.equal(decide(), 'false', 'human edit needs a chosen version')
  })
  ```
- [ ] **B4.2** Create `scripts/intel-release-check.js`:
  ```js
  #!/usr/bin/env node
  'use strict'
  // Decides whether main holds intel-only changes that warrant an automatic aegis-skills patch release.
  // Prints release=, reason=, sha= and appends them to $GITHUB_OUTPUT (and a summary to $GITHUB_STEP_SUMMARY) when set.
  // --require-release: exit 1 unless release=true.
  const fs = require('fs')
  const { execFileSync } = require('child_process')
  const lib = require('./lib/release-manifests')

  const AEGIS_DIR = 'packages/aegis'
  // Files the intel-sync task and the health bot manage. Anything else under packages/aegis needs a human-chosen version.
  const INTEL_RE = /^packages\/aegis\/(health\.json|\.intel-sync-state\.json|skills\/[a-z0-9-]+\/(references\/live-threat-intel\.md|intel-state\.json))$/
  // Of those, the only files that ship in the npm package.
  const SHIPPED_RE = /^packages\/aegis\/skills\/[a-z0-9-]+\/references\/live-threat-intel\.md$/
  const git = args => execFileSync('git', args, { cwd: lib.ROOT, encoding: 'utf8' }).trim()

  function latestAegisTag () {
    let best = null
    for (const t of git(['tag', '--list', 'aegis-skills@*']).split('\n').filter(Boolean)) {
      const v = lib.parse(t.slice('aegis-skills@'.length))
      if (v && (!best || lib.cmp(v, best.v) > 0)) best = { t, v }
    }
    return best
  }

  function decide () {
    const tag = latestAegisTag()
    if (!tag) return { release: false, reason: 'no aegis-skills@* tag yet; the first release is cut by hand' }
    const version = lib.readJson(`${AEGIS_DIR}/package.json`).data.version
    if (version !== tag.v.join('.')) return { release: false, reason: `${AEGIS_DIR}/package.json is ${version} but the newest tag is ${tag.t}; a manual release is in progress` }
    const changed = git(['diff', '--name-only', `${tag.t}..HEAD`, '--', AEGIS_DIR]).split('\n').filter(Boolean)
    if (!changed.length) return { release: false, reason: `nothing under ${AEGIS_DIR} changed since ${tag.t}` }
    const other = changed.filter(f => !INTEL_RE.test(f))
    if (other.length) return { release: false, reason: `non-intel changes since ${tag.t} need a human-chosen version (npm run bump -- aegis <patch|minor|major>): ${other.slice(0, 10).join(', ')}${other.length > 10 ? ', ...' : ''}` }
    const shipped = changed.filter(f => SHIPPED_RE.test(f))
    if (!shipped.length) return { release: false, reason: `only intel state changed since ${tag.t}; nothing that ships in the package changed` }
    return { release: true, reason: `${shipped.length} live-threat-intel file(s) changed since ${tag.t}` }
  }

  const result = { ...decide(), sha: git(['rev-parse', 'HEAD']) }
  const lines = [`release=${result.release}`, `reason=${result.reason}`, `sha=${result.sha}`]
  console.log(lines.join('\n'))
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, lines.join('\n') + '\n')
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Aegis intel release\n\n- release: **${result.release}**\n- ${result.reason}\n`)
  if (process.argv.includes('--require-release') && !result.release) process.exit(1)
  ```
- [ ] **B4.3** Create `.github/workflows/intel-release.yml` with exactly:
  ```yaml
  name: Aegis intel patch release

  # Intel-sync is a local Claude scheduled task (Saturdays) on the maintainer's machine, not CI (D12). It pushes
  # "chore: weekly Aegis intel sync" commits to main. Every Monday this workflow releases whatever is committed as an
  # aegis-skills patch, but only if nothing else changed (D13). It never runs intel-sync or reads .intel-sync-state.json.
  on:
    schedule:
      - cron: '0 6 2 * *'
    workflow_dispatch:

  permissions: {}

  concurrency:
    group: aegis-intel-release
    cancel-in-progress: false

  defaults:
    run:
      shell: bash

  jobs:
    decide:
      name: Decide
      runs-on: ubuntu-latest
      permissions:
        contents: read
      outputs:
        release: ${{ steps.check.outputs.release }}
        sha: ${{ steps.check.outputs.sha }}
      steps:
        - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
          with:
            ref: main
            fetch-depth: 0
            persist-credentials: false
        - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
          with:
            node-version: '22'
            package-manager-cache: false
        - id: check
          run: node scripts/intel-release-check.js

    verify:
      name: Verify (no secrets)
      needs: decide
      if: needs.decide.outputs.release == 'true'
      runs-on: ubuntu-latest
      permissions:
        contents: read
      steps:
        - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
          with:
            ref: ${{ needs.decide.outputs.sha }}
            persist-credentials: false
        - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
          with:
            node-version: '22'
            package-manager-cache: false
        - run: npm ci
        - run: |
            npm run check:versions
            npm run lint:skills
            npm run check:deps
            npm run test:scripts
            for d in themis-core themis-gateway themis-plugin themis-app; do
              if [ -f "packages/$d/package.json" ]; then npm run build --workspace "packages/$d" --if-present; fi
            done
            npm test
            node scripts/assert-pack.js aegis

    release:
      name: Bump, tag and push
      needs: [decide, verify]
      runs-on: ubuntu-latest
      environment: release-bot
      permissions:
        contents: read   # the push uses RELEASE_PAT; a GITHUB_TOKEN push would not trigger release.yml
      env:
        EXPECTED_SHA: ${{ needs.decide.outputs.sha }}
      steps:
        - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
          with:
            ref: main
            fetch-depth: 0
            token: ${{ secrets.RELEASE_PAT }}
        - name: main must not have moved since verification
          run: |
            if [ "$(git rev-parse HEAD)" != "$EXPECTED_SHA" ]; then
              echo "::error::main moved since verification; re-run this workflow"
              exit 1
            fi
        - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
          with:
            node-version: '22'
            package-manager-cache: false
        # No npm ci here: bump-version.js and intel-release-check.js use Node built-ins only.
        - name: Re-check, bump, commit and tag
          id: bump
          run: |
            node scripts/intel-release-check.js --require-release
            git config user.name "github-actions[bot]"
            git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
            node scripts/bump-version.js aegis patch --commit | tee "$RUNNER_TEMP/bump.log"
            echo "tag=$(sed -n 's/^TAG=//p' "$RUNNER_TEMP/bump.log")" >> "$GITHUB_OUTPUT"
        - name: Push commit and tag atomically
          env:
            TAG: ${{ steps.bump.outputs.tag }}
          run: |
            test -n "$TAG"
            git push --atomic origin HEAD:refs/heads/main "refs/tags/$TAG"
            echo "Pushed $TAG; release.yml publishes it." >> "$GITHUB_STEP_SUMMARY"
  ```
- [ ] **B4.4** Run `npm run test:scripts 2>&1 | grep -E "^# (pass|fail)"`. Expected: `# pass 9`, `# fail 0`. Then run `node scripts/intel-release-check.js`. Expected: `release=false` and `reason=no aegis-skills@* tag yet; the first release is cut by hand`.
- [ ] **B4.5** Commit: `git add scripts/intel-release-check.js scripts/__tests__/intel-release-check.test.js .github/workflows/intel-release.yml && git commit -m "ci(release): weekly automated aegis-skills patch release for intel-only changes"`.

### Task B5: Release notes, ignore rules, PR — executor: haiku

**Files:** create `.github/release-notes/aegis-skills@1.1.0.md`; modify `.gitignore`.

- [ ] **B5.1** Append to `.gitignore`:
  ```
  # Phase 7 release staging (tarballs, assets, checksums)
  dist-release/
  ```
- [ ] **B5.2** Create `.github/release-notes/aegis-skills@1.1.0.md`:
  ```markdown
  ## aegis-skills 1.1.0 — replaces @aegis-skills/core

  `@aegis-skills/core` is deprecated. The single package is now split:

  | You used | Use now |
  |---|---|
  | `npm i -g @aegis-skills/core` then `aegis init` | `npx aegis-skills install --platform <claude\|codex\|gemini\|cursor\|vscode>` |
  | `aegis` MCP server | `npx aegis-skills mcp` (same read-only tools: `list_skills`, `get_skill`, `get_skill_phase`) |
  | Themis inside the website / `/api/themis` | `npx @aegis-skills/themis dashboard` (local, 127.0.0.1) or the Themis plugin for your AI host |
  | ChatGPT Actions | removed; use the hosted MCP or the single-file prompts below |

  Migrate:

  1. `npm uninstall -g @aegis-skills/core`
  2. `npx aegis-skills install --platform <your platform>`. Skills you edited are kept as `.bak`.
  3. Gemini CLI: `gemini extensions install https://github.com/drupadsachania/aegis-skills`

  Assets on this release: one zip per skill (Agent Skills format), `aegis-prompts-1.1.0.zip` (one flattened prompt per skill, with an "intel as of" date), Gemini extension archives, the npm tarball and `SHA256SUMS`.

  Licence: Apache-2.0 OR MIT.
  ```
- [ ] **B5.3** Full local gate:
  ```bash
  npm ci && npm run check:versions && npm run test:scripts && npm test
  for k in aegis themis-core themis-gateway themis-plugin themis; do node scripts/assert-pack.js "$k"; done
  git status --porcelain | grep -v '^??' ; git status --porcelain | grep -c dist-release
  ```
  Expected: everything passes, five `assert-pack: OK`, then the final count `0`.
- [ ] **B5.4** Commit, push, open the PR:
  ```bash
  git add .gitignore .github/release-notes/aegis-skills@1.1.0.md
  git commit -m "docs(release): migration notes for aegis-skills 1.1.0 and ignore release staging"
  git push -u origin restructure/phase-7d-release
  gh pr create --base main --title "ci(release): release pipeline (Phase 7 part B)" --body "Tag-driven release.yml (OIDC/provenance publish of the verified tarball, GitHub Release with skill zips, prompts bundle, Gemini archives and SHA256SUMS, cross-OS smoke tests), weekly intel-release.yml, wait-for-deps publish-order guard, shared zip writer. Nothing is published until the USER ACTIONS in the plan are done and a tag is pushed.

  🤖 Generated with [Claude Code](https://claude.com/claude-code)"
  gh pr checks --watch
  ```
  Expected: all checks pass. `Pack (aegis)` now also runs the release-asset dry run. Merging is a USER ACTION.

### Task B6: USER ACTION gate — executor: haiku

- [ ] **B6.1** Stop and ask the user to finish USER ACTIONS U1–U5 (below). Then verify read-only:
  ```bash
  gh api repos/drupadsachania/aegis-skills/environments --jq '.environments[].name' | sort
  gh secret list --env npm --repo drupadsachania/aegis-skills
  gh secret list --env release-bot --repo drupadsachania/aegis-skills
  gh api repos/drupadsachania/aegis-skills/rulesets --jq '.[].name'
  ```
  Expected:
  - `npm` and `release-bot` are listed;
  - `NPM_BOOTSTRAP_TOKEN` is in env `npm`;
  - `RELEASE_PAT` is in env `release-bot`;
  - the rulesets include `main` and `release-tags`.

  Anything missing: wait for the user.

### Task B7: Bootstrap the first releases — executor: sonnet (pushes are USER ACTIONS)

**Files:** none (only if the version must be set, see B7.1).

- [ ] **B7.1** On up-to-date `main`, check the starting versions:
  ```bash
  git switch main && git pull --ff-only
  node -e "for (const d of ['aegis','themis-core','themis-gateway','themis-plugin','themis-app']) { const p=require('./packages/'+d+'/package.json'); console.log(p.name+'@'+p.version) }"
  ```
  Expected: `aegis-skills@1.1.0` and four `…@0.1.0`.
  - If aegis is lower than 1.1.0: on a branch, run `npm run bump -- aegis 1.1.0` and commit `chore(release): aegis-skills@1.1.0`. Open a PR; USER merges.
  - Do the same for any Themis package that is not `0.1.0`. A lower version is raised to `0.1.0`; a higher version is a STOP.
- [ ] **B7.2** Create the tags locally on the merged `main` commit (all five may point at the same commit):
  ```bash
  for t in aegis-skills@1.1.0 @aegis-skills/themis-core@0.1.0 @aegis-skills/themis-gateway@0.1.0 @aegis-skills/themis-plugin@0.1.0 @aegis-skills/themis@0.1.0; do git tag -a "$t" -m "$t"; done
  git tag --list '*aegis-skills*@*'
  ```
- [ ] **B7.3** USER ACTION, one tag at a time, in this order. Wait for each run to finish green before pushing the next:
  ```bash
  git push origin aegis-skills@1.1.0
  gh run watch $(gh run list --workflow Release --limit 1 --json databaseId -q '.[0].databaseId')
  ```
  Then do the same for `@aegis-skills/themis-core@0.1.0`, `@aegis-skills/themis-gateway@0.1.0`, `@aegis-skills/themis-plugin@0.1.0` and `@aegis-skills/themis@0.1.0`.

  Expected per run: `Resolve tag`, `Verify …`, `Publish to npm`, `GitHub Release` and the three `Smoke test` jobs pass.
  - A failure before `Publish`: delete the tag on the remote (USER: `git push origin :refs/tags/<tag>`), fix it on a branch, and re-tag after the merge.
  - A failure after `Publish`: use the rollback procedure. Never re-tag a published version.
- [ ] **B7.4** Verify:
  ```bash
  for p in aegis-skills @aegis-skills/themis-core @aegis-skills/themis-gateway @aegis-skills/themis-plugin @aegis-skills/themis; do npm view "$p" version dist.attestations.provenance.predicateType; done
  gh release view --json tagName -q .tagName
  ```
  Expected:
  - each package prints its version and `https://slsa.dev/provenance/v1`;
  - the Latest release is `aegis-skills@1.1.0` (Themis releases were created with `--latest=false`).

### Task B8: Switch to trusted publishing — executor: sonnet (npm settings are USER ACTIONS)

- [ ] **B8.1** USER ACTION U6 (configure five trusted publishers) right after B7. The 48 h validation window starts then.
- [ ] **B8.2** Within 48 h, publish one OIDC validation patch of each package. Follow the manual release procedure below with `patch` for each, in order: aegis, themis-core, themis-gateway, themis-plugin, themis.
  - Use one branch `release/trusted-publishing-validation` with five bump commits.
  - Run `npm run bump -- <key> patch` (no `--commit`), then `git add -A packages .claude-plugin package-lock.json && git commit -m "chore(release): <tag>"`.
  - After the merge, the tags are created on `main` and the USER pushes them one at a time.

  Before pushing the first validation tag, the USER deletes the `NPM_BOOTSTRAP_TOKEN` environment secret (U6 step 3). The validation run must succeed **without** it; that proves OIDC works.
- [ ] **B8.3** Verify that each validation version has provenance (same command as B7.4, with `.1` versions). Then the USER does U6 step 4: disallow tokens on each package and revoke the bootstrap token.

### Task B9: Deprecate core, final checks — executor: haiku

- [ ] **B9.1** USER ACTION U7: deprecate `@aegis-skills/core`. Verify:
  ```bash
  npm view @aegis-skills/core deprecated
  ```
  Expected: the message from U7.
- [ ] **B9.2** Dry-run the weekly bot: `gh workflow run intel-release.yml && sleep 5 && gh run watch $(gh run list --workflow intel-release.yml --limit 1 --json databaseId -q '.[0].databaseId')`.
  - With no intel since the last tag, expect `Decide` green with summary `release: false` and `verify`/`release` skipped.
  - If the operator's intel commit has landed, expect a new `aegis-skills@1.1.2` tag followed by a green Release run.
- [ ] **B9.3** Run the Exit checklist.

---

## Manual release procedure (after bootstrap; used by B8 and every human release)

1. `git switch main && git pull --ff-only && git switch -c release/<npm-name-with-slashes-as-dashes>-<version>`
2. `npm run bump -- <aegis|themis-core|themis-gateway|themis-plugin|themis> <patch|minor|major>`. Note the `TAG=` line it prints.
3. `git add -A packages .claude-plugin package-lock.json apps/web/package.json && git commit -m "chore(release): <tag>"`, push, and open a PR. USER merges (any merge method).
4. `git switch main && git pull --ff-only && git tag -a <tag> -m <tag>`
5. USER: `git push origin <tag>`. For dependent packages, push in the D6 order and wait for each run.

Never use `--commit` outside the intel bot: a squash merge would leave the tag on a commit that is not on `main`, and `release.yml` rejects it.

## Rollback procedure

1. **Bad version on npm** (smoke failed, or a regression is found). Unpublish is only a last resort for leaked secrets, and needs npm support after 72 h. Otherwise, as USER, on a machine with `npm login` (2FA):
   ```bash
   npm deprecate "<name>@<bad>" "Broken release, use <name>@<good> or later. See https://github.com/drupadsachania/aegis-skills/releases"
   npm dist-tag add "<name>@<good>" latest
   ```
   With npm ≥ 11.21.0, `dist-tag` also works via OIDC, but there is no workflow for it; run it locally.
2. **GitHub Release:** mark the bad release as a pre-release: `gh release edit "<tag>" --prerelease --latest=false`. For Aegis, also re-point Latest so Gemini users get a good archive: `gh release edit "aegis-skills@<good>" --latest`.
3. **Fix forward:** fix it on a branch, then follow the manual release procedure with `patch`. Never delete or move a published tag.
4. **Intel bot misfire:** disable it with `gh workflow disable intel-release.yml` (USER). Re-enable it after the fix.

---

## Caveats & Pitfalls

- **[skip ci] in release commits.** It would suppress the tag-triggered `release.yml` (F8). `bump-version` writes `chore(release): <tag>` without it. The health bot keeps `[skip ci]` because it never tags.
- **Concurrency is not a queue.** Pushing five tags at once is safe only thanks to `wait-for-deps.js` (20-minute window). Still push them one at a time.
- **npm workspaces fall back to the registry** when a local version no longer satisfies a dependent's range. `check-versions` blocks that state in CI.
- **Trusted publisher fields are immutable** (F1). Renaming `release.yml` or the `npm` environment means recreating five configurations on npmjs.com.
- **Provenance requires `repository.url` to match the repo.** `check-versions` enforces it, including `directory`.
- **Gemini picks the Latest release.** A manual `gh release edit --latest` on a Themis release breaks `gemini extensions install`.
- **`npm publish --dry-run` may refuse versions already on npm**, so `verify` skips it for re-releases and CI `pack` uses `npm pack --dry-run` only.
- **Windows runners have build tools.** "No build tools" is enforced by the bogus `npm_config_node_gyp` and `assert-no-native.js`, not by the runner image.
- **`npm view <name>@<range>`** prints nothing when nothing matches. `wait-for-deps.js` treats empty output as "not yet".
- **The intel guard is path-based.** If intel-sync adds a new skill's `live-threat-intel` phase, it also edits `skill.json`/`SKILL.md`, so that week needs a manual release. This is intended.
- **Exact pins mean weekly pin churn** (D16): each Aegis patch rewrites `aegis-skills@X.Y.Z` in `packages/themis-plugin/.mcp.json` inside the release commit. This is expected, and the intel guard only inspects `packages/aegis/`.
- **Do not move the intel release earlier than Monday.** The local Saturday task can slip (machine off). A missed week simply yields `release=false`, and the next Monday picks up both weeks.
- **Dependabot SHA bumps** change workflow files. CI runs on them like any PR. Review action release notes before merging major bumps.
- **`apps/web/lib/zip.js` is a shim** after B1. Phase 5 tests keep passing through it. New code imports `scripts/lib/zip.js`.

## STOP conditions (in addition to contracts §1)

1. A0.2/A0.3/B0.1 expectations are not met (layout, SHAs, name availability).
2. `check-versions` reports drift in files owned by Phase 1–4. Report it; do not hand-edit those files.
3. `assert-pack` reports forbidden or missing files, or unexpected files of a new class. Report it; never widen `RULES`/`FORBIDDEN` on your own.
4. `scripts/skill-health.js` still references `artifacts` (A5.1).
5. `createZip` rejects dot-file names (B1.3) or `check:layout` fails.
6. Any step would push a tag, publish, change npm or GitHub settings, or delete a remote tag: those are USER ACTIONS.
7. A Release run fails after `Publish to npm` succeeded: do not retry with a new tag for the same version. Report it and follow the rollback procedure with the USER.
8. `build-chatgpt-bundle` reports `ChatGPT bundle invalid`, or `listings/chatgpt/mcp.json` has no `mcpServers` key. Phase 6 owns that source.
9. The npmjs.com UI behaves differently from F1/F2 (for example it offers a trusted publisher for unpublished names, or has no "disallow tokens" option). Report it before continuing B7/B8.

## USER ACTIONS

- **U1 npm account and org.**
  - Enable 2FA "authorization and writes" on the maintainer account.
  - Confirm owner rights on the `@aegis-skills` org/scope.
  - Confirm that `aegis-skills` and `@aegis-skills/themis` are still free right before B7.
- **U2 GitHub environment `npm`.** Settings → Environments → New `npm`.
  - Deployment branches and tags → Selected: branch `main`, tags `aegis-skills@*` and `@aegis-skills/*@*`.
  - No required reviewers (the intel patch must run unattended).
  - Environment secret `NPM_BOOTSTRAP_TOKEN`: an npm granular token with Read and write on "All packages", Bypass 2FA ticked, expiry 7 days.
- **U3 GitHub environment `release-bot`.**
  - Deployment branches: `main` only.
  - Environment secret `RELEASE_PAT`: a fine-grained PAT, resource owner `drupadsachania`, repository `aegis-skills` only, permission Contents: Read and write (nothing else), expiry ≤ 90 days.
  - Set a calendar reminder to rotate it.
  - Keep the existing `SKILL_HEALTH_PAT` repo secret, or move it to its own environment the same way.
- **U4 Rulesets.**
  - `main`: require a PR. Require status checks:
    - `Lint & guards`
    - `Test (ubuntu-latest, Node 22.13.0)`, `Test (ubuntu-latest, Node 22)`, `Test (ubuntu-latest, Node 24)`, `Test (windows-latest, Node 22)`
    - `Web build`
    - `Pack (aegis)`, `Pack (themis-core)`, `Pack (themis-gateway)`, `Pack (themis-plugin)`, `Pack (themis)`
    - `Install aegis-skills (ubuntu-latest)`, `Install aegis-skills (windows-latest)`, `Install aegis-skills (macos-latest)`
    - `Install themis (ubuntu-latest)`, `Install themis (windows-latest)`
  - `main` bypass list: Repository admin. The PAT owner is admin, which lets the health bot, the intel bot and the operator's local intel-sync push directly.
  - Block force pushes and deletions.
  - `release-tags`: target tags `aegis-skills@*` and `@aegis-skills/**`. Restrict creations, updates and deletions; bypass: Repository admin.
- **U5 Actions settings.**
  - Workflow permissions: "Read repository contents and packages permissions".
  - Untick "Allow GitHub Actions to create and approve pull requests".
  - Fork PR workflows: "Require approval for all external contributors".
- **U6 Trusted publishing** (after B7, per package: `aegis-skills`, `@aegis-skills/themis-core`, `@aegis-skills/themis-gateway`, `@aegis-skills/themis-plugin`, `@aegis-skills/themis`):
  1. npmjs.com → package → Settings → Trusted publishing → GitHub Actions. Owner `drupadsachania`, repository `aegis-skills`, workflow `release.yml`, environment `npm`.
  2. Start the B8 validation releases within 48 h.
  3. Before the first validation tag, delete the `NPM_BOOTSTRAP_TOKEN` environment secret.
  4. After all five validations pass: on each package, Settings → Publishing access → "Require two-factor authentication and disallow tokens". Then revoke the bootstrap token on npmjs.com.
- **U7 Deprecate core** (local, 2FA):
  ```bash
  npm deprecate "@aegis-skills/core@*" "Replaced by aegis-skills (skill pack + installer: npx aegis-skills install) and @aegis-skills/themis (local agent: npx @aegis-skills/themis dashboard). Migration: https://github.com/drupadsachania/aegis-skills/releases/tag/aegis-skills%401.1.0"
  ```
- **U8** Merging every PR, and pushing every manual release tag (B7.3, B8.2, manual procedure step 5).

## Out of scope

- MCP Registry publication (`mcp-publisher`, `mcpName` in package.json), plugin/connector/app directory listings and the Gemini gallery: Phase 6. They consume the packages and Latest release this phase produces.
  - Finding 6.2: the Themis plugin listing must wait until B7/B8 have published `@aegis-skills/themis-plugin`, because its MCP server is an exact-pinned `npx` of the published package.
  - Finding 6.7: Phase 6 writes `listings/chatgpt/{plugin.json,mcp.json,assets/}` (listing text, URLs, review cases kept outside the ZIP) and submits `aegis-chatgpt-plugin-<v>.zip` from the Latest Aegis release.
  - Finding 6.8: Phase 6 points the Gemini gallery at the repo; Gemini installs from the Latest release archive (D10).
- Vercel deployment settings; site content.
- Contents of `packages/*` and their own build/test scripts (Phases 1–4), and `scripts/check-deps.js`/`lint:skills` (Phases 1–2).
- CodeQL, dependency review and SBOM generation.
- Unpublishing anything.

## Exit checklist

- [ ] `ci.yml` runs on PRs, with every job active (`detect` all `true`) and green on `main`. Windows install tests for `aegis-skills` and `themis` pass with native builds disabled.
- [ ] `npm run check:versions` and `npm run test:scripts` (`# pass 9`) pass. Every workflow pins actions by SHA (`grep -nE "uses: [^#]+@v[0-9]" .github/workflows/*.yml` prints nothing).
- [ ] Five packages are on npm at their bootstrap version and their validation patch, each with provenance (`dist.attestations`). Tokens are disallowed on every package, and `NPM_BOOTSTRAP_TOKEN` is deleted and revoked.
- [ ] GitHub Releases exist for every tag:
  - Aegis releases carry 24 skill zips, the prompts zip, `darwin|linux|win32.<ext>.zip`, the tarball and `SHA256SUMS`, plus `aegis-chatgpt-plugin-<v>.zip` once Phase 6 has added `listings/chatgpt/`;
  - Themis releases carry the tarball and `SHA256SUMS`, and are not Latest.
- [ ] `gemini extensions install https://github.com/drupadsachania/aegis-skills` installs Aegis from the Latest release. USER-run, or recorded for Phase 6.
- [ ] `npx aegis-skills@<v> --version` and `npx @aegis-skills/themis@<v> --help` work on Linux, Windows and macOS (smoke jobs green).
- [ ] `npm view @aegis-skills/core deprecated` shows the U7 message.
- [ ] Every `npx` pin in `PIN_FILES` is exact and current (`npm run check:versions`). Phase 6 is told it may now submit the Themis plugin listing (finding 6.2): its `.mcp.json` pins `@aegis-skills/themis-plugin@<published version>`.
- [ ] `intel-release.yml` ran at least once with the right decision. Branch rulesets and tag rulesets are active.
