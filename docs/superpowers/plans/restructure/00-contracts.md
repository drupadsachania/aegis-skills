# Restructure — Shared Contracts

Every phase plan in this folder MUST follow this file. If a phase plan contradicts it, this file wins. If reality contradicts it, the executor stops and reports; it does not improvise.

Master plan: `../2026-10-07-aegis-themis-restructure.md`.

---

## 1. Who executes these plans

Plans are written by Opus and executed by Sonnet or Haiku. Therefore every plan:

- makes every decision up front. No "choose an approach", no "as appropriate", no "TBD";
- gives exact paths, exact commands and exact expected output;
- gives complete code for any new file up to ~150 lines; for larger pieces, a precise spec plus the tests that pin the behaviour;
- marks each task with a suggested executor (`haiku` = mechanical, `sonnet` = integration or judgement);
- lists **STOP conditions**: situations where the executor halts and reports instead of guessing.

Universal STOP conditions (apply to every phase):

1. A file or symbol the plan names does not exist, or has a different shape than the plan says.
2. The baseline test run (taken before the first task) shows failures. Record them and stop; do not fix unrelated failures.
3. A step would delete or overwrite something the plan does not name.
4. A test that passed at baseline fails and the fix is not obvious within the task's scope.
5. Any step needs a secret, an account login, a publish, or a change in a third-party dashboard. Those are **USER ACTIONS**; the plan lists them and the executor stops at them.

---

## 2. Environment facts (verified 2026-10-07)

- Git repo root: `openskill/` (remote `https://github.com/drupadsachania/aegis-skills.git`, default branch `main`). All paths in all plans are relative to this root.
- Dev machine is **Windows** (Git Bash and PowerShell available). Every command in a plan must run in Git Bash. Prefer `node` scripts over shell tricks. Never rely on `sed -i`, `cp -r` semantics that differ on Windows, or symlinks.
- Local Node is 24.11. CI (`.github/workflows/skill-health.yml`) uses Node 20 today; it must move to 22+.
- Hosting: the website deploys to Vercel at `https://aegis-skills.vercel.app` from the repo root. There is no `vercel.json`. Vercel settings are a USER ACTION.
- Current single package: `@aegis-skills/core` v1.0.0, MIT, CommonJS, `bin: aegis → bin/aegis.js`, `main: src/compiler.js`.
- Next.js app uses **both** `app/` and `pages/` routers.
  - `app/api/`: `themis`, `audit`, `exposure`, `mcp`.
  - `pages/api/`: `[skill]/invoke`, `[skill]/manifest`, `[skill]/phase/[phaseId]`, `health`, `recommend`, `skills`.
- Tests: Jest via `next/jest` with `moduleNameMapper '^@/(.*)$' → '<rootDir>/$1'`. TS tests live in `__tests__/`, JS tests in `tests/`. The fixture `tests/fixtures/test-skill/` includes `artifacts/openai-action.json` and `mcp-manifest.json`.
- `tsconfig.json` uses the path alias `@/*` and `moduleResolution: bundler`.
- `next.config.js` lists LLM SDKs and `better-sqlite3` in `serverExternalPackages` and sets security headers.
- `npm test` is NOT a test suite (it runs `aegis --version`, `compile` and the detector). Real tests: `npx jest`.
- `.npmignore` exists and whitelists folders; `*.md` is ignored except README, LICENSE and skill markdown.
- `.github/workflows/skill-health.yml`:
  - runs weekly; `npm ci` → `node bin/aegis.js compile` → `node scripts/skill-health.js`;
  - writes `health.json` at the repo root, commits and pushes to `main` using `SKILL_HEALTH_PAT`, and opens a PR for stale skills.
  - **Any move of `bin/`, `scripts/`, `skills/` or `health.json` must update this workflow in the same commit.**
- Weekly intel sync bot commits ("chore: weekly Aegis intel sync") touch `skills/*/references/live-threat-intel.md` and `skills/*/intel-state.json`. Root state file: `.intel-sync-state.json`.
- Each skill folder today: `SKILL.md`, `skill.json`, `intel-state.json`, `references/*.md`, `artifacts/{mcp-manifest.json, openai-action.json, skill.json, system-prompt.txt}`. There are 24 skills.
- ChatGPT/OpenAI-Action references: 63 occurrences in 17 files (excluding `node_modules`, `.next`, `skills/`), including `bin/aegis.js`, `src/compiler.js`, `src/adapters/openai-action.js`, `lib/tools/detector.js`, `lib/cli/init.js`, `components/{InstallTabs,PlatformBadge}.js`, `pages/{index,docs,skills/[name]}.js`, `README.md`, `docs/TECHNICAL.md`, `package.json`, `tests/compiler.test.js`, `tests/components/InstallTabs.test.js`.
- The Aegis MCP server (`lib/mcp/aegis-server.js`) exposes the read-only tools `list_skills`, `get_skill`, `get_skill_phase`. **These tool names are frozen**: Themis depends on them.
- `lib/skill-reader.js` resolves phase refs from `SKILL.md` frontmatter at runtime and keeps the compiled manifest path-free (a security test enforces that).

### Themis module map (from the code graph; executors must re-verify each file before moving it)

Model-calling, via `provider.ts` (`llm()`) or LangChain:
`provider.ts`, `llm-factory.ts`, `decompose.ts`, `synthesise.ts`, `guardrail.ts` (**uses provider**), `index.ts`, `graph/*`, `checkpointer.ts`, `mcp/agent-tools.ts` (LangChain tool wrapping), `audit/{assessor,ingest,reporter}.ts`, `exposure/{ingest,correlate,planner,attackpath,report}.ts`.

No model calls:
`types.ts`, `secrets.ts`, `sanitise.ts`, `mcp/{config,tool-policy,client}.ts`, `audit/{scorer,standards,types}.ts`, `exposure/{types,policy,risk,detection,verify,capabilities}.ts`.

Persistence:
- `audit/index.ts` and `exposure/index.ts` use Supabase.
- `debrief.ts` uses `better-sqlite3`.
- `checkpointer.ts` uses LangGraph `MemorySaver`.

**Consequence:** files that mix deterministic logic with model calls (`guardrail`, `exposure/{correlate,planner,attackpath,report,ingest}`, `audit/{assessor,ingest,reporter}`) are **split**. Pure functions (validation, scoring, state transitions, schema coercion, prompt *building*) go to core; the model call stays in the app (mode 2) or becomes a host-AI reasoning step (mode 1).

---

## 3. Repo layout and names

```
openskill/                              repo root; root package.json is private
├─ package.json                         name "aegis-skills-monorepo", private, workspaces ["packages/*","apps/*"]
├─ packages/
│  ├─ aegis/                            npm "aegis-skills"            bin: aegis
│  ├─ themis-core/                      npm "@aegis-skills/themis-core"
│  ├─ themis-gateway/                   npm "@aegis-skills/themis-gateway"
│  ├─ themis-plugin/                    npm "@aegis-skills/themis-plugin"  bin: themis-mcp
│  └─ themis-app/                       npm "@aegis-skills/themis"   bin: themis
├─ apps/web/                            "@aegis-skills/web", private (the Next.js site)
├─ scripts/                             repo-level build/lint/release scripts (node, CommonJS)
├─ .claude-plugin/marketplace.json
├─ LICENSE, LICENSE-APACHE, LICENSE-MIT, SECURITY.md
└─ docs/{aegis,themis,web}/             user docs (published by the site in Phase 5)
```

- Name availability (`aegis-skills`, `@aegis-skills/*`) is checked in Phase 1 with `npm view <name>`. The `@aegis-skills` scope already exists (current package). If `aegis-skills` is taken, the fallback is `@aegis-skills/aegis`; record the result in this file.
- **Nothing is published to npm before Phase 7.** Earlier phases test with `npm pack` and install the tarball.
- Every package: `"license": "(Apache-2.0 OR MIT)"`, `"engines": { "node": ">=22.13" }` (first Node 22 line with unflagged `node:sqlite`), `"repository"` with a `"directory"` field.

### Strangler rule (Phase 0 → 4)

Phase 0 moves the entire current app, everything except skill content, into `apps/web/` with its internal layout unchanged (`apps/web/lib/themis/...`, `apps/web/src/...`, `apps/web/bin/aegis.js`, etc.). Later phases **extract** from `apps/web/` into `packages/*`. At every commit the site builds and the tests pass. The skill content moves once, in Phase 0, to `packages/aegis/skills/`.

---

## 4. Languages, build, tests

| Package | Language | Build | Module format |
|---|---|---|---|
| `aegis` | JavaScript | none (ships source) | CommonJS |
| `themis-core`, `themis-gateway`, `themis-plugin`, `themis-app` (server) | TypeScript | `tsc -p tsconfig.build.json` → `dist/` | CommonJS (`"module": "commonjs"`, `"moduleResolution": "node16"`) |
| `themis-app` (dashboard UI) | TypeScript + React | Vite → static assets in `dist/ui/`, built at publish time | n/a |
| `apps/web` | as today | Next.js | as today |

- A shared `tsconfig.base.json` at the root; each package extends it. No `@/` path alias inside `packages/*`. Packages import each other by package name through workspaces.
- Tests in packages: Jest + `@swc/jest` (no `next/jest`). Each package owns `jest.config.js`. A root `jest.config.js` uses `projects` so `npx jest` at the root runs everything.
- Root scripts: `npm run lint:skills`, `npm run check:deps`, `npm test` (= `jest`), `npm run build` (workspaces).

---

## 5. Skill format (Aegis, from Phase 1)

Target: the open Agent Skills standard. The Phase 1 executor verifies the current spec at <https://agentskills.io/specification> before migrating. If the spec differs from what is below, STOP and report.

`SKILL.md` frontmatter, and nothing else at the top level:

```yaml
---
name: compliance                         # == folder name, lowercase, hyphens, ≤64 chars
description: >-                          # ≤1024 chars, says what it does AND when to use it
  ...
license: Apache-2.0 OR MIT
metadata:                                # flat string → string only
  version: "1.1.0"
  osk: "1.1"
  family: "<family key from skill-families.js>"
---
```

- Everything structured moves to `skill.json`, the machine-readable sidecar: phases (id, file, auto, tokens), frameworks, tags, research feeds and intel settings.
- The `SKILL.md` body links phases as relative markdown links (`[Scope definition](references/scope-definition.md)`), which is the standard's progressive-disclosure mechanism.
- Removed everywhere: `platforms` (model pins), `endpoints`, `tools`.
- `skill.json` keeps `"osk"`; this restructure sets it to `"1.1"`. The **osk major** is the Aegis↔Themis contract. Readers must ignore unknown fields.
- `lib/skill-reader.js` (moved in Phase 1) reads phases from `skill.json`, not from frontmatter. Path-freedom of anything served over HTTP or MCP stays enforced.
- Every `SKILL.md` body contains this section, checked by lint:

```markdown
## Scope and authorization
- Purpose: <one line, defensive>
- Use only on systems you own or are explicitly authorized to assess.
- Out of scope: <what this skill will not do>
```

---

## 6. Themis interfaces (Phases 2–4 must use exactly these names)

```ts
// @aegis-skills/themis-core

export type StepId = 'validate' | 'decompose' | 'schedule' | 'fanout' | 'guardrail' | 'synthesise' | 'audit'
export type StepKind = 'deterministic' | 'reasoning'

export interface StepDef {
  id: StepId
  kind: StepKind
  next: StepId[]
  guard?: (run: RunState) => GuardResult       // checked before entering the step
}
export interface GuardResult { ok: boolean; reason?: string }

export const THEMIS_WORKFLOW: { version: string; start: StepId; steps: Record<StepId, StepDef> }

export interface VersionStamp { themis: string; aegis: string; osk: string }

export interface RunState {
  runId: string
  task: string
  step: StepId
  status: 'running' | 'awaiting_approval' | 'completed' | 'failed'
  subTasks: SubTask[]            // existing shape from lib/themis/types.ts
  results: SubTaskResult[]       // existing shape
  findings: Finding[]
  approvals: string[]            // ApprovalRequest ids
  versions: VersionStamp
  createdAt: string
  updatedAt: string
}

export function startRun(task: string, versions: VersionStamp): RunState
export function advance(run: RunState, completed: StepId, output: unknown): { run: RunState; next: StepId | null; error?: string }

export interface ApprovalRequest {
  id: string
  runId: string
  serverId: string
  tool: string
  toolClass: 'write' | 'execute'
  args: unknown                  // already redacted
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  decidedBy: 'human' | null
  createdAt: string
  decidedAt: string | null
}

export interface AuditEvent {
  id: string; runId: string; at: string
  kind: 'step' | 'tool_call' | 'tool_result' | 'approval_requested' | 'approval_decided' | 'finding' | 'error'
  data: unknown                  // redacted
}

export interface ThemisStore {
  saveRun(run: RunState): void
  getRun(runId: string): RunState | null
  listRuns(limit?: number): RunState[]
  appendAudit(e: AuditEvent): void
  listAudit(runId: string): AuditEvent[]
  putApproval(a: ApprovalRequest): void
  getApproval(id: string): ApprovalRequest | null
  listApprovals(filter?: { runId?: string; status?: ApprovalRequest['status'] }): ApprovalRequest[]
  decideApproval(id: string, decision: 'approved' | 'rejected'): ApprovalRequest   // sets decidedBy:'human'
  close(): void
}
export function openStore(path?: string): ThemisStore   // default `${themisHome()}/themis.db`; ':memory:' for tests
export function themisHome(): string                    // $THEMIS_HOME or ~/.themis

// moved unchanged from lib/themis/mcp/*:
export { classifyTool, dispositionFor, serverPermitsApproval, loadMcpServers, serversForSkill }
// moved unchanged from lib/themis/{secrets,sanitise}.ts:
export { redactSecrets, sanitiseTask }
```

```ts
// @aegis-skills/themis-gateway   (depends on themis-core + @modelcontextprotocol/sdk)

export interface GovernedTool {
  name: string                   // `themis__${serverId}__${tool}`
  serverId: string; tool: string
  toolClass: 'read' | 'write' | 'execute'
  disposition: 'auto' | 'approval'
  description: string; inputSchema: unknown
}
export type GatewayResult =
  | { kind: 'result'; text: string }                    // redacted, wrapped as <external_tool_output untrusted>
  | { kind: 'approval_required'; approvalId: string }
  | { kind: 'denied'; reason: string }
  | { kind: 'budget_exhausted' }
  | { kind: 'error'; message: string }                  // soft-fail, never throws to caller

export interface Gateway {
  listTools(): Promise<GovernedTool[]>
  call(name: string, args: unknown): Promise<GatewayResult>
  executeApproved(approvalId: string): Promise<GatewayResult>   // refuses unless status==='approved' && decidedBy==='human'
  callCount(): number
  close(): Promise<void>
}
export function createGateway(opts: { skill: string; runId: string; store: ThemisStore; servers?: McpServerConfig[] }): Gateway
```

**Approval invariant (all modes):** the only code paths that may call `store.decideApproval` are:
- (a) the themis-app dashboard HTTP handler, after its session-token check;
- (b) the themis-plugin MCP *elicitation* response handler.

No MCP tool, LangGraph node or model output may approve. Tests must prove this.

Report stamping: every report and every `RunState` carries `versions`. `themis-app` and `themis-plugin` read the Aegis version from the installed `aegis-skills/package.json` and the osk from any `skill.json`.

Config home: `~/.themis/` (`themis.db`, `config.json`, `.env`), overridable with `THEMIS_HOME`. The external MCP server config keeps today's JSON format (`THEMIS_MCP_SERVERS`), stored as `config.json → mcpServers`.

---

## 7. Aegis MCP adapter and installer

- `packages/aegis/mcp/server.js`: the moved `createAegisMcpServer()`; stdio entry via `aegis mcp`. Runtime dependencies of the whole `aegis` package: `@modelcontextprotocol/sdk`, `zod`, `gray-matter`. Nothing else, enforced by `scripts/check-deps.js`.
- Installer targets live in one data file, `packages/aegis/lib/targets.js`, each row with a `verifiedOn` date. Phase 1 verifies every path against current vendor docs; unverifiable targets ship disabled with a clear message.
- Installed copies contain only `SKILL.md`, `skill.json` and `references/`. Never `intel-state.json` or anything else.
- Auto-refresh: on any `aegis` command, if installed skills are older than the package version, refresh them; files the user edited are saved as `<file>.bak` first. Opt out with `AEGIS_NO_AUTO_REFRESH=1`.

---

## 8. Git conventions

- One branch per phase: `restructure/phase-<N>-<slug>`, from up-to-date `main` after the previous phase merged. Phases 3 and 4 may branch in parallel after Phase 2 merges.
- **File moves are committed separately from edits** (`git mv` only, then a commit), so history and blame survive.
- Conventional commit style as in the repo log: `feat(scope): …`, `refactor(scope): …`, `chore: …`.
- Never commit `.env*`, `graphify-out/`, `*.tgz`, `node_modules/`, `.next/`.
- Each phase ends with a PR to `main`. Opening the PR is the executor's last step; merging is a USER ACTION.

---

## 9. SECURITY.md source text (provided by the user)

Phase 0 creates `SECURITY.md` from this text. It adds a "Supported versions" table and fills the reporting channel with GitHub private vulnerability reporting: <https://github.com/drupadsachania/aegis-skills/security/advisories/new>. The maintainer email is left as a USER ACTION placeholder `<!-- USER: add security contact email -->`.

```markdown
# Security Policy

## Reporting a Vulnerability

We take the security of Aegis and Themis seriously. If you discover a security vulnerability or flaw in any of our skills, rules, or core modules, please disclose it responsibly.

### How to Report
- **Email:** Report security issues directly to the maintainers via email or private security advisory.
- **Do NOT** open public GitHub issues for security vulnerabilities.

### Response Timeline
- **Acknowledgement:** Within 48 hours.
- **Assessment & Fix:** Targeted within 7 business days for critical flaws affecting execution boundaries or guardrails.
```

---

## Corrections (applied 2026-10-08, after all eight plans were written)

These override the sections above where they conflict. Each was found while writing a phase plan and is already reflected in that plan.

1. **§3 CLI path.** The Aegis CLI is `packages/aegis/cli/aegis.js`, NOT `bin/aegis.js`. Claude's docs say claude.ai/Cowork reject a plugin whose root contains `bin/`. The npm `bin` field still maps `aegis` → `./cli/aegis.js`. (Finding 1.1. Phase 5 and Phase 7's tarball allowlist updated to `^cli/`.)
2. **§4 tsconfig.** Use `tsconfig.base.json` with `"module": "node16"`, `"moduleResolution": "node16"`, `"types": ["node"]` — NOT `"module": "commonjs"`, which TypeScript 6 rejects with `node16` resolution. Still emits CommonJS for packages without `"type":"module"`. (Finding 0.1.)
3. **§6 version pins.** Submitted/plugin `.mcp.json` pins are EXACT (`aegis-skills@1.1.0`, `@aegis-skills/themis-plugin@1.1.0`), never `^1`/`~`. The Anthropic directory rejects ranges. Phase 7's bump script rewrites them. (Findings 6.1, 1.3.)
4. **§6 approval `expired` status.** Never produced in practice: `putApproval` accepts only new pending requests, and approvals persist with redacted args, so an approval decided after a process restart is re-proposed (`needs_reproposal`), not executed. (Findings 4.4, 2.x.)
5. **§2 intel-sync.** It is the maintainer's LOCAL Claude scheduled task (Saturdays), not CI, and `.intel-sync-state.json` is gitignored. Phase 7's Monday release workflow builds from what that local task already committed. (Findings 0.5, 7.x.)
6. **Plugins ship no Aegis skills.** The Themis orchestration skill lives in `packages/themis-plugin/skills/`, never in `packages/aegis/skills/`. (Contracts §6 restated; Phase 3 P6.)
7. **Approval channel = elicitation, never sampling.** The human approves via MCP `elicitation` (`server.server.elicitInput`); MCP `sampling`/`createMessage` asks the model and must never gate a write/execute. (Phase 3 Task 5.)
8. **ChatGPT bundle schema is not fully public.** Treat the exact bundle layout as USER-verify in Developer Mode; the Phase 7 `scripts/build-chatgpt-bundle.js` produces the ZIP, Phase 6 supplies its content. (Finding 6.7, F5.)

## Plan status (2026-10-08)

All eight phase plans are written in this folder: phase-0 (10 tasks), phase-1 (21), phase-2 (20), phase-3 (11), phase-4 (26), phase-5 (21), phase-6 (8), phase-7 (17). Execution order: 0 → 1 → (2 → then 3 and 4 in parallel) → 5 → 6, with Phase 7's CI pieces landing alongside 0–4 and its publish last. Cross-phase items and their fold-in status are in `01-cross-phase-findings.md`.
9. **Single branch.** All phases are committed on one branch named `restructure` (created from `main` at `ef6464a`; `main` is left untouched so the current code is preserved). The per-phase branch names in §8 and in each phase plan (`restructure/phase-N-slug`) cannot coexist with a branch called `restructure` in git, so they are not used. Phase PRs, if any, are cut from `restructure`. The user decided this on 2026-10-08.
10. **Stale component tests fixed first.** Seven component tests (HealthBadge, CopyButton, SkillCard, InstallTabs) were failing on `main` because they asserted an older UI. They were updated to the current UI in commit `9de3041` before Phase 0 started, so the Phase 0 baseline is 39 suites / 407 tests, all passing; "baseline +1 suite / +4 tests" in the Phase 0 plan therefore means 40 suites / 411 tests. InstallTabs and its test are rewritten in Phase 1/5 anyway.
11. **Node 24 everywhere.** `engines.node` is `">=24"` in every package (not `>=22.13`), CI uses Node 24, and Vercel is set to Node 24; the dev machine has Node 24 too. Wherever a phase plan says `>=22.13`, "Node 22", or checks `engines.node` against `>=22.13` (including `scripts/check-layout.js`, which already uses `>=24`, and any Phase 7 `check-versions`/`assert-pack` logic), use `>=24` / Node 24 instead. Facts that merely describe when a Node feature arrived (for example `node:sqlite` unflagged since 22.13) stay as written. Decided by the user on 2026-10-08.
12. **No deploy until the restructure is complete.** Nothing is pushed or deployed (Vercel Root Directory change included) until all phases are done. Per-phase PR and Vercel steps in the plans are deferred to the end. Decided by the user on 2026-10-08.
