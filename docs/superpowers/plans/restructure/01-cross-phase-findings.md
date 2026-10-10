# Cross-phase findings (from plan writers)

Requirements discovered while writing individual phase plans that change OTHER phases. Before the plans go to executors, each item is folded into the affected phase plan or into `00-contracts.md`. Status per item: `open` → `folded` (with the plan and section it landed in).

## From Phase 0

| # | Finding | Affects | Status |
|---|---|---|---|
| 0.1 | TypeScript 5.2+ rejects `module: commonjs` + `moduleResolution: node16`. Use `tsconfig.base.json` with `module: node16`, `moduleResolution: node16`, `types: ["node"]` (emits CJS without `"type":"module"`). | contracts §4, Phases 2/3/4 | open (sent to 2 and 4) |
| 0.2 | "Every commit builds" conflicts with "moves committed separately". Move commits may be non-building; PRs merge with a merge commit (never squash). | contracts §3/§8 | open |
| 0.3 | Next 14: output-file-tracing keys live under `experimental`. The top-level `serverExternalPackages` is ignored on Next 14. | Phase 5 | open |
| 0.4 | `scripts/` stays at the repo root. `health.json` and `.intel-sync-state.json` move to `packages/aegis/`. The site resolves skills via `apps/web/lib/aegis-paths.js` (override `AEGIS_PACKAGE_DIR`). `scripts/check-layout.js` is the layout guard each phase updates. | all | open |
| 0.5 | Intel sync is a local Claude scheduled task (Saturdays), not CI. `.intel-sync-state.json` is gitignored. `exposure-validation` and `threat-modeling` have no `intel-state.json`. | contracts §2, Phase 7 | open |
| 0.6 | Copyright holder mismatch: LICENSE says "Kairo Foundation", README says "Drupad Sachania". | USER decision | open |

## From Phase 5

| # | Finding | Affects | Status |
|---|---|---|---|
| 5.1 | The website consumes these from Phase 1: `aegis-skills/mcp/{server,skill-reader,skill-families}` and `aegis-skills/package.json` subpath exports; `scripts/build-flat-prompts.js` exporting `flattenSkill(absDir)`; marketplace name `aegis-skills`; installer target ids `claude, codex, gemini, cursor, vscode, antigravity`; skill.json `context` preserved for `/api/recommend`. | Phase 1 | open (sent to 1) |
| 5.2 | Vercel needs Root Directory `apps/web`, include files outside root, and Node ≥ 22 (`zlib.crc32`). | USER ACTION | open |

## From Phase 6 research (Phase 6 plan not yet written)

| # | Finding | Affects | Status |
|---|---|---|---|
| 6.1 | The Anthropic plugin directory rejects `npx` packages without an exact version: `npx aegis-skills@^1` is not acceptable. Pin exact versions in submitted manifests (bumped by Phase 7's version script). | Phases 1, 3, 7; contracts §6 | open |
| 6.2 | Themis's own MCP server must be an exact-pinned `npx` of the published package, so the Themis plugin listing waits for the Phase 7 npm publish. | Phases 3, 6, 7 | open |
| 6.3 | Aegis's submitted `.mcp.json` should point at the hosted HTTPS MCP (`https://aegis-skills.vercel.app/api/mcp`); the local stdio adapter stays available through `aegis install`. | Phase 1 | open |
| 6.4 | `mcpName` field required in the Aegis and Themis `package.json` files, plus `server.json` (description ≤ 100 chars) for the MCP Registry. | Phases 1, 3 | open |
| 6.5 | Hosted MCP: add `annotations.title` to every tool; rate-limit while exempting Anthropic's egress range `160.79.104.0/21`; add a `/.well-known/openai-apps-challenge` route for ChatGPT domain verification. | Phase 5 | open |
| 6.6 | Gateway untrusted-output wrapper does not escape a closing tag inside tool output (wrapper breakout → prompt injection). Escape or neutralise it, with a test. | Phase 2 | open |
| 6.7 | ChatGPT app submission is now a ZIP plugin bundle; needs a build script. | Phases 6, 7 | open |
| 6.8 | The Gemini gallery needs `gemini-extension.json` at the repo root or at the root of the release archive. | Phases 1, 7 | open |
| 6.9 | `mitre-atlas` skill uses incorrect ATLAS technique IDs and keyword-stuffed text; fix as content work. | Phase 1 | open |
| 6.10 | Directory name collision risk for "Aegis"/"Themis"; check before submission. | Phase 6 (USER) | open |

## From Phase 7

| # | Finding | Affects | Status |
|---|---|---|---|
| 7.1 | Phase 5's zip writer moves to `scripts/lib/zip.js`, with a shim left at the old path, so the release workflow and the website share one implementation. | Phase 5, Phase 7 | open |
| 7.2 | The version in each skill's `SKILL.md`/`skill.json` is a per-skill version, not synced to the `aegis-skills` package version. The bump script only rewrites package-level manifests. | Phase 1 | open |
| 7.3 | npm trusted publishing (verified 2026-10-08) needs npm 11.5.1+, Node 22.14+ and a GitHub-hosted runner. A new package name can't have a trusted publisher until it exists, so each package's first version is published with a 7-day token, followed by a validation patch within 48h, then tokens are disallowed. | USER ACTION (B6 gate) | open |
| 7.4 | Contracts §6's `aegis-skills@^1` pin is replaced by exact pins (see 6.1). Contracts §2's "intel-sync bot" is the maintainer's local scheduled task. | contracts | open |
| 7.5 | CI landing order: A0–A1 after Phase 0; A2–A5 after Phase 1; A6 after Phase 2; A7 after Phases 3 and 4. | all | open |

## From Phase 1

| # | Finding | Affects | Status |
|---|---|---|---|
| 1.1 | The Aegis CLI lives at `packages/aegis/cli/aegis.js`, NOT `bin/aegis.js` (contracts §3). Claude's docs say claude.ai and Cowork won't install a plugin whose root contains `bin/`. The npm `bin` field still maps `aegis` to the new path. | contracts §3, Phase 5 (reads CLI help from this path), Phase 7 (pack allowlist must accept `^cli/` instead of `^bin/`), Phase 0 (`bin/aegis.js` references) | open |
| 1.2 | Gemini install from a repo subdirectory is not supported. Phase 1 offers no repo-URL install ("not offered"); it works once Phase 7's release archives exist. No repo-root manifest is added. | Phase 5 (`GEMINI_EXTENSION_INSTALL` stays null until then), Phase 7 | open |
| 1.3 | Exact versions in all manifests are `1.1.0` rather than a placeholder token; Phase 7's bump script rewrites them. A literal placeholder would fail Phase 7's drift check. | Phase 7 | folded (matches) |
| 1.4 | The marketplace entry carries a `version` field (Phase 7's version table needs it); `claude plugin validate` warns about it. | Phase 7 | open (accept the warning) |
| 1.5 | Task 18 corrects the wrong MITRE ATLAS IDs against the 2026.09 data and removes keyword stuffing from four skills, so skill-health scores will drop. | USER (expect lower scores) | open |
| 1.6 | `npm view aegis-skills` returned E404 on 2026-10-07: the name is free. VS Code user scope prints a `code --add-mcp` command instead of writing config. | contracts §3 | folded |

## From Phase 4

| # | Finding | Affects | Status |
|---|---|---|---|
| 4.1 | Checkpointer: custom `SqliteCheckpointSaver` on `node:sqlite` in `~/.themis/app.db`. The ready-made `@langchain/langgraph-checkpoint-sqlite` 1.0.4 needs `better-sqlite3`, so it is rejected. LangGraph pinned at lockfile versions (0.2.74, core 0.3.80) to keep one hoisted `@langchain/core`. | Phase 4 | folded |
| 4.2 | Phase 4 deletes the web Themis routes and all of `apps/web/lib/themis`; site copy still mentions those endpoints until Phase 5. | Phase 5 Task 1 (already allows this) | folded |
| 4.3 | The app owns a small no-tools prompt wrapper around core's `skillAgentUserMessage`. Moving it to core needs a new `skillAgentNoToolsUserMessage` there. | Phase 2 (optional) | open |
| 4.4 | Approval expiry can't be implemented: `putApproval` accepts only new requests, so mode 2 never produces `expired`. After a restart, approved actions become `needs_reproposal`. | contracts §6 (`expired` status unused) | open |
| 4.5 | Phase 2's gateway invariant test scans `apps/web/lib/themis`, which Phase 4 deletes; Phase 4 Task 10 updates that test. | Phase 2/4 | folded |
| 4.6 | `advance()` is strictly sequential, so parallel sub-agents never call it; the `schedule` join advances each stage once. | Phase 3 (plugin must follow the same rule) | open |

## From Phase 0 execution (2026-10-08)

| # | Finding | Affects | Status |
|---|---|---|---|
| 0.7 | Phase 0 is done on branch `restructure` (6 commits ahead of `main` at `ef6464a`, which is untouched). Final test state: 41 suites / 413 tests, all passing (baseline after fixing 7 stale tests was 39 / 407; Phase 0 added 2 suites / 6 tests). | all | done |
| 0.8 | `/api/health` returned HTTP 500 in production builds on `main`: the route exported only `module.exports = handler` with no `.default`, which Next requires. Fixed in the workspace-conversion commit with a regression test (`apps/web/tests/api/health.test.js`). Phase 5 audits this route anyway. | Phase 5 | fixed |
| 0.9 | **Local Node mismatch (this dev machine only).** `npm`, `npx` and every npm lifecycle script run under **Node 22.9.0**, taken from a stray `node` package at `C:\Users\Drupad\node_modules\node` (an ancestor of the repo, so npm puts its `.bin` first on PATH). The shell's own `node` is 24.11 (Volta default). Consequences: (a) `better-sqlite3` built by `npm ci` targets Node 22 (ABI 127) and works for Jest and Next but fails under the shell's Node 24; (b) **Phase 2's `node:sqlite` needs Node >= 22.13**, so `npx jest` here would run it on 22.9 and fail. CI and Vercel are unaffected. Fix before Phase 2: remove or upgrade that stray package (outside the repo, so the user's call), or make Node 24 first on PATH for npm. | Phases 2, 3, 4 | open (USER ACTION) — engines now `>=24` (decided 2026-10-08); the stray `node` 22.9 package in the home folder still makes npm/npx run Node 22.9 locally until removed |
| 0.10 | `.gitignore` now ignores `graphify-out/`; `scripts/check-layout.js` is the layout guard that later phases extend. The older untracked `docs/superpowers/plans/2026-05-25-unified-aegis-cli.md` was intentionally left uncommitted. | all | done |
| 0.11 | Pending USER ACTIONS from the Phase 0 plan (none done by the executor): Vercel Root Directory = `apps/web` before any deploy of this branch; pause or retire the local `aegis-weekly-intel-sync` task while this branch is checked out (it runs in this folder); fix or retire the Skill Health workflow; add the `SECURITY.md` contact email; confirm "Kairo Foundation" as licence holder. Nothing has been pushed. | USER | open |
| 0.12 | **0.9 resolved (2026-10-08).** The stray `node@22.9.0` package came from an accidental `npm install` in `C:\Users\Drupad` (also left `@aegis-skills/core@0.1.0`, `bun`, `dagre`, `reactflow`). Its `node_modules\.bin` was renamed to `.bin.removed-2026-10-08` and `package.json`/`package-lock.json` there were renamed with the same suffix (nothing deleted). The rest of `C:\Users\Drupad\node_modules` could not be renamed because the Context7 MCP server runs from it; rename or delete it after that server is restarted. A fresh `npm ci` then rebuilt `better-sqlite3` for Node 24 (ABI 137). `npm run`/Jest/Next, the shell `node`, and `node:sqlite` all run Node 24.11 now. `node:sqlite` prints an ExperimentalWarning on 24.11 (harmless; Phase 2 may silence it). Note: `npm exec -- node` is not a valid probe (npm treats "node" as a package to fetch); use `npm exec -c "node ..."`. Also unrelated: npm's global prefix still points at Nodist (`C:\Program Files (x86)\Nodist\bin`, Node 20.10 only) and Nodist is also on PATH; harmless now but worth cleaning up. | Phases 2-4 | resolved |

## Phase 2 execution results (2026-10-10)

Executed on branch `restructure` (no push/PR: nothing is deployed until all phases are done).

- Tests: 70 suites / 567 tests green (baseline 447); prompt-parity snapshot (12) unchanged; workflow-parity test passes (LangGraph edges == `THEMIS_WORKFLOW`).
- `npm run build -w @aegis-skills/web` succeeds with no fallback needed (no `serverComponentsExternalPackages` change); `check:deps`, `check-layout` pass.
- Deviations from the plan text (all small, all deliberate):
  1. `themis-core/test/contract-surface.test.ts`: the plan's "no `sqlite` in `require.cache`" assertion matches our own `store/sqlite.ts`. Replaced with a spy on `process.getBuiltinModule` proving `node:sqlite` is only loaded when a store is opened.
  2. `themis-gateway/package.json` `engines.node` is `>=24` (plan said `>=22.13`; contracts correction 11 says Node 24 everywhere, and `check-layout` enforces it).
  3. `scripts/check-layout.js` data extended (Phase 2 paths required, moved web paths forbidden, two new package manifests checked).
  4. Task 19.8 (push + PR) intentionally skipped.
- Phases 3/4 must adopt the contract additions listed in the plan's Caveats section (RunState `context`/`report`/`error`, `startRun` opts, `Gateway.call` reason opt, `executeApproved` restart rule, `McpApprovalRequest` name).
