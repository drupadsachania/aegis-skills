# Phase 0 — Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single `@aegis-skills/core` package into an npm-workspaces monorepo. The whole current app moves unchanged into `apps/web/` and the skill content into `packages/aegis/skills/`. The repo becomes dual-licensed `Apache-2.0 OR MIT`, with no behaviour change: the same tests pass, the site builds and deploys, and `aegis compile` still works.

**Architecture:** Strangler rule (contracts §3). Only skill content leaves the app. Everything else keeps its internal layout under `apps/web/`. Runtime code inside the Next.js bundle finds the skill pack through one new module, `apps/web/lib/aegis-paths.js`, which works from `process.cwd()` and uses no `fs`. CLI code uses `__dirname`. Repo-level jobs (`scripts/`) stay at the repo root and anchor their paths to `__dirname`. Vercel builds from `apps/web` and has its file tracing reach up to the repo root.

**Tech Stack:** npm 11 workspaces, Node ≥ 22.13 (local 24.11), Next.js 14.2.35 (pages + app router), Jest 29 via `next/jest`, GitHub Actions, Vercel.

---

## Decisions made in this plan (binding for later phases)

| # | Decision | Why |
|---|---|---|
| D1 | `scripts/` **stays at the repo root**. It is not moved. Its four files get path fixes. | The skill-health workflow and the user's local intel-sync scheduled task both run `node scripts/...` from the repo root. The master plan's target layout already has `scripts/` at the root. Keeping it there means the commands do not change. |
| D2 | `health.json` → `packages/aegis/health.json` (tracked, `git mv`). `.intel-sync-state.json` → `packages/aegis/.intel-sync-state.json` (it is **gitignored and untracked**, so it moves with plain `mv`). | Both describe the skill pack. The `.gitignore` pattern `.intel-sync-state.json` has no leading slash, so it still matches at the new depth. |
| D3 | `scripts/compile-all.js` and `lib/cli/*` keep calling the compiler at `apps/web/src/compiler.js` until Phase 1 moves it. | Strangler rule. |
| D4 | The app's skill/health paths resolve through `apps/web/lib/aegis-paths.js`. Override: `AEGIS_PACKAGE_DIR`. | Next bundles server code, so `__dirname` is unreliable there. Tests mock `fs`, so the resolver may only use `path`. |
| D5 | `next.config.js` uses `experimental.outputFileTracingRoot` and `experimental.outputFileTracingIncludes`. | Next **14** reads these keys only under `experimental` (verified in `node_modules/next/dist/build/collect-build-traces.js`). The top-level keys only exist from Next 15. |
| D6 | Root `jest.config.js` = `{ projects: ['<rootDir>/apps/web'] }`. `apps/web/jest.config.js` uses `nextJest({ dir: __dirname })`. Root `npm test` = `jest`. The old fake smoke test survives as `apps/web` script `smoke`. | Contracts §4. `dir: './'` would resolve against the cwd and break when Jest runs from the root. |
| D7 | `apps/web/tsconfig.json` is **not** changed to extend `tsconfig.base.json`. The base exists for `packages/*` (Phase 2+). | Next rewrites its own tsconfig, and the app needs `moduleResolution: bundler`. |
| D8 | `tsconfig.base.json` uses `"module": "node16"` together with `"moduleResolution": "node16"`, plus `"types": ["node"]`. | TypeScript ≥ 5.2 rejects `module: commonjs` combined with `moduleResolution: node16` (TS5110), and the repo uses TS 6.0.3. `node16` still emits CommonJS for packages without `"type": "module"`. TS 6 defaults `types` to `[]`. **This deviates from contracts §4 and is reported.** |
| D9 | `packages/aegis/package.json` is `"private": true`, version `1.0.0`, with no `files`, `bin` or dependencies. | Nothing is published before Phase 7. Phase 1 owns the package contents and removes `private` when it starts `npm pack` testing. |
| D10 | `LICENSE` → `git mv` to `LICENSE-MIT` (keeps history and the holder "Copyright (c) 2024 Kairo Foundation"). A new `LICENSE` holds the dual-licence notice. `LICENSE-APACHE` is copied from a canonical copy already in `node_modules` and verified by SHA-256 (no download). | No network access needed. The hash is the canonical apache.org `LICENSE-2.0.txt`. |
| D11 | Commit order: plan docs → licence → **move** (pure `git mv` plus the workflow edit) → fix → README. | Contracts §8 (moves committed separately) together with contracts §2 (the workflow changes in the same commit as the moves). |
| D12 | `scripts/check-layout.js` is a committed layout guard (`npm run check:layout`). Later phases update its lists when they extract code. | Gives a repeatable "nothing was missed" check. |
| D13 | `scripts/skill-health.js` measures content age with `git log -1 -M --diff-filter=ACMT -- <new> <old>`. | Without this, the Phase 0 rename resets every skill's git age to "today" and silently inflates `recency`. |

---

## Preconditions

**Conventions for every command below**

- Run every command in **Git Bash**, from the repo root `C:\Users\Drupad\Deception engineering Skils\openskill`. Its parent folder `C:\Users\Drupad\Deception engineering Skils` is a **different** git repository: never run git there. If your shell does not keep the cwd between calls, prefix each command with `cd "/c/Users/Drupad/Deception engineering Skils/openskill" && `.
- Scratch notes go to `$HOME/aegis-phase0-baseline.txt` (outside both repos). In Node code, refer to the same folder as `require('os').homedir()`. Never use `/tmp` with Node: Git Bash and Windows Node resolve it to different folders.
- Never run `taskkill //IM node.exe`. The agent harness itself may be running on Node. Stop only the servers you started.

- [ ] **P1. USER ACTIONS 1 and 2 are done.** Ask the user in chat to confirm that the intel-sync scheduled task and the Skill Health workflow are paused (see USER ACTIONS). Do not continue until they confirm.
- [ ] **P2. Repo state.**
  ```bash
  git rev-parse --show-toplevel
  git checkout main && git fetch origin && git status -sb | head -1
  git rev-parse HEAD origin/main
  git status --porcelain
  ```
  Expected:
  - The toplevel ends in `/openskill`.
  - The status line is `## main...origin/main` with no `[ahead`/`behind`.
  - Both SHAs are identical (this plan was written against `ef6464a`; a newer SHA is fine if it is an intel or health bot commit).
  - `git status --porcelain` lists **only** untracked entries (`??`) under `docs/superpowers/plans/` and `graphify-out/`.

  If anything else appears, STOP.
- [ ] **P3. Branch** (contracts §8):
  ```bash
  git checkout -b restructure/phase-0-scaffold
  ```
- [ ] **P4. Tooling.**
  ```bash
  node -v && npm -v
  ```
  Expected: Node `v22.13.0` or newer (dev machine: `v24.11.0`), npm `10.x` or `11.x`.
- [ ] **P5. Stop running servers.** Stop any `next dev`, `next start` or `jest --watch` that you started in this session. Open handles on Windows make `git mv` and `npm ci` fail with `EPERM`/`Permission denied`.

### Baseline (Task 1 records it; required before any change)

| What | Command (repo root, before moving) | Recorded as |
|---|---|---|
| Jest | `npx jest 2>&1 \| tail -n 6` | the `Test Suites:` and `Tests:` lines |
| Build | `npx next build 2>&1 \| tail -n 25` | it succeeds, plus any warnings |
| Compile | `node bin/aegis.js compile 2>&1 \| tail -n 2` | `Compiled 24/24 skills` |
| Compile determinism | `git status --porcelain` after compile | the list of changed files (expected empty) |
| Skill content age | `git log -1 --format=%ct -- skills/compliance skills/mitre-attack` (each separately) | two epoch numbers |

---

## File Structure

### Moves (Task 4, `git mv`, 458 tracked files, all must show as `R100`)

| From (root) | To |
|---|---|
| `__tests__/` (24), `app/` (5), `bin/` (1), `components/` (6), `lib/` (52), `pages/` (11), `src/` (7), `styles/` (1), `supabase/` (3), `tests/` (22) | `apps/web/<same name>/` |
| `.env.local.example`, `.npmignore`, `jest.config.js`, `jest.setup.js`, `next-env.d.ts`, `next.config.js`, `package.json`, `postcss.config.js`, `run-supply-chain-fix.js`, `tailwind.config.js`, `tsconfig.json`, `tsconfig.tsbuildinfo` | `apps/web/<same name>` |
| `skills/` (313) | `packages/aegis/skills/` |
| `health.json` | `packages/aegis/health.json` |
| `LICENSE` (Task 3) | `LICENSE-MIT` |

**Stays at root:** `.claude/`, `.github/`, `.gitignore`, `.npmrc`, `README.md`, `docs/`, `scripts/`, `package-lock.json`.

**Plain `mv`, untracked and gitignored:** `.env.local` → `apps/web/.env.local`, `.intel-sync-state.json` → `packages/aegis/.intel-sync-state.json`. **Deleted:** the stale root `.next/` build cache (ignored).

### Created

- `LICENSE` (notice), `LICENSE-APACHE`, `SECURITY.md`
- `package.json` (root, private workspace manifest)
- `jest.config.js` (root passthrough)
- `tsconfig.base.json`
- `scripts/check-layout.js`
- `packages/aegis/package.json`
- `apps/web/lib/aegis-paths.js`
- `apps/web/tests/aegis-paths.test.js`

### Modified

- `package-lock.json` (regenerated by `npm install`; never deleted)
- `.gitignore`, `.claude/launch.json`, `.github/workflows/skill-health.yml`, `README.md`
- `scripts/{intel-sync,skill-health,compile-all}.js`
- `apps/web/package.json`, `apps/web/jest.config.js`, `apps/web/next.config.js`, `apps/web/.npmignore`
- `apps/web/lib/skill-reader.js`, `apps/web/lib/cli/{compile,intel-sync}.js`, `apps/web/lib/tools/installer.js`
- `apps/web/pages/index.js`, `apps/web/pages/skills/[name].js`, `apps/web/pages/api/health.js`

Not touched: `scripts/intel-routing.js`, and every test file other than the new one (fixtures resolve through `__dirname` and move with `tests/`).

---

## Tasks

### Task 1: Baseline — executor: haiku

**Files:** none (writes `$HOME/aegis-phase0-baseline.txt` only).

- [ ] **1.1** Run Jest and record the result:
  ```bash
  { echo "== jest"; npx jest 2>&1 | tail -n 6; } | tee "$HOME/aegis-phase0-baseline.txt"
  ```
  Expected: `Test Suites: 39 passed, 39 total` and `Tests: N passed, N total` (README says about 310). **If anything failed, STOP** (contracts §1.2) and report the failing suites.
- [ ] **1.2** Run the build:
  ```bash
  { echo "== build"; npx next build 2>&1 | tail -n 25; } | tee -a "$HOME/aegis-phase0-baseline.txt"
  ```
  Expected: the route table is printed with no `Failed to compile`. A warning about `serverExternalPackages` is pre-existing; note it and do not fix it.
- [ ] **1.3** Compile, then check what changed:
  ```bash
  { echo "== compile"; node bin/aegis.js compile 2>&1 | tail -n 2; echo "== status after compile+build"; git status --porcelain; } | tee -a "$HOME/aegis-phase0-baseline.txt"
  ```
  Expected: `Compiled 24/24 skills`. The status may show `M tsconfig.tsbuildinfo` and/or `M next-env.d.ts` (written by `next build`) and possibly files under `skills/*/artifacts/`. Record the list.
- [ ] **1.4** Restore the generated changes so the tree is clean:
  ```bash
  git checkout -- tsconfig.tsbuildinfo next-env.d.ts skills
  git status --porcelain
  ```
  Expected: only `??` lines (`docs/superpowers/plans/…`, `graphify-out/`).
- [ ] **1.5** Record the skill content age:
  ```bash
  { echo "== age"; git log -1 --format=%ct -- skills/compliance; git log -1 --format=%ct -- skills/mitre-attack; } | tee -a "$HOME/aegis-phase0-baseline.txt"
  ```
  Expected: two 10-digit epoch numbers.

No commit.

### Task 2: Commit the plan documents — executor: haiku

**Files:** `docs/superpowers/plans/2026-10-07-aegis-themis-restructure.md`, `docs/superpowers/plans/restructure/00-contracts.md`, `docs/superpowers/plans/restructure/phase-0-scaffold.md`.

- [ ] **2.1** Stage and commit only these three files:
  ```bash
  git add docs/superpowers/plans/2026-10-07-aegis-themis-restructure.md docs/superpowers/plans/restructure/00-contracts.md docs/superpowers/plans/restructure/phase-0-scaffold.md
  git status --porcelain | grep -v '^??'
  ```
  Expected: exactly three `A ` lines. Do not stage other plan files in that folder, or `2026-05-25-unified-aegis-cli.md`.
- [ ] **2.2** Commit:
  ```bash
  git commit -m "docs(plans): add aegis/themis restructure master plan, contracts and phase 0 plan"
  ```

### Task 3: Dual licence and SECURITY.md — executor: haiku

**Files:** `LICENSE` → `LICENSE-MIT` (mv); create `LICENSE`, `LICENSE-APACHE`, `SECURITY.md`; modify `package.json` (still at the root in this task) and `README.md`.

- [ ] **3.1** Move the MIT text so it keeps its history:
  ```bash
  git mv LICENSE LICENSE-MIT && head -3 LICENSE-MIT
  ```
  Expected: `MIT License`, an empty line, then `Copyright (c) 2024 Kairo Foundation`. Do not edit the file.
- [ ] **3.2** Copy the canonical Apache text and verify it:
  ```bash
  cp node_modules/next/dist/compiled/native-url/LICENSE LICENSE-APACHE
  sha256sum LICENSE-APACHE
  ```
  Expected hash: `cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30`. If it differs, try `node_modules/@google/generative-ai/LICENSE`. If that also differs, STOP. Check the hash only now: after a later checkout, `core.autocrlf=true` changes the line endings and the hash.
- [ ] **3.3** Create `LICENSE` with exactly this content:
  ```text
  Aegis Skills and Themis are dual-licensed under either of

    * Apache License, Version 2.0 (LICENSE-APACHE or https://www.apache.org/licenses/LICENSE-2.0)
    * MIT License (LICENSE-MIT or https://opensource.org/licenses/MIT)

  at your option.

  SPDX-License-Identifier: Apache-2.0 OR MIT

  Copyright (c) 2024 Kairo Foundation

  Unless you explicitly state otherwise, any contribution intentionally submitted
  for inclusion in this repository by you, as defined in the Apache-2.0 license,
  shall be dual licensed as above, without any additional terms or conditions.
  ```
- [ ] **3.4** Create `SECURITY.md` with exactly this content. The sentences from the user's source (`D:\Downloads\gemini-code-1791396535263.md`, verified identical to contracts §9) are kept verbatim; the table, the advisory link and the placeholder are additions required by contracts §9.
  ```markdown
  # Security Policy

  ## Supported Versions

  | Package | Version | Supported |
  |---|---|---|
  | `@aegis-skills/core` (current npm release) | 1.0.x | :white_check_mark: |
  | `@aegis-skills/core` | < 1.0 | :x: |
  | `aegis-skills`, `@aegis-skills/themis*` (restructured packages) | unreleased | fixes land on `main` |

  ## Reporting a Vulnerability

  We take the security of Aegis and Themis seriously. If you discover a security vulnerability or flaw in any of our skills, rules, or core modules, please disclose it responsibly.

  ### How to Report
  - **Private security advisory (preferred):** <https://github.com/drupadsachania/aegis-skills/security/advisories/new>
  - **Email:** Report security issues directly to the maintainers via email or private security advisory. <!-- USER: add security contact email -->
  - **Do NOT** open public GitHub issues for security vulnerabilities.

  ### Response Timeline
  - **Acknowledgement:** Within 48 hours.
  - **Assessment & Fix:** Targeted within 7 business days for critical flaws affecting execution boundaries or guardrails.
  ```
- [ ] **3.5** In the root `package.json`, replace `"license": "MIT",` with `"license": "(Apache-2.0 OR MIT)",`. Change nothing else.
- [ ] **3.6** Edit `README.md` in two places:
  - **Badge.** Replace the line `**Platform-agnostic AI skill compiler and multi-agent threat analysis — built for defenders.**` with that same line, followed by an empty line, followed by:
    ```
    [![License: Apache-2.0 OR MIT](https://img.shields.io/badge/license-Apache--2.0%20OR%20MIT-blue.svg)](#license)
    ```
  - **Licence section.** Replace the line `MIT © Drupad Sachania` (under `## License`) with:
    ```
    Licensed under either of [Apache License, Version 2.0](LICENSE-APACHE) or [MIT license](LICENSE-MIT) at your option (SPDX: `Apache-2.0 OR MIT`). See [LICENSE](LICENSE) and, for reporting vulnerabilities, [SECURITY.md](SECURITY.md).
    ```
- [ ] **3.7** Check the staged set:
  ```bash
  git add LICENSE LICENSE-APACHE LICENSE-MIT SECURITY.md package.json README.md && git status --porcelain | grep -v '^??'
  ```
  Expected: `R  LICENSE -> LICENSE-MIT`, `A  LICENSE`, `A  LICENSE-APACHE`, `A  SECURITY.md`, `M  README.md`, `M  package.json`. Git may instead show `M LICENSE` plus `A LICENSE-MIT`; both are acceptable.
- [ ] **3.8** Commit:
  ```bash
  git commit -m "chore(license): dual-license under Apache-2.0 OR MIT and add SECURITY.md"
  ```

### Task 4: The move commit (pure `git mv` + the skill-health workflow) — executor: sonnet

**Files:** every entry in the Moves table; `.github/workflows/skill-health.yml`.

- [ ] **4.1** Create the target folders:
  ```bash
  mkdir -p apps/web packages/aegis
  ```
- [ ] **4.2** Move the app directories. Run each line; each must print nothing.
  ```bash
  git mv __tests__ apps/web/__tests__
  git mv app apps/web/app
  git mv bin apps/web/bin
  git mv components apps/web/components
  git mv lib apps/web/lib
  git mv pages apps/web/pages
  git mv src apps/web/src
  git mv styles apps/web/styles
  git mv supabase apps/web/supabase
  git mv tests apps/web/tests
  ```
  If one fails with `Permission denied`, close whatever holds the folder and retry once. If it fails again, STOP.
- [ ] **4.3** Move the app files:
  ```bash
  git mv .env.local.example apps/web/.env.local.example
  git mv .npmignore apps/web/.npmignore
  git mv jest.config.js apps/web/jest.config.js
  git mv jest.setup.js apps/web/jest.setup.js
  git mv next-env.d.ts apps/web/next-env.d.ts
  git mv next.config.js apps/web/next.config.js
  git mv package.json apps/web/package.json
  git mv postcss.config.js apps/web/postcss.config.js
  git mv run-supply-chain-fix.js apps/web/run-supply-chain-fix.js
  git mv tailwind.config.js apps/web/tailwind.config.js
  git mv tsconfig.json apps/web/tsconfig.json
  git mv tsconfig.tsbuildinfo apps/web/tsconfig.tsbuildinfo
  ```
- [ ] **4.4** Move the skill pack:
  ```bash
  git mv skills packages/aegis/skills
  git mv health.json packages/aegis/health.json
  ```
- [ ] **4.5** Move the untracked local files (never `git add` them) and drop the stale cache:
  ```bash
  [ -f .env.local ] && mv .env.local apps/web/.env.local
  [ -f .intel-sync-state.json ] && mv .intel-sync-state.json packages/aegis/.intel-sync-state.json
  rm -rf .next
  ls -a
  ```
  Expected root listing: `.claude .git .github .gitignore .npmrc .swc LICENSE LICENSE-APACHE LICENSE-MIT README.md SECURITY.md apps docs graphify-out node_modules package-lock.json packages scripts`, possibly plus `test_output.txt` (ignored, leave it). Anything else, STOP.
- [ ] **4.6** Replace `.github/workflows/skill-health.yml` with exactly this content. Compared with today: Node 22, compile via `apps/web/bin/aegis.js`, `health.json` at `packages/aegis/health.json`.
  ```yaml
  name: Skill Health Check

  on:
    schedule:
      - cron: '0 0 * * 1'
    workflow_dispatch:

  permissions:
    contents: write
    pull-requests: write

  jobs:
    skill-health:
      name: Score skill health against ATT&CK + NVD
      runs-on: ubuntu-latest

      steps:
        - name: Checkout repository
          uses: actions/checkout@v4
          with:
            token: ${{ secrets.SKILL_HEALTH_PAT }}

        - name: Set up Node.js 22
          uses: actions/setup-node@v4
          with:
            node-version: '22'
            cache: 'npm'

        - name: Install dependencies
          run: npm ci

        - name: Compile all skills
          run: node apps/web/bin/aegis.js compile

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
            cat packages/aegis/health.json | node -e "
              const d=require('fs').readFileSync('/dev/stdin','utf8');
              const j=JSON.parse(d);
              Object.entries(j.skills).forEach(([k,v]) => {
                const badge = v['health-score']>=0.90?'🟢':v['health-score']>=0.75?'🟡':'🔴';
                console.log(badge+' '+k+': '+v['health-score']);
              });
            "

        - name: Commit updated health.json
          run: |
            git config user.name "github-actions[bot]"
            git config user.email "github-actions[bot]@users.noreply.github.com"
            git add packages/aegis/health.json
            # Always commit — the generated timestamp changes every run so there's always a diff
            git diff --staged --quiet || git commit -m "chore(health): update skill health scores [skip ci]"
            # Pull latest main before pushing to avoid non-fast-forward rejection
            git pull --rebase origin main
            git push origin main

        - name: Check for skills persistently below threshold
          id: threshold
          run: |
            # Only flag skills that have been below threshold for >= hysteresis-runs
            # consecutive runs (below-streak). A single noisy dip does not open a PR.
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
          run: |
            if [ -z "$GH_TOKEN" ]; then
              echo "SKILL_HEALTH_PAT secret not set — skipping PR creation"
              exit 0
            fi

            BRANCH="skill-health-update/${{ github.run_number }}"
            git checkout -b "$BRANCH" || git checkout "$BRANCH"
            git push -u origin "$BRANCH" 2>/dev/null || true

            printf "## Skill Health Alert\n\nThe following skills are below the **0.80 threshold**:\n\n**Failing skills:** %s\n\n### What to do\n\n1. Review \`packages/aegis/health.json\` for the specific gaps\n2. Update skill phases with newer ATT&CK techniques or patched CVEs\n3. Re-run \`node scripts/skill-health.js\` locally to verify\n4. Merge this PR\n\n---\n*Generated by skill-health workflow*\n" "$FAILING_SKILLS" > /tmp/pr_body.md

            gh pr create \
              --title "Skill health update required - skills below 0.80" \
              --body-file /tmp/pr_body.md \
              --base main \
              --head "$BRANCH" \
              --label "skill-health" \
              --label "automated" \
            && echo "PR created successfully" \
            || echo "PR already exists or branch has no changes vs main — skipping"
  ```
  (`/tmp` is correct here: this runs on the Ubuntu runner.)
- [ ] **4.7** Stage the workflow and verify the move:
  ```bash
  git add .github/workflows/skill-health.yml
  git diff --cached -M --name-status | grep -c '^R100'
  git diff --cached -M --name-status | grep -v '^R100'
  git status --porcelain | grep -v '^R  '
  ```
  Expected:
  - The first command prints exactly `458`.
  - The second prints exactly `M	.github/workflows/skill-health.yml`.
  - The third prints only `M  .github/workflows/skill-health.yml` and `??` lines (`graphify-out/`, untracked plan files).

  Any `R0xx` (not 100), `D`, `A` or other path: STOP.
- [ ] **4.8** Commit:
  ```bash
  git commit -m "refactor(repo): move web app to apps/web and skill pack to packages/aegis" -m "Pure git mv (458 renames) plus the skill-health workflow paths and Node 22, which must change with the moves. The tree does not build until the next commit, which fixes paths and adds the workspace manifests."
  ```

### Task 5: Workspace manifests and shared config — executor: sonnet

**Files:** create `package.json`, `jest.config.js`, `tsconfig.base.json`, `packages/aegis/package.json`; modify `apps/web/package.json`, `apps/web/jest.config.js`, `.gitignore`, `.claude/launch.json`, `apps/web/.npmignore`.

- [ ] **5.1** Create the root `package.json`:
  ```json
  {
    "name": "aegis-skills-monorepo",
    "version": "0.0.0",
    "private": true,
    "description": "Aegis security skill pack, Themis security-operations agent and the aegis-skills website.",
    "license": "(Apache-2.0 OR MIT)",
    "repository": {
      "type": "git",
      "url": "https://github.com/drupadsachania/aegis-skills"
    },
    "workspaces": [
      "packages/*",
      "apps/*"
    ],
    "engines": {
      "node": ">=22.13"
    },
    "scripts": {
      "dev": "npm run dev -w @aegis-skills/web",
      "build": "npm run build --workspaces --if-present",
      "start": "npm run start -w @aegis-skills/web",
      "test": "jest",
      "compile": "node apps/web/bin/aegis.js compile",
      "skill-health": "node scripts/skill-health.js",
      "intel-sync": "node apps/web/bin/aegis.js intel-sync",
      "check:layout": "node scripts/check-layout.js"
    },
    "devDependencies": {
      "jest": "^29.7.0"
    }
  }
  ```
- [ ] **5.2** Edit `apps/web/package.json`; change exactly these keys and keep all others, including every dependency and devDependency, unchanged:
  - `"name": "@aegis-skills/core"` → `"name": "@aegis-skills/web"`
  - Insert `"private": true,` directly after the `"version": "1.0.0",` line. **Keep version `1.0.0`**: `aegis --version` and the MCP server's reported version come from this file.
  - Delete the whole `"publishConfig": { "access": "public" },` block.
  - Change `"repository"` to:
    ```json
    { "type": "git", "url": "https://github.com/drupadsachania/aegis-skills", "directory": "apps/web" }
    ```
  - In `"scripts"`, rename the key `"test"` to `"smoke"` (same value) and add `"test": "jest",`.
  - Insert `"engines": { "node": ">=22.13" },` directly after the `"license"` line. The licence is already `(Apache-2.0 OR MIT)` from Task 3.

  Verify:
  ```bash
  node -e "const p=require('./apps/web/package.json');console.log(p.name,p.private,p.version,p.license,p.engines.node,p.scripts.test,!!p.scripts.smoke,!!p.publishConfig)"
  ```
  Expected: `@aegis-skills/web true 1.0.0 (Apache-2.0 OR MIT) >=22.13 jest true false`.
- [ ] **5.3** Create `packages/aegis/package.json`:
  ```json
  {
    "name": "aegis-skills",
    "version": "1.0.0",
    "private": true,
    "description": "Aegis: a content-only cybersecurity skill pack in the open Agent Skills format.",
    "license": "(Apache-2.0 OR MIT)",
    "author": "Kairo Foundation",
    "homepage": "https://aegis-skills.vercel.app/",
    "repository": {
      "type": "git",
      "url": "https://github.com/drupadsachania/aegis-skills",
      "directory": "packages/aegis"
    },
    "bugs": {
      "url": "https://github.com/drupadsachania/aegis-skills/issues"
    },
    "engines": {
      "node": ">=22.13"
    }
  }
  ```
- [ ] **5.4** Create the root `jest.config.js`:
  ```js
  // Root passthrough: `npx jest` / `npm test` at the repo root runs every workspace's
  // Jest project. Later phases append their packages (e.g. '<rootDir>/packages/themis-core').
  module.exports = {
    projects: ['<rootDir>/apps/web']
  }
  ```
- [ ] **5.5** In `apps/web/jest.config.js`, replace `const createJestConfig = nextJest({ dir: './' })` with:
  ```js
  // __dirname, not './': the root jest.config.js runs this project with cwd = repo root.
  const createJestConfig = nextJest({ dir: __dirname })
  ```
- [ ] **5.6** Create `tsconfig.base.json`. Nothing extends it in Phase 0 (see D7, D8).
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "lib": ["ES2023"],
      "module": "node16",
      "moduleResolution": "node16",
      "types": ["node"],
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "resolveJsonModule": true,
      "isolatedModules": true,
      "declaration": true,
      "sourceMap": true
    }
  }
  ```
  Verify it parses:
  ```bash
  node -e "JSON.parse(require('fs').readFileSync('tsconfig.base.json','utf8'));console.log('ok')"
  ```
  Expected: `ok`.
- [ ] **5.7** Append to `.gitignore` (after the last line):
  ```
  # graphify knowledge-graph output (local tooling, never committed)
  graphify-out/
  ```
  Verify:
  ```bash
  git status --porcelain | grep graphify
  ```
  Expected: no output.
- [ ] **5.8** In `.claude/launch.json`, replace the `aegis-prod` configuration's `"runtimeExecutable": "npx",` and `"runtimeArgs": ["next", "start", "-p", "3100"],` with:
  ```json
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "start", "-w", "@aegis-skills/web", "--", "-p", "3100"],
  ```
  Leave `aegis-dev` alone: root `npm run dev` still works.
- [ ] **5.9** In `apps/web/.npmignore`, replace these five lines:
  ```
  # Skill content MUST ship: SKILL.md is the compiler input and references/*.md are
  # the phase bodies. Without these, `aegis compile` fails and `aegis init` installs
  # artifacts with no source. The blanket *.md rule above would otherwise strip them.
  !skills/**/SKILL.md
  !skills/**/references/*.md
  ```
  with this single line:
  ```
  # Skill content moved to packages/aegis (restructure Phase 0); this app package is private.
  ```
  Then delete the line `!skills/`.

No commit yet (the fix commit happens in Task 8).

### Task 6: Path fixes in code — executor: sonnet

**Files:** create `apps/web/lib/aegis-paths.js` and `apps/web/tests/aegis-paths.test.js`; modify the files listed in the steps below.

- [ ] **6.1** Create `apps/web/lib/aegis-paths.js`:
  ```js
  'use strict'

  /**
   * Where the Aegis skill pack lives, as seen from the website (restructure Phase 0).
   *
   * The site reads skills from disk at runtime, and Next.js bundles this module, so
   * __dirname is unreliable here. Resolution uses process.cwd() instead:
   *   - cwd is apps/web (next dev/build/start, Vercel functions, jest inside apps/web)
   *       -> the repo root is two levels up;
   *   - any other cwd (root `npx jest` via projects, CLI started from the root)
   *       -> the cwd is the repo root.
   * AEGIS_PACKAGE_DIR overrides both. Uses `path` only, never `fs`: tests mock fs.
   */
  const path = require('path')

  function repoRoot () {
    const cwd = path.resolve(process.cwd())
    if (path.basename(cwd) === 'web' && path.basename(path.dirname(cwd)) === 'apps') {
      return path.resolve(cwd, '..', '..')
    }
    return cwd
  }

  function aegisDir () {
    if (process.env.AEGIS_PACKAGE_DIR) return path.resolve(process.env.AEGIS_PACKAGE_DIR)
    return path.join(repoRoot(), 'packages', 'aegis')
  }

  function skillsDir () { return path.join(aegisDir(), 'skills') }
  function healthFile () { return path.join(aegisDir(), 'health.json') }

  module.exports = { repoRoot, aegisDir, skillsDir, healthFile }
  ```
- [ ] **6.2** Create `apps/web/tests/aegis-paths.test.js`:
  ```js
  'use strict'

  const path = require('path')
  const { repoRoot, aegisDir, skillsDir, healthFile } = require('../lib/aegis-paths')

  describe('aegis-paths', () => {
    const realCwd = process.cwd
    afterEach(() => {
      process.cwd = realCwd
      delete process.env.AEGIS_PACKAGE_DIR
    })

    test('resolves the repo root when cwd is apps/web', () => {
      process.cwd = () => path.join(path.sep, 'repo', 'apps', 'web')
      const root = path.resolve(path.sep, 'repo')
      expect(repoRoot()).toBe(root)
      expect(skillsDir()).toBe(path.join(root, 'packages', 'aegis', 'skills'))
    })

    test('treats any other cwd as the repo root', () => {
      process.cwd = () => path.join(path.sep, 'repo')
      expect(healthFile()).toBe(path.join(path.resolve(path.sep, 'repo'), 'packages', 'aegis', 'health.json'))
    })

    test('AEGIS_PACKAGE_DIR overrides discovery', () => {
      process.env.AEGIS_PACKAGE_DIR = path.join(path.sep, 'elsewhere', 'aegis')
      expect(aegisDir()).toBe(path.resolve(path.sep, 'elsewhere', 'aegis'))
    })

    test('finds the real skill pack from the test cwd', () => {
      expect(require('fs').existsSync(path.join(skillsDir(), 'mitre-attack', 'SKILL.md'))).toBe(true)
    })
  })
  ```
- [ ] **6.3** `apps/web/lib/skill-reader.js`: two edits.
  - Replace `const SKILLS_DIR = path.join(process.cwd(), 'skills')` with:
    ```js
    const { skillsDir, healthFile } = require('./aegis-paths')

    const SKILLS_DIR = skillsDir()
    ```
  - Replace `    const healthPath = path.join(process.cwd(), 'health.json')` with `    const healthPath = healthFile()`.
- [ ] **6.4** `apps/web/pages/index.js` (inside `getStaticProps`): replace `    const healthPath = path.join(process.cwd(), 'health.json')` with:
  ```js
    const { healthFile } = require('../lib/aegis-paths')
    const healthPath = healthFile()
  ```
  Keep the `require` inside the function, as the file already does for `fs` and `path`, so nothing new reaches the client bundle.
- [ ] **6.5** `apps/web/pages/skills/[name].js` (inside `getStaticProps`): replace `  const skillDir = path.join(process.cwd(), 'skills', name, 'artifacts')` with:
  ```js
    const { skillsDir } = require('../../lib/aegis-paths')
    const skillDir = path.join(skillsDir(), name, 'artifacts')
  ```
- [ ] **6.6** `apps/web/pages/api/health.js`:
  - Replace `const path = require('path')` with `const { healthFile } = require('../../lib/aegis-paths')`.
  - Replace `    const healthPath = path.join(process.cwd(), 'health.json')` with `    const healthPath = healthFile()`.

  Leave the 404 message text as is.
- [ ] **6.7** `apps/web/lib/cli/compile.js`: replace `  const skillsDir = path.join(__dirname, '..', '..', 'skills')` with:
  ```js
    // apps/web/lib/cli -> repo root is four levels up
    const skillsDir = path.join(__dirname, '..', '..', '..', '..', 'packages', 'aegis', 'skills')
  ```
- [ ] **6.8** `apps/web/lib/tools/installer.js`: replace `const SKILLS_DIR = path.join(__dirname, '..', '..', 'skills')` with:
  ```js
  // apps/web/lib/tools -> repo root is four levels up
  const SKILLS_DIR = path.join(__dirname, '..', '..', '..', '..', 'packages', 'aegis', 'skills')
  ```
- [ ] **6.9** `apps/web/lib/cli/intel-sync.js`: two edits.
  - Replace `const ROOT = path.join(__dirname, '..', '..')` with:
    ```js
    // Repo root (apps/web/lib/cli -> four levels up): scripts/ lives there, not in apps/web.
    const ROOT = path.join(__dirname, '..', '..', '..', '..')
    ```
  - Replace `      await run('bin/aegis.js', ['compile'])` with `      await run('apps/web/bin/aegis.js', ['compile'])`.
- [ ] **6.10** `scripts/intel-sync.js`: three edits.
  - Replace `const SKILLS_DIR = path.join(REPO_ROOT, 'skills')` with `const SKILLS_DIR = path.join(REPO_ROOT, 'packages', 'aegis', 'skills')`.
  - Replace `const STATE_FILE = path.join(REPO_ROOT, '.intel-sync-state.json')` with `const STATE_FILE = path.join(REPO_ROOT, 'packages', 'aegis', '.intel-sync-state.json')`.
  - Replace ``Run \`node bin/aegis.js compile\` to rebuild artifacts.`` with ``Run \`node apps/web/bin/aegis.js compile\` to rebuild artifacts.``
- [ ] **6.11** `scripts/skill-health.js`: two edits.
  - Replace these two lines:
    ```js
    const SKILLS_DIR = path.join(process.cwd(), 'skills')
    const HEALTH_FILE = path.join(process.cwd(), 'health.json')
    ```
    with:
    ```js
    // Repo-level script: paths are anchored to the repo root, not the caller's cwd.
    const REPO_ROOT = path.join(__dirname, '..')
    const SKILLS_DIR = path.join(REPO_ROOT, 'packages', 'aegis', 'skills')
    const HEALTH_FILE = path.join(REPO_ROOT, 'packages', 'aegis', 'health.json')
    // Pre-monorepo skill location, kept in the git pathspec so a skill's content age
    // survives the Phase 0 move (a pure rename is not a content change).
    const LEGACY_SKILLS_DIR = path.join(REPO_ROOT, 'skills')
    ```
  - In `gitLastCommitAgeDays`, replace the line `    execFile('git', ['log', '-1', '--format=%ct', '--', skillDir], { cwd: process.cwd() }, (err, stdout) => {` with:
    ```js
        // -M + --diff-filter=ACMT skips commits that only renamed files (status R),
        // so the monorepo move does not reset every skill's age to "today".
        const legacyDir = path.join(LEGACY_SKILLS_DIR, path.basename(skillDir))
        const args = ['log', '-1', '-M', '--diff-filter=ACMT', '--format=%ct', '--', skillDir, legacyDir]
        execFile('git', args, { cwd: REPO_ROOT }, (err, stdout) => {
    ```
- [ ] **6.12** `scripts/compile-all.js`: two edits.
  - Replace `const { compile } = require('../src/compiler')` with `const { compile } = require('../apps/web/src/compiler')`.
  - Replace `  const skillsDir = path.join(__dirname, '..', 'skills')` with `  const skillsDir = path.join(__dirname, '..', 'packages', 'aegis', 'skills')`.
- [ ] **6.13** Replace all of `apps/web/next.config.js` up to and including the `serverExternalPackages: [` line with the block below. Everything from the first package name (`'@anthropic-ai/sdk',`) to the end of the file stays exactly as it is.
  ```js
  const path = require('path')

  // The skill pack lives outside this app (packages/aegis) and lib/skill-reader.js
  // reads it from disk at runtime, so it must be copied into every server bundle.
  // Globs are relative to this directory (apps/web).
  const AEGIS_RUNTIME_FILES = [
    '../../packages/aegis/skills/**/SKILL.md',
    '../../packages/aegis/skills/**/skill.json',
    '../../packages/aegis/skills/**/references/*.md',
    '../../packages/aegis/health.json'
  ]

  /** @type {import('next').NextConfig} */
  const nextConfig = {
    experimental: {
      // Next 14 reads these under `experimental` only (top-level from Next 15).
      outputFileTracingRoot: path.join(__dirname, '..', '..'),
      outputFileTracingIncludes: {
        '/**': AEGIS_RUNTIME_FILES
      }
    },
    serverExternalPackages: [
  ```
- [ ] **6.14** Check that no stale path references remain:
  ```bash
  grep -rn "process.cwd(), 'skills'\|process.cwd(), 'health.json'\|'\.\.', '\.\.', 'skills'\|'\.\.', 'skills')\|'\.\./src/compiler'\|run('bin/aegis.js'" apps/web/lib apps/web/pages apps/web/app scripts
  ```
  Expected: no output.

No commit yet.

### Task 7: Install and regenerate the lockfile — executor: sonnet

**Files:** `package-lock.json` (generated). **Do not delete `package-lock.json`.** Deleting it re-resolves every `^` range and can drop other-platform optional binaries on Windows. Do not use `--force`, `npm update` or `npm dedupe`.

- [ ] **7.1** Save the old lockfile for comparison:
  ```bash
  git show HEAD:package-lock.json > "$HOME/aegis-phase0-old-lock.json"
  ```
- [ ] **7.2** Install against the existing `node_modules` (no deletion):
  ```bash
  npm install 2>&1 | tail -n 5
  ```
  Expected: finishes without `ERR!`, for example `added 2 packages` / `up to date`, plus an audit summary. The two "packages" are the workspace junctions `node_modules/@aegis-skills/web` and `node_modules/aegis-skills`.
- [ ] **7.3** Compare the lockfiles:
  ```bash
  node -e '
  const fs=require("fs"),os=require("os");
  const O=JSON.parse(fs.readFileSync(os.homedir()+"/aegis-phase0-old-lock.json","utf8")).packages;
  const N=JSON.parse(fs.readFileSync("package-lock.json","utf8")).packages;
  const ws=new Set(["","apps/web","packages/aegis","node_modules/@aegis-skills/web","node_modules/aegis-skills"]);
  const out=[];
  for (const k of Object.keys(O)) { if (ws.has(k)) continue; if (!N[k]) out.push("removed "+k); else if (N[k].version!==O[k].version) out.push(k+" "+O[k].version+" -> "+N[k].version); }
  for (const k of Object.keys(N)) if (!O[k] && !ws.has(k)) out.push("added "+k);
  for (const k of ws) if (!N[k]) out.push("missing "+JSON.stringify(k));
  for (const k of ["node_modules/@next/swc-linux-x64-gnu","node_modules/better-sqlite3"]) if (!N[k]) out.push("missing "+k);
  console.log(N[""].name, JSON.stringify(N[""].workspaces));
  console.log(out.length ? out.join("\n") : "LOCK OK: only workspace entries changed");'
  ```
  Expected: `aegis-skills-monorepo ["packages/*","apps/*"]`, then `LOCK OK: only workspace entries changed`. Any other line: STOP and report it.
- [ ] **7.4** Clean reinstall, which proves `npm ci` works the way CI and Vercel run it. It deletes and rebuilds `node_modules`, including the native `better-sqlite3` (prebuilt binary download):
  ```bash
  npm ci 2>&1 | tail -n 5
  ```
  Expected: `added N packages`, with no `ERR!`.
  - `EPERM`/`EBUSY` on a `.node` file: a process still holds it. Ask the user to close editors or terminals using the repo, then rerun once.
  - `gyp`/`prebuild-install` errors: STOP (USER ACTION: build tools or network).
- [ ] **7.5** Native module and workspace links:
  ```bash
  node -e "const D=require('better-sqlite3');const d=new D(':memory:');console.log('sqlite', d.prepare('select 1 as x').get().x);d.close()"
  npm ls --workspaces --depth=0 2>&1 | head -n 5
  ```
  Expected: `sqlite 1`, and the workspace tree lists `@aegis-skills/web@1.0.0 -> .\apps\web` and `aegis-skills@1.0.0 -> .\packages\aegis` with no `ERR!`/`invalid`.

### Task 8: Verify everything, then the fix commit — executor: sonnet

**Files:** create `scripts/check-layout.js`; nothing else new.

- [ ] **8.1** Create `scripts/check-layout.js`:
  ```js
  #!/usr/bin/env node
  'use strict'

  /**
   * Layout guard for the Aegis/Themis monorepo (restructure Phase 0; later phases update the lists).
   *   node scripts/check-layout.js          files, git-tracked paths, package manifests
   *   node scripts/check-layout.js --trace  also the apps/web/.next trace files (after `next build`)
   * Prints every problem and exits 1 on failure.
   */
  const fs = require('fs')
  const path = require('path')
  const { execFileSync } = require('child_process')

  const ROOT = path.join(__dirname, '..')
  const at = p => path.join(ROOT, p)
  const problems = []

  const MUST_EXIST = [
    'package.json', 'package-lock.json', 'jest.config.js', 'tsconfig.base.json',
    'LICENSE', 'LICENSE-APACHE', 'LICENSE-MIT', 'SECURITY.md', 'README.md',
    '.github/workflows/skill-health.yml',
    'scripts/intel-sync.js', 'scripts/intel-routing.js', 'scripts/skill-health.js', 'scripts/compile-all.js',
    'packages/aegis/package.json', 'packages/aegis/health.json', 'packages/aegis/skills',
    'apps/web/package.json', 'apps/web/next.config.js', 'apps/web/jest.config.js', 'apps/web/jest.setup.js',
    'apps/web/tsconfig.json', 'apps/web/next-env.d.ts', 'apps/web/postcss.config.js', 'apps/web/tailwind.config.js',
    'apps/web/bin/aegis.js', 'apps/web/lib/skill-reader.js', 'apps/web/lib/aegis-paths.js',
    'apps/web/lib/mcp/aegis-server.js', 'apps/web/lib/themis/index.ts', 'apps/web/src/compiler.js',
    'apps/web/app/api/mcp/route.ts', 'apps/web/pages/index.js', 'apps/web/components/Layout.js',
    'apps/web/styles/globals.css', 'apps/web/supabase/migrations', 'apps/web/__tests__/mcp/aegis-server.test.ts',
    'apps/web/tests/fixtures/test-skill/SKILL.md'
  ]
  const MUST_NOT_EXIST = [
    'skills', 'lib', 'src', 'app', 'pages', 'components', 'styles', 'bin', 'supabase', 'tests', '__tests__',
    'health.json', '.intel-sync-state.json', 'next.config.js', 'tsconfig.json', 'postcss.config.js',
    'tailwind.config.js', 'jest.setup.js', 'next-env.d.ts', 'run-supply-chain-fix.js', '.npmignore', 'tsconfig.tsbuildinfo'
  ]
  const TRACKED_TOP = new Set([
    '.claude', '.github', '.gitignore', '.npmrc', 'LICENSE', 'LICENSE-APACHE', 'LICENSE-MIT', 'SECURITY.md',
    'README.md', 'package.json', 'package-lock.json', 'jest.config.js', 'tsconfig.base.json',
    'apps', 'packages', 'scripts', 'docs'
  ])
  const PACKAGES = [
    ['package.json', 'aegis-skills-monorepo'],
    ['apps/web/package.json', '@aegis-skills/web'],
    ['packages/aegis/package.json', 'aegis-skills']
  ]

  for (const p of MUST_EXIST) if (!fs.existsSync(at(p))) problems.push(`missing: ${p}`)
  for (const p of MUST_NOT_EXIST) if (fs.existsSync(at(p))) problems.push(`should have moved: ${p}`)

  const skillsDir = at('packages/aegis/skills')
  const skills = fs.existsSync(skillsDir)
    ? fs.readdirSync(skillsDir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name)
    : []
  if (skills.length !== 24) problems.push(`expected 24 skills in packages/aegis/skills, found ${skills.length}`)
  for (const s of skills) {
    for (const f of ['SKILL.md', 'skill.json', 'artifacts/system-prompt.txt']) {
      if (!fs.existsSync(path.join(skillsDir, s, f))) problems.push(`missing: packages/aegis/skills/${s}/${f}`)
    }
  }

  const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean)
  const stray = tracked.filter(f => !TRACKED_TOP.has(f.split('/')[0]))
  for (const f of stray.slice(0, 20)) problems.push(`unexpected tracked path: ${f}`)
  if (stray.length > 20) problems.push(`…and ${stray.length - 20} more unexpected tracked paths`)
  if (tracked.some(f => f.startsWith('graphify-out/'))) problems.push('graphify-out/ must not be tracked')

  for (const [file, name] of PACKAGES) {
    let j = {}
    try { j = JSON.parse(fs.readFileSync(at(file), 'utf8')) } catch (e) { problems.push(`unreadable: ${file}`); continue }
    if (j.name !== name) problems.push(`${file}: name should be ${name}, is ${j.name}`)
    if (j.license !== '(Apache-2.0 OR MIT)') problems.push(`${file}: license should be (Apache-2.0 OR MIT)`)
    if (!j.engines || j.engines.node !== '>=22.13') problems.push(`${file}: engines.node should be >=22.13`)
    if (file === 'package.json') {
      if (j.private !== true) problems.push('root package.json must be private')
      if (JSON.stringify(j.workspaces) !== JSON.stringify(['packages/*', 'apps/*'])) problems.push('root workspaces must be ["packages/*","apps/*"]')
    }
  }

  const trace = process.argv.includes('--trace')
  if (trace) {
    const WANT = ['packages/aegis/skills/mitre-attack/SKILL.md', 'packages/aegis/skills/mitre-attack/skill.json', 'packages/aegis/health.json']
    for (const t of ['pages/index.js', 'pages/api/skills.js', 'pages/api/health.js', 'app/api/mcp/route.js']) {
      const f = at(`apps/web/.next/server/${t}.nft.json`)
      if (!fs.existsSync(f)) { problems.push(`missing trace file: apps/web/.next/server/${t}.nft.json`); continue }
      const files = JSON.parse(fs.readFileSync(f, 'utf8')).files.map(x => x.replace(/\\/g, '/'))
      for (const w of WANT) if (!files.some(x => x.endsWith(w))) problems.push(`${t}.nft.json does not include ${w}`)
      if (!files.some(x => /packages\/aegis\/skills\/[^/]+\/references\/[^/]+\.md$/.test(x))) problems.push(`${t}.nft.json includes no references/*.md`)
    }
  }

  if (problems.length) {
    console.error(`Layout check FAILED (${problems.length}):`)
    for (const p of problems) console.error('  - ' + p)
    process.exit(1)
  }
  console.log(`Layout check passed${trace ? ' (with trace)' : ''}: ${skills.length} skills, ${tracked.length} tracked files.`)
  ```
- [ ] **8.2** Stage everything so the tracked-path check sees the new files, then run the layout check:
  ```bash
  git add -A
  git status --porcelain | grep -E '\.env|graphify|node_modules|\.next/|intel-sync-state' ; node scripts/check-layout.js
  ```
  Expected: the `grep` prints nothing, and the check prints `Layout check passed: 24 skills, <n> tracked files.` If `.env.local` or another forbidden path got staged, run `git restore --staged <path>` and STOP to report it.
- [ ] **8.3** Jest from `apps/web`:
  ```bash
  (cd apps/web && npx jest 2>&1 | tail -n 6)
  ```
  Expected: `Test Suites: 40 passed, 40 total` (baseline + 1) and `Tests: N+4 passed` (baseline N + 4).
- [ ] **8.4** Jest from the root, through the projects passthrough:
  ```bash
  npm test 2>&1 | tail -n 6
  ```
  Expected: the same counts as 8.3.
- [ ] **8.5** Compile through the moved CLI:
  ```bash
  node apps/web/bin/aegis.js --version && node apps/web/bin/aegis.js compile 2>&1 | tail -n 1 && node scripts/compile-all.js 2>&1 | tail -n 1
  git status --porcelain packages/aegis/skills
  ```
  Expected:
  - `1.0.0`
  - `Compiled 24/24 skills`
  - `Done: 24 compiled, 0 failed`
  - The status lists the same files as the baseline in 1.3 (with `packages/aegis/` prefixed); normally empty.

  If the list differs from the baseline, STOP.
- [ ] **8.6** Old smoke script and MCP stdio entry:
  ```bash
  npm run smoke -w @aegis-skills/web 2>&1 | tail -n 2
  ```
  Expected: last line `Basic tests passed`.
- [ ] **8.7** Build and check the trace files:
  ```bash
  npm run build 2>&1 | tail -n 25
  node scripts/check-layout.js --trace
  ```
  Expected:
  - The build succeeds, with the same route table as the baseline (`/`, `/skills/[name]` with 24 SSG paths, `/api/*`, `/api/mcp`) and no new warnings beyond the baseline.
  - The check prints `Layout check passed (with trace)…`.

  If a trace lacks the skill files, STOP. Do not try other glob syntaxes; report the `files` array of `apps/web/.next/server/pages/api/skills.js.nft.json`.
- [ ] **8.8** Production server smoke test. Start it in the background:
  ```bash
  npm run start -w @aegis-skills/web -- -p 3100
  ```
  When it logs `Ready`, run:
  ```bash
  curl -s http://localhost:3100/api/skills | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log('skills',JSON.parse(s).skills.length))"
  curl -s http://localhost:3100/api/health | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log('health',Object.keys(JSON.parse(s).skills).length))"
  curl -s -o /dev/null -w "skill page %{http_code}\n" http://localhost:3100/skills/mitre-attack
  curl -s -X POST http://localhost:3100/api/mcp -H "content-type: application/json" -H "accept: application/json, text/event-stream" -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_skill_phase","arguments":{"name":"mitre-attack","phase":"0"}}}' | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s).result;console.log('mcp isError='+!!r.isError,'chars='+r.content[0].text.length)})"
  ```
  Expected:
  - `skills 24`
  - `health 24`
  - `skill page 200`
  - `mcp isError=false chars=<a number above 500>`

  Then stop the server you started (its background task, or Ctrl+C).
- [ ] **8.9** Skill-health writes to the new location and keeps content age:
  ```bash
  git log -1 -M --diff-filter=ACMT --format=%ct -- packages/aegis/skills/compliance skills/compliance
  git log -1 -M --diff-filter=ACMT --format=%ct -- packages/aegis/skills/mitre-attack skills/mitre-attack
  ```
  Expected: exactly the two epoch numbers recorded in baseline 1.5. If either equals the move commit's time (`git log -1 --format=%ct HEAD`), STOP.

  Then run the script:
  ```bash
  node scripts/skill-health.js 2>&1 | tail -n 3; ls health.json 2>/dev/null; git status --porcelain packages/aegis/health.json
  ```
  Expected:
  - `Wrote health.json with 24 skills`
  - `ls` prints nothing (no root `health.json`)
  - the status shows `M packages/aegis/health.json`

  If the script fails with an HTTP or network error, record "skill-health not verified locally (network)" for the PR body and continue. Any other error: STOP.

  Restore the file:
  ```bash
  git checkout -- packages/aegis/health.json
  ```
- [ ] **8.10** Intel-sync dry run (writes nothing):
  ```bash
  node apps/web/bin/aegis.js intel-sync --dry-run --days 7 2>&1 | tail -n 4
  ```
  Expected: the last line is `(dry run — nothing written)`, with no `unknown skill in routing table` and no `ENOENT`. If it says the corpus directory is missing, that is fine (the corpus lives on the user's machine).
- [ ] **8.11** Restore build by-products, restage, and review the staged set:
  ```bash
  git checkout -- apps/web/tsconfig.tsbuildinfo apps/web/next-env.d.ts 2>/dev/null; git add -A
  git status --porcelain | grep -v '^??'
  ```
  Expected, exactly:
  - `M`: `.claude/launch.json`, `.gitignore`, `package-lock.json`, `apps/web/.npmignore`, `apps/web/jest.config.js`, `apps/web/next.config.js`, `apps/web/package.json`, `apps/web/lib/skill-reader.js`, `apps/web/lib/cli/compile.js`, `apps/web/lib/cli/intel-sync.js`, `apps/web/lib/tools/installer.js`, `apps/web/pages/index.js`, `apps/web/pages/skills/[name].js`, `apps/web/pages/api/health.js`, `scripts/compile-all.js`, `scripts/intel-sync.js`, `scripts/skill-health.js`
  - `A`: `package.json`, `jest.config.js`, `tsconfig.base.json`, `scripts/check-layout.js`, `packages/aegis/package.json`, `apps/web/lib/aegis-paths.js`, `apps/web/tests/aegis-paths.test.js`

  Anything else: unstage it and STOP to report.
- [ ] **8.12** Commit:
  ```bash
  git commit -m "refactor(repo): convert to npm workspaces and fix paths for the new layout" -m "Root becomes the private aegis-skills-monorepo workspace (packages/*, apps/*). apps/web resolves the skill pack via lib/aegis-paths.js; Vercel traces packages/aegis skill files via experimental.outputFileTracingIncludes. scripts/ stay at the repo root with __dirname-anchored paths; skill-health ignores pure renames when computing content age. Adds tsconfig.base.json, root Jest passthrough and scripts/check-layout.js."
  ```

### Task 9: README layout — executor: haiku

**Files:** `README.md`.

- [ ] **9.1** Replace ``After compilation, three artifacts are generated in `skills/<name>/artifacts/`:`` with ``After compilation, three artifacts are generated in `packages/aegis/skills/<name>/artifacts/`:``.
- [ ] **9.2** In `## Development`, make two replacements:
  - `cp .env.local.example .env.local   # add at least one LLM key` → `cp apps/web/.env.local.example apps/web/.env.local   # add at least one LLM key`
  - `npm test                            # 310 tests` → `npm test                            # Jest across all workspaces`
- [ ] **9.3** Under `## Project structure`, replace everything between the opening ```` ``` ```` and the closing ```` ``` ```` with:
  ```
  ├── apps/web/                  # Next.js site + API, Themis engine (until Phases 2–4), aegis CLI
  │   ├── app/api/               # App Router: themis, audit, exposure, mcp
  │   ├── bin/aegis.js           # aegis CLI
  │   ├── lib/                   # skill-reader, MCP server, Themis engine (lib/themis)
  │   ├── pages/                 # Pages Router (Aegis UI + API)
  │   └── src/                   # skill compiler
  ├── packages/aegis/            # Aegis skill pack (content only)
  │   ├── skills/                # 24 skills: SKILL.md, references/, skill.json, artifacts/
  │   └── health.json            # weekly skill-health scores
  ├── scripts/                   # repo jobs: skill-health, intel-sync, compile-all, check-layout
  ├── docs/                      # technical documentation and plans
  └── .github/workflows/         # weekly skill-health job
  ```
- [ ] **9.4** Commit:
  ```bash
  git add README.md && git commit -m "docs(readme): describe the monorepo layout"
  ```

### Task 10: Push and open the PR — executor: haiku

- [ ] **10.1** Check whether `main` moved:
  ```bash
  git fetch origin && git rev-list --count HEAD..origin/main
  ```
  - `0`: go to 10.2.
  - Otherwise: `git rebase origin/main`.
    - For each `CONFLICT (file location)` that mentions `skills/...` or `health.json`, run `git mv <path-git-shows> packages/aegis/<same-relative-path>` (for `health.json`, accept the incoming content with `git checkout --theirs packages/aegis/health.json`), then `git add` it and `git rebase --continue`.
    - Any other conflict type: `git rebase --abort` and STOP.
    - After a rebase, rerun 8.2 (`node scripts/check-layout.js`) and 8.4.
- [ ] **10.2** Push:
  ```bash
  git push -u origin restructure/phase-0-scaffold
  ```
  If authentication fails, STOP (USER ACTION).
- [ ] **10.3** Write the PR body to `$HOME/aegis-phase0-pr-body.md`. Replace the two bracketed values with the numbers from 1.1 and 8.4.
  ```markdown
  Phase 0 of the Aegis/Themis restructure (docs/superpowers/plans/restructure/phase-0-scaffold.md). No behaviour change.

  - npm workspaces: root `aegis-skills-monorepo` (private), `apps/web` (`@aegis-skills/web`, the unchanged site/CLI/Themis), `packages/aegis` (`aegis-skills`, skill content + health.json).
  - Dual licence `Apache-2.0 OR MIT` (LICENSE, LICENSE-APACHE, LICENSE-MIT) and SECURITY.md.
  - skill-health workflow moved to Node 22 and the new paths (same commit as the moves).
  - Tests: baseline [baseline Tests line] → now [new Tests line] (+1 suite, +4 tests for lib/aegis-paths.js).

  **Merge with "Create a merge commit" (not squash)** so the pure-rename commit keeps history/blame. The move commit alone does not build; the next commit fixes it.

  Before merging: Vercel Root Directory must be `apps/web` and the preview verified (see USER ACTIONS in the plan). Keep the intel-sync task and the skill-health workflow paused until production is verified.
  ```
- [ ] **10.4** Open the PR:
  ```bash
  gh auth status
  ```
  - If logged in:
    ```bash
    gh pr create --base main --head restructure/phase-0-scaffold --title "refactor: Phase 0 — monorepo scaffold (npm workspaces, dual licence)" --body-file "$HOME/aegis-phase0-pr-body.md"
    ```
  - If not logged in: give the user `https://github.com/drupadsachania/aegis-skills/compare/main...restructure/phase-0-scaffold?expand=1` and the body file path, then STOP.
- [ ] **10.5** STOP. Hand over to the USER ACTIONS, from step 4 onward.

---

## Caveats & Pitfalls

- **Wrong repository.** The parent folder `Deception engineering Skils` is its own git repository, and `openskill/` shows there as untracked. Running git one level up silently acts on the wrong repo. `git rev-parse --show-toplevel` must end in `/openskill`.
- **The move commit is red on purpose.** Contracts §8 (moves committed separately) and §2 (the workflow updates with the moves) take precedence over "every commit builds". Never cherry-pick or revert the move commit on its own.
- **Next 14 config keys.** `outputFileTracingRoot` and `outputFileTracingIncludes` at the top level are silently ignored by Next 14.2. The top-level `serverExternalPackages` is likewise a Next 15 key that Next 14 ignores. That is pre-existing; leave it alone (changing it changes bundling).
- **`process.cwd()` resolution.** It works for Next dev/build/start, Vercel (functions run with cwd = the app directory inside the trace root), Jest from either location, and CLI runs started from the repo root. `aegis mcp` launched from an unrelated folder still cannot find skills. That is pre-existing behaviour, fixed in Phase 1. Do not "fix" it with `__dirname` in `skill-reader.js`: it breaks once bundled.
- **`fs` is mocked in `tests/skill-reader.test.js`.** Its mock contains only `promises.{readdir,readFile,realpath}`. Anything that `skill-reader.js` loads must not call `fs` at module load. This is why `aegis-paths.js` uses `path` only.
- **Lockfile on Windows.** Keep the existing lock. Regenerating it from scratch on Windows can drop Linux optional binaries (`@next/swc-linux-x64-gnu`), which breaks CI and Vercel. Check 7.3 guards against this. `npm ci` rebuilds `better-sqlite3`, which Themis still uses in this phase. It needs network access for the prebuilt binary, and fails with `EPERM` if any process has the `.node` file loaded.
- **`core.autocrlf=true`.** Verify the `LICENSE-APACHE` hash right after copying it, never after a checkout.
- **Build by-products.** `next build` rewrites the tracked `apps/web/tsconfig.tsbuildinfo`, and sometimes `next-env.d.ts`. Restore them before committing (8.11). Do not untrack them in this phase.
- **Untracked local state.** `.env.local` and `.intel-sync-state.json` are moved with plain `mv` and must never be staged. 8.2 checks this.
- **Skill-health content age.** `git log -- <dir>` counts the rename commit as a change. The `-M --diff-filter=ACMT` pathspec over both old and new paths fixes this, and 8.9 proves it. CI checks out shallow (`fetch-depth: 1`), so CI recency has always meant "age of HEAD". That is pre-existing; do not change `fetch-depth` here.
- **Bots during the transition.** The local intel-sync task (Saturday ~09:23 IST) runs `node bin/aegis.js intel-sync` and stages `skills/ health.json scripts/`. The GitHub workflow (Monday 00:00 UTC) commits `health.json` to `main`. Either one running on `main` before the merge, or with old paths after it, breaks or conflicts. Both are paused before Task 1 and re-enabled only after production is verified.
- **Vercel ordering.** Changing Root Directory to `apps/web` affects the next build of every branch, including `main`. Production keeps serving the last successful deployment, so a failed `main` build does not take the site down. Change the setting only after the PR exists, and merge soon after.
- **graphify.** If you run `graphify update .`, its output in `graphify-out/` is now gitignored. Never force-add it.

## STOP conditions (in addition to contracts §1)

1. P2 shows a dirty tree, an unexpected branch state, or `main` diverged from `origin/main`.
2. The user has not confirmed that USER ACTIONS 1–2 (bots paused) are done.
3. 4.7 does not show exactly 458 `R100` renames plus the one workflow `M`.
4. 7.3 prints anything other than `LOCK OK`; or `npm ci` fails twice; or `better-sqlite3` does not load.
5. The Jest counts in 8.3 or 8.4 are not exactly baseline +1 suite / +4 tests, all passing.
6. `check-layout.js` (with or without `--trace`) fails.
7. Compile is not 24/24, or produces a different changed-file list than the baseline.
8. The content-age numbers in 8.9 differ from baseline 1.5.
9. Any step would stage `.env*`, `graphify-out/`, `node_modules/`, `.next/`, `*.tgz` or `.intel-sync-state.json`.
10. A rebase in 10.1 hits a conflict other than `file location`.
11. Push or PR creation needs credentials that are not already configured.

## USER ACTIONS

1. **Pause the local intel-sync task (before Task 1).** In Claude desktop → Scheduled tasks → `aegis-weekly-intel-sync` → toggle **Enabled** off. Alternatively, ask Claude: "disable the aegis-weekly-intel-sync scheduled task". Its next run is Saturday 2026-10-10 at about 09:23 local time.
2. **Pause the Skill Health workflow (before Task 1).** GitHub → `drupadsachania/aegis-skills` → **Actions** → **Skill Health Check** → **⋯** → **Disable workflow**. Its next run is Monday 2026-10-12 00:00 UTC.
3. **GitHub CLI login (before Task 10)**, if you want the executor to open the PR: run `gh auth login` in Git Bash and choose GitHub.com → HTTPS → browser. Otherwise open the compare URL the executor prints.
4. **Licence holder.** `LICENSE` names "Kairo Foundation" (2024) while the README said "© Drupad Sachania". Confirm Kairo Foundation is correct and that you may relicense; all commits are yours or the health bot's. If the holder is wrong, change the one line in `LICENSE` and `LICENSE-MIT` on the branch before merging.
5. **Security contact.**
   - Replace `<!-- USER: add security contact email -->` in `SECURITY.md` with your address.
   - Enable private reporting: GitHub → **Settings** → **Advanced Security** (on some accounts **Code security**) → **Private vulnerability reporting** → **Enable**. Without this, the advisory link in `SECURITY.md` does not work for reporters.
6. **Vercel (after the PR exists, before merging):**
   1. Vercel dashboard → project **aegis-skills** → **Settings** → **Build and Deployment**.
   2. **Root Directory**: `apps/web` → **Save**.
   3. In the same section, confirm **Include files outside of the Root Directory in the Build Step** is **Enabled**.
   4. **Framework Preset**: Next.js. **Build Command**, **Install Command** and **Output Directory** overrides: all **off**. Vercel detects the root `package-lock.json` workspace and installs from the repo root.
   5. **Node.js Version**: `22.x`. `engines` (`>=22.13`) may make Vercel pick 22.x or 24.x; both are fine.
   6. **Deployments** → latest deployment of `restructure/phase-0-scaffold` → **⋯** → **Redeploy**, with **Use existing Build Cache** unchecked.
   7. Open the preview URL in a browser where you are logged in to Vercel, and check:
      - `/` lists the skills;
      - `/skills/mitre-attack` renders;
      - `/api/skills` returns JSON with 24 skills;
      - `/api/health` returns JSON.
   8. MCP check: run the 8.8 `curl … /api/mcp` command against the preview URL. If it returns a Vercel login page (HTTP 401, Deployment Protection), skip it here and run it in step 8 against production.
   9. **If the preview fails:** set Root Directory back to empty, save, and report the build log. Do not merge.
7. **Merge** the PR with **Create a merge commit**.
8. **Verify production** at `https://aegis-skills.vercel.app`: `/`, `/skills/mitre-attack`, `/api/skills` (24), `/api/health`, plus the MCP `curl` with `https://aegis-skills.vercel.app/api/mcp`. Expected: `isError=false`.
   - **Rollback:** Vercel → Deployments → the previous production deployment → **⋯** → **Promote to Production** (Instant Rollback). Then revert the merge on GitHub.
9. **Update and re-enable intel-sync.** Edit `C:\Users\Drupad\.claude\scheduled-tasks\aegis-weekly-intel-sync\SKILL.md`:
   - Step 1: `node bin/aegis.js intel-sync --days 7` → `node apps/web/bin/aegis.js intel-sync --days 7`
   - Step 1 text: `` each skill's `references/live-threat-intel.md` `` → `` each skill's `packages/aegis/skills/<skill>/references/live-threat-intel.md` ``
   - Step 5: `` Stage `skills/ health.json scripts/` `` → `` Stage `packages/aegis/skills/ packages/aegis/health.json scripts/` ``
   - Step 5: `` take your regenerated version (`git checkout --ours health.json`) `` → `` take your regenerated version (`git checkout --ours packages/aegis/health.json`) ``

   `node scripts/skill-health.js` and the `scripts/intel-*.js` references stay as they are. Then toggle the task **Enabled** on.
10. **Re-enable Skill Health.** GitHub → Actions → **Skill Health Check** → **Enable workflow** → **Run workflow** (branch `main`). Confirm it ends green and pushes a `chore(health): …` commit that changes `packages/aegis/health.json`, and that no root `health.json` appears.

## Out of scope (later phases — do not do these here)

- Removing ChatGPT Actions, `openai-action`/`mcp-manifest` artifacts, or the fixture's `artifacts/*.json` (Phase 1).
- Moving `skill-reader`, `skill-families`, `lib/mcp`, `lib/cli`, `lib/tools`, `bin/aegis.js` or `src/` out of `apps/web` (Phases 1 and 5).
- Making `apps/web` depend on `aegis-skills` by package name; changing skill frontmatter or `skill.json`; adding `files`/`bin` to `packages/aegis/package.json` or removing its `private` flag (Phase 1).
- Creating `packages/themis-*`; touching `lib/themis/**`; replacing `better-sqlite3` (Phases 2–4).
- Root `lint:skills` and `check:deps` scripts, `@swc/jest` and per-package Jest configs (Phases 1, 2 and 7).
- Updating `docs/TECHNICAL.md` or the site's text (Phase 5); deprecating `@aegis-skills/core`; any npm publish (Phase 7).
- Fixing pre-existing quirks: the ignored `serverExternalPackages` key, shallow-clone recency in CI, untracking `tsconfig.tsbuildinfo`.

## Exit checklist

| # | Command (repo root) | Expected |
|---|---|---|
| 1 | `git log --oneline main..HEAD` | 5 commits: docs(plans), chore(license), refactor(repo) move, refactor(repo) workspaces, docs(readme) |
| 2 | `git show --stat --format= HEAD~2 \| tail -n 1` (the move commit) | `459 files changed` with almost no insertions or deletions, apart from the workflow lines |
| 3 | `node scripts/check-layout.js` | `Layout check passed: 24 skills, …` |
| 4 | `npm test 2>&1 \| tail -n 6` and `(cd apps/web && npx jest 2>&1 \| tail -n 6)` | baseline +1 suite / +4 tests, 0 failed, identical counts |
| 5 | `node apps/web/bin/aegis.js compile 2>&1 \| tail -n 1` | `Compiled 24/24 skills` |
| 6 | `npm run build 2>&1 \| tail -n 5 && node scripts/check-layout.js --trace` | build OK; `Layout check passed (with trace)` |
| 7 | `npm ls --workspaces --depth=0` | both workspaces listed, no errors |
| 8 | `grep -c "Apache-2.0 OR MIT" LICENSE README.md` | each ≥ 1 |
| 9 | `git status --porcelain \| grep -v '^??'` | empty |
| 10 | PR open against `main`; USER ACTIONS 4–10 handed over | — |
