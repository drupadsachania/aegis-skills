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

## Phase 3 execution results (2026-10-10)

`@aegis-skills/themis-plugin` built on `restructure` (no push/PR). 79 suites / 603 tests green; check-layout, check:deps (plugin rule + `approval.ts` as sole decider) and `lint-skills` on the orchestrator skill pass; `dist/index.js` boots and prints the ready line on stderr.

The plan text predated Phase 2's final API. Adaptations (deliberate; the design is unchanged):
1. `advance()` completes ONE step and does not auto-run the next. The plugin drives a loop: it auto-runs the deterministic steps (validate, schedule, audit) and pauses on reasoning steps. (Plan P5 expected auto-run inside `advance`.)
2. Prompts come from the real core builders (`decomposeSystemPrompt` etc.), not `core.prompts.*`; the plugin only adds the submit contract and a mapping of `fetch_skill_phase`/`read_findings` to the Aegis `get_skill_phase`/`themis_get_run`.
3. Step output shapes follow core, not the plan: decompose `{subTasks:[{id,skill,description,phase,dependsOn}]}` (plugin injects `skillSlugs` from the installed Aegis), fanout `{results:[{subTaskId,findings,confidence}]}`, guardrail `{results:[{subTaskId,guardrail:PASS|FLAG|BLOCK,guardrailReason}]}`, synthesise `{report:string}`.
4. `validateExposure`/`parseFinding` do not exist in core (the orchestrating function needs a model and lives in web). `themis_validate_exposure` composes the deterministic core functions (authorize, assessDetection, determineExploitability, verify, riskDelta) from host-supplied exposure/impact states; `themis_record_finding` validates against core's `Finding` shape with zod.
5. SDK 1.31 stores the tool callback as `handler` (not `callback`). `elicitInput` and `getClientCapabilities` behave as the plan assumed; tool-handler tests stub them on `server.server`.
6. Orchestrator skill uses family `domain` with one phase file: the Aegis lint requires a phase and a family from the five-bucket map (the plan's `orchestration` family is not valid). It still satisfies the scope-and-authorization rules.
7. Package `engines.node` is `>=24`; dependencies on core/gateway are `^0.1.0` (they are 0.1.0; the plan's `1.1.0` was wrong). The plugin itself is `1.1.0` as bound; Phase 7's bump script owns later alignment.
8. Agents omit a `tools:` allowlist (MCP tool names for plugin-bundled servers are not verifiable offline); they inherit tools and are told in prose to route externals through `themis_external_*`. Revisit in Phase 6 once names are verified against a live Claude Code install.
9. `scripts/check-deps-themis.js` gained a plugin rule (allowing only its own `package.json` as a relative import outside `src/`).
10. Task 11.2 (push/PR) skipped. Manual host verification: `packages/themis-plugin/docs/manual-verification.md` (USER ACTION).

## Phase 4 execution results — batch A (tasks 1-5)

1. Node engine is `>=24` (not `>=22.13`) in `packages/themis-app/package.json`, the `bin/themis.js` version check (major < 24) and the scaffold test; `check-layout.js` enforces it.
2. Skipped P1 (branch) and push/PR steps; work is on the single `restructure` branch.
3. Added `['packages/themis-app/package.json', '@aegis-skills/themis']` to the PACKAGES table in `scripts/check-layout.js` (data change only).
4. Workspace ranges set to `^0.1.0` (core, gateway) and `^1.1.0` (`aegis-skills`); `AEGIS_PACKAGE` stays `aegis-skills`.
5. Root `jest.config.js` already used `projects`; appended `<rootDir>/packages/themis-app`. `--selectProjects themis-app` works (the "project does not have a name" warning comes from other projects lacking a displayName, pre-existing).
6. `testTimeout` is not a valid per-project Jest option (validation warning), so the 20s timeout is set via `setupFilesAfterEnv` -> `__tests__/helpers/setup.ts` (`jest.setTimeout(20000)`).
7. Tasks 1-5 core/gateway names verified against `packages/themis-core/src/index.ts`; no renames were needed (`themisHome`, `versionStamp`, `loadMcpServers`, `redactSecrets`, `ProviderUnavailableError`, `LLMRequest/LLMResponse` all exist as the plan uses them). P1-P13 preconditions that are not Task-1-5 relevant (P10 inventory of apps/web, Task 9+ moves) were not exercised in this batch.
8. `npm ls @langchain/core` shows the single version 0.3.80 (F1 check passes); `npm install` added vite 8.3.3, react 18.3.1 and langchain deps to `package-lock.json` (committed with Task 1).
9. Task 3 temporary `providers/catalog.ts` stub was created then fully replaced in Task 4, as planned.
10. `ProviderUnavailableError.message` is the fixed string "AI providers unavailable" (reason in `internalReason`); the plan's tests only use `toThrow(ProviderUnavailableError)`, so no change was required.
11. Test counts for `themis-app` after Task 5: 7 suites, 33 passed, 2 skipped (POSIX file-mode tests on Windows).

## Phase 4 execution results — batch B (tasks 6-10)

1. Branch/PR/push steps skipped; Node engine is `>=24` (so the `app-db.ts` error message says "Node.js >= 24").
2. Tasks 6-8 landed exactly as specced (skill reader, `node:sqlite` checkpointer incl. the restart-and-resume test, reports repo). For Task 8 the `Summary` section of the audit markdown is `Critical n · High n · Medium n · Low n · Informational n · Passed n`, and an audit with no findings prints `No findings.`; the explain bullets use fixed labels (Why exposed, Why it matters, ...).
3. Task 9 (move only, `d83229c`) was a pure rename commit; it is intentionally red. The snapshot moved with similarity 100%.
4. P10 inventory matched the Move/Delete table (the extra web tests `graph/{deps-smoke,integration,nodes,state,tools}.test.ts` fall under the `graph/*.test.ts` row). `apps/web/app/api/mcp` and `apps/web/lib/mcp` are the hosted Aegis MCP server and were kept.
5. After `git rm`, empty directory shells remained under `apps/web/lib/themis` and `apps/web/__tests__/themis`; deleted them by hand so the layout guard's `MUST_NOT_EXIST` entries pass.
6. Prompt parity: `skill agent 1` removed from the snapshot (27 deleted lines, nothing else touched); `Snapshots: 11 passed`, none written, no `-u` used. The `decompose` parity test now mocks `enabledSkillSlugs` instead of `fetch`.
7. `@supabase/supabase-js` stays in `apps/web/package.json`: `apps/web/lib/telemetry.js` still `require`s it (plan 10.9 only removes it "when 10.8 shows no import"). Also kept: `ajv`, `chalk`, `commander`, `inquirer`, `gray-matter`, `zod` etc. (site/CLI code uses them).
8. Removed from web: themis-core/gateway, anthropic-sdk, google generative-ai, all `@langchain/*`, langsmith, openai, better-sqlite3 and its types, the whole `serverExternalPackages` list, the two themis jest mappers, and the `build-themis-packages.js` step from `predev`/`prebuild` (the script file stays, it is in `MUST_EXIST`). `npm ls better-sqlite3` is empty; `@langchain/core` resolves to the single 0.3.80.
9. `check-layout.js` data: dropped `lib/themis/index.ts` and `lib/themis/mcp/agent-tools.ts` from `MUST_EXIST`, added `themis-app` package.json and `bin/themis.js`, and added the five removed web paths to `MUST_NOT_EXIST`. The `themis-app` PACKAGES row already existed from batch A. `check-deps-themis.js` needed no change (`apps/web/lib` and `apps/web/app` still exist).
10. Gateway invariant test now scans `themis-gateway/src` plus `themis-app/src` (allowing only `server/routes/approvals.ts`, which Task 17 creates).
11. Final numbers: whole repo `npx jest` = 75 suites, 519 passed, 2 skipped (POSIX mode tests), 0 failed; `check:deps`, `check-layout` pass; `npm run build -w @aegis-skills/web` succeeds.

## Phase 4 execution results — batch C (tasks 11-14)

1. Tasks 11-14 landed as specced (graph state/tools/gateway bridge, skill agent, graph built from `THEMIS_WORKFLOW`, runner). Branch/PR steps skipped; work is on `restructure`.
2. All LangGraph names the plan uses exist in 0.2.74 as expected: `interrupt`, `Command`, `Send`, `isGraphInterrupt` (re-exported from `errors.js`), `Annotation`, `StateGraph`, and `createReactAgent({ prompt })`. No renames were needed; core names (`advance`, `startRun`, `readySubTasks`, `summariseGuardrail`, `synthesisableResults`, `buildDebriefRecord`, `newApprovalRequest`, `canExecuteApproval`) matched the plan's call shapes.
3. `setConfigValue` takes the raw value as a string, so the disabled-skill test uses `setConfigValue('skills.disabled', '["compliance"]')`.
4. The runner test registers its DB-closing `afterEach` before `useTempHome()` so SQLite file handles close before the temp dir is removed (Windows otherwise throws EPERM on `rmSync`). All 9 runner cases passed first time, including the restart case (`needs_reproposal`), with no extra LangGraph re-runs.
5. `decideApproval` is not called anywhere under `packages/themis-app/src`; the only callers are tests (outside the invariant guard). The `approvals/execution.ts` state is derived from audit events only.
6. Final numbers: `npx jest` = 80 suites, 553 passed, 2 skipped (POSIX mode tests on Windows), 0 failed; `themis-app` project alone = 142 passed. `check-layout`, `check:deps` and `npx tsc -p packages/themis-app/tsconfig.json` pass.

## Phase 4 execution results — batch D (tasks 15-20)

1. Tasks 15-20 landed as specced (HTTP security primitives, server core, run/approval routes, reports/pipelines routes, skills/MCP/models/settings routes, `app.ts` + `themis` CLI). Branch/PR/push steps skipped; work is on `restructure`.
2. The plan's server.test case 7 (415/413 on `POST /api/runs`) needs a route that only exists after Task 17, so it lives in `__tests__/server/runs.test.ts` instead of `server.test.ts`; behaviour is identical.
3. SSE `isLive` for `/api/runs/:id/events` is `runner.isActive(id)` only (plan: `isActive || status === 'running'`). A persisted `running` run with no active runner (crash or restart) would otherwise stream forever and the plan's own "run not active" test seeds exactly that state.
4. `scripts/check-deps-themis.js`: `APPROVAL_DECIDERS` now includes `packages/themis-app/src/server/routes/approvals.ts`, and a `@aegis-skills/themis` rule was added (allowed: zod, the three `@langchain/*` model packages, `@langchain/core`, `@langchain/langgraph`, `@langchain/langgraph-checkpoint`, core, gateway, `aegis-skills`) as part of Task 17 instead of Task 24. The static invariant test confirms exactly one `.decideApproval(` in `themis-app/src`.
5. Added `__tests__/helpers/route-harness.ts` (authenticated test server wrapper) used by the Task 19 route tests; `test-deps.ts` imports were merged at the top of the file rather than appended mid-file.
6. CLI console strings use ASCII (`->`, `ok`, `x`, ` - `) instead of the plan's arrows/check marks/em dash so Windows consoles do not garble them; the banner still uses the middle dot from the plan.
7. Models route validates body shape itself (unknown top-level/tier/local keys and a non-provider `defaultProvider` give 400) before handing values to the strict zod config schema, whose `ConfigError` maps to 400.
8. Real-binary smoke after `npm run build:server`: `--version`, `--help`, `keys list`, `run` without a provider (exit 1, no stack trace) and `dashboard --no-open --port 19123` (302 + cookie swap, `/api/health` 401 without and 200 with cookie, foreign Host 403, `/` answers 503 "UI is not built" until the Vite batch). The headless scripted-model run and the approval pause (exit 3) are covered in `__tests__/cli/cli.test.ts` with the in-memory fake gateway swapped in through `jest.mock`.
9. Final numbers: whole repo `npx jest` = 91 suites, 632 passed, 2 skipped (POSIX mode tests on Windows), 0 failed; `check-layout`, `check:deps` and `npx tsc -p packages/themis-app/tsconfig.json` pass. Tasks 21-26 (UI, docs, final verification) remain.

## Phase 4 execution results — batch E (tasks 21-26) and exit

1. Tasks 21-26 landed as specced. Branch, push and PR steps skipped ("PR skipped"); work is on the single `restructure` branch. Node engine stays `>=24` everywhere (README, docs, package.json).
2. The UI has one extra helper, `ui/src/hooks.ts` (`useLoad` polling loader, `errMsg`, `shortId`, `when`), shared by the pages; the plan listed only api/hash/components. Pages still use only `api.ts`, the four components and React state; no `dangerouslySetInnerHTML`, no external URLs (guarded by `static-ui.test.ts`).
3. `npm pack --dry-run --json` runs `prepack` (the build) and pollutes stdout, so the Task 23.3 content check was run with `--ignore-scripts` after a build. Result: `pack OK 119 files`, no `src/`, `ui/`, `__tests__/`, `.env` or source maps.
4. `packages/themis-app` had no licence files although `files` listed them; copied `LICENSE`, `LICENSE-APACHE`, `LICENSE-MIT` from the repo root (same as `packages/aegis`). Not done for core/gateway (out of scope; Phase 7 pack assertions should cover them).
5. Task 24: the `@aegis-skills/themis` rule and `APPROVAL_DECIDERS` entries already existed from batch D and were kept. The `guards.test.ts` rule for `node:sqlite` accepts `import type`, `typeof import('node:sqlite')` type positions and `getBuiltinModule('node:sqlite')` (the real `app-db.ts` uses the latter two). The probe import of `better-sqlite3` is rejected by `check-deps-themis` (exit 1) as expected.
6. `scripts/check-layout.js` MUST_EXIST now also lists the key themis-app files (tsconfig.build, jest config, README, src index/app/cli/graph build/runner/checkpointer/server http+security+approvals route, ui index/vite config/tsconfig/main) and `docs/themis/mode-2.md`.
7. Docs (`packages/themis-app/README.md`, `docs/themis/mode-2.md`) were written from the real `HELP` text, `KEY_VARS`, `DEFAULT_MODELS`, `LOCAL_PRESETS` and the CLI exit codes (0/1/2/3). Until publication, the clean-machine steps describe installing the four tarballs in one command.
8. Live verification on Windows (port 19120, throwaway `THEMIS_HOME`): no cookie -> 401; foreign Host -> 403; health with cookie -> JSON; POST without Origin -> 403; `/` -> 200 with the strict CSP header and an `index.html` whose only script is `/assets/index-*.js` (no inline script/style), assets 200; `ExperimentalWarning` count 0. Also loaded in the in-app browser: the `?t=` link redirected to `/`, all eight pages rendered, console empty, and the Settings Save (a PUT) succeeded through the browser (Origin/cookie accepted). Server processes were stopped afterwards.
9. Tarballs (`.pack/`, git-ignored): four `.tgz` files; installed together in a fresh folder with no workspace: `npx themis --version` -> `themis 0.1.0 (Aegis 1.1.0, osk 1.1)`; no `node-gyp` or `better-sqlite3` in `npm ls`; no registry 404.
10. Final numbers: whole repo `npx jest` = 93 suites, 641 passed, 2 skipped (POSIX mode tests on Windows), 0 failed (was 632 passed after batch D); prompt-parity snapshot untouched (11 passed, no `-u`). `npm run build -w @aegis-skills/web`, `npm run build -w @aegis-skills/themis` (server + Vite UI), `check:deps`, `check-layout`, `tsc -p packages/themis-app/tsconfig.json` and `tsc -p packages/themis-app/ui/tsconfig.json` all pass. `npm ls better-sqlite3` is empty.

### Exit checklist (plan section 11)

- [x] `packages/themis-app` exists; pack contents pass (dist incl. dist/ui, bin, README, licences); UI deps are devDependencies only.
- [x] `apps/web/lib/themis`, `apps/web/__tests__/themis` and `apps/web/app/api/{themis,audit,exposure}` are gone (batch B); `npm ls better-sqlite3` is empty.
- [x] jest green; `check:deps` OK with `APPROVAL_DECIDERS` = dashboard route + plugin approval; `check-layout` passes.
- [x] Graph built only from `THEMIS_WORKFLOW` + `LANGGRAPH_NODE_BY_STEP` (`build.test.ts`, batch C).
- [x] Checkpointer restart test (Task 7) and runner pause/resume incl. `needs_reproposal` (Task 14) pass in the full run.
- [x] Security tests pass (token/cookie, Host, Origin, no CORS, CSP, 413/415, masked keys, loopback refusal, single `decideApproval` caller).
- [x] Reports carry the `Themis x · Aegis y (osk z)` stamp (report tests; UI shows it on Reports and in the nav).
- [x] Live smoke test passed on Windows (item 8).
- [ ] PR skipped (by instruction). USER clean-machine exit test with a local model and a cloud key remains a USER ACTION (plan section 9); the tarball install on this machine passed, but no model run was made (no keys supplied).

## Phase 5 execution results — batch A (tasks 1-5)

1. Branch/PR steps skipped; work is on `restructure`. Node engine stays `>=24`; `aegis-skills` 1.1.0.
2. Task 1: Phase 4 had already removed `app/api/{themis,audit,exposure}`, `lib/themis` and `__tests__/themis`; only `apps/web/supabase/` (3 Themis migrations) remained and was removed, plus `apps/web/.env.local.example` (Supabase/LLM keys; the site reads no env). `scripts/check-layout.js`: dropped `apps/web/supabase/migrations` from MUST_EXIST, added `apps/web/supabase` to MUST_NOT_EXIST.
3. Task 2: Phase 0 had left an adapter `lib/skill-reader.js` (adds `healthScore`) and `lib/aegis-paths.js` (+ tests). Per the health amendment both were deleted with their tests; `lib/aegis.js` (facade, also re-exports `getPhaseRef`) and `lib/site-paths.js` replace them. `check-layout` MUST_EXIST updated to `lib/aegis.js` and `lib/site-paths.js`.
4. `pages/api/health.js` and `tests/api/health.test.js` were deleted in the Task 2 commit (not Task 3) because they imported `aegis-paths`; Task 3 health steps 3.1-3.2 skipped per the amendment. A guard test now asserts the health route does not exist.
5. `pages/index.js` and `pages/skills/[name].js` still import through `lib/aegis` and `pages/index.js` no longer merges health scores in `getStaticProps` (still has dead `healthScore` rendering and "health" prose, removed when Tasks 11-13 rewrite it). `index.js` keeps `aegis-skills/mcp/skill-families` as a separate `require`: destructuring `listSkills` and `FAMILIES` from `lib/aegis` in one statement stops Next from stripping the fs-using reader out of the client bundle (build fails with "Can't resolve 'fs'"). Later page tasks must keep `listSkills` in its own require used only inside `getStaticProps`.
6. Task 3: invoke route, telemetry and their tests deleted; phase route/test cleaned. `docs.js`/`index.js`/`themis.js` still mention removed routes in prose (rewritten in Tasks 13-15).
7. Task 4: removed `@supabase/supabase-js`, `ajv`, `chalk`, `commander`, `inquirer`, `gray-matter`, `zod` from web deps (nothing in web imports them), added `marked@^15` (15.0.12). `next.config.js` already had Phase 0 tracing config under `experimental`; kept it, swapped the `health.json` glob for `packages/aegis/package.json`, and added the `/downloads/:path*` cache header. `apps/web/public/downloads/` added to `.gitignore`.
8. Task 4: `predev`/`prebuild` were left as Phase 1's `node ../../scripts/build-flat-prompts.js --out .generated/prompts` because `scripts/build-downloads.js` does not exist until Task 6; Task 6 must switch them. The guard test's removed-route check temporarily skips `pages/docs.js`, `pages/index.js`, `pages/themis.js` (`PENDING_REWRITE` list); delete that list when Task 15 lands. The guard also asserts no `process.env.*` reads in site source.
9. Task 5: implemented as written (6 tests plus 9 parameterised cases = 14 tests).
10. Final numbers: whole repo `npx jest` = 90 suites, 637 passed, 2 skipped, 0 failed (was 641 before; net loss is the deleted invoke/telemetry/health/aegis-paths/adapter tests, gain is guard + zip tests). `npm run build -w @aegis-skills/web`, `check-layout` and `check:deps` pass.
