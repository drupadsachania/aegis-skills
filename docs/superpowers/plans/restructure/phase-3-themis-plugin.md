# Phase 3 — Themis Plugin (Mode 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@aegis-skills/themis-plugin` — the Mode 1 product that runs Themis on top of the user's existing host AI (Claude Code, Codex, Gemini CLI) with no API key. It is a governed MCP stdio server (`themis-mcp`) that exposes `themis-core`'s workflow and deterministic capabilities as tools, re-exposes external security tools through `themis-gateway` under human-only approval, and ships an orchestration skill plus sub-agent definitions.

**Architecture:** The host AI is the reasoning engine; `themis-core` owns the workflow definition and every deterministic decision, and drives stepping via `advance()`. The plugin never reasons and never calls a model. Reasoning steps (`decompose`, `fanout`, `guardrail`, `synthesise`) pause and return a prompt for the host AI to answer and submit back; deterministic steps (`validate`, `schedule`, `audit`) are driven inside core `advance()`. External tools come through `themis-gateway`: reads run immediately (budgeted, redacted, untrusted-wrapped, audited); writes/executes are propose-only and reach a human through MCP **elicitation** — never through the model. Run state persists in the core `node:sqlite` store so runs survive the host restarting the plugin process.

**Tech Stack:** TypeScript → CommonJS via `tsc` (contracts §4), `@modelcontextprotocol/sdk` 1.31.0, `zod`, `@aegis-skills/themis-core`, `@aegis-skills/themis-gateway`. No database or native dependency of its own.

---

## Preconditions

- [ ] **P1. Branch.** From up-to-date `main` after Phase 2 merged: `git checkout main && git pull && git checkout -b restructure/phase-3-themis-plugin` (contracts §8).
- [ ] **P2. Phase 2 merged and green.**
  ```bash
  test -d packages/themis-core/dist && test -d packages/themis-gateway/dist && echo OK
  npx jest --selectProjects themis-core themis-gateway 2>&1 | tail -n 3
  ```
  Missing or red → **STOP**.
- [ ] **P3. Verify every core/gateway export this plan calls.** Mismatch = STOP (do not adapt silently):
  ```bash
  node -e "const c=require('@aegis-skills/themis-core'); for (const k of ['startRun','advance','openStore','themisHome','THEMIS_WORKFLOW','newApprovalRequest','canExecuteApproval','versionStamp','redactSecrets','redactDeep','sanitiseTask','scheduleStage','readySubTasks','auditEvent','MAX_SUBTASKS']) if (typeof c[k]==='undefined') throw new Error('missing core export: '+k); console.log('core exports OK')"
  node -e "const g=require('@aegis-skills/themis-gateway'); if (typeof g.createGateway!=='function') throw new Error('missing createGateway'); console.log('gateway exports OK')"
  ```
- [ ] **P4. Verify the MCP SDK (1.31.0) supports elicitation + in-memory transport.** Both are load-bearing:
  ```bash
  node -e "require('@modelcontextprotocol/sdk/server/mcp.js'); require('@modelcontextprotocol/sdk/server/stdio.js'); const t=require('@modelcontextprotocol/sdk/inMemory.js'); console.log('transports OK', typeof t.InMemoryTransport)"
  node -e "const {McpServer}=require('@modelcontextprotocol/sdk/server/mcp.js'); const s=new McpServer({name:'x',version:'0'}); console.log('elicitInput', typeof s.server.elicitInput, 'getClientCapabilities', typeof s.server.getClientCapabilities)"
  node -e "const {Client}=require('@modelcontextprotocol/sdk/client/index.js'); console.log('client ok', typeof Client)"
  ```
  Expected: `transports OK function`, `elicitInput function getClientCapabilities function`, `client ok function`. If `elicitInput` is missing → **STOP**; do not substitute `sampling`/`createMessage` (that asks the model, letting it approve its own writes).
- [ ] **P5. SEMANTICS PROBE — how `advance()` steps (this plan's one real unknown).** Write and run `scripts/probe-advance.js` to learn exactly how core signals a reasoning pause vs auto-runs deterministic steps, because the tool handlers in Tasks 4/4b depend on it:
  ```bash
  node -e "
  const c=require('@aegis-skills/themis-core');
  const vs=c.versionStamp();
  let run=c.startRun('probe task', vs);
  console.log('start:', JSON.stringify({step:run.step,status:run.status}));
  // Try advancing with no output from the start step and inspect the return shape.
  try { const r=c.advance(run, run.step, undefined); console.log('advance(start):', JSON.stringify({next:r.next, error:r.error, runStep:r.run&&r.run.step, runStatus:r.run&&r.run.status})); }
  catch(e){ console.log('advance(start) threw:', e.message); }
  "
  ```
  Record the answers to these questions in a comment block at the top of `src/tools/workflow-tools.ts` and treat them as the binding contract for the handlers:
  1. After `startRun`, what is `run.step`? (Expected: the workflow start, `validate`.)
  2. Does `advance(run, 'validate', undefined)` return `next` = the first **reasoning** step (`decompose`), having auto-run `validate`? Or does it return `next='validate'` and require the caller to run deterministic steps? **This plan is written for the first behaviour** (core auto-runs deterministic steps inside `advance`; the caller only ever submits reasoning-step outputs). If the probe shows the second behaviour, **STOP** and report — the handlers need core to own deterministic execution.
  3. At the `schedule` join, does `advance` after a `fanout` submission pick `fanout` again (more ready work) vs `guardrail` (done) on its own, using `scheduleStage`? (Expected: yes.)
  4. What does `advance` return at the end (after `audit`)? (Expected: `next === null`.)
- [ ] **P6. Baseline.** `npx jest 2>&1 | tail -n 5` → record counts in `$HOME/aegis-phase3-baseline.txt`. Pre-existing failures are noted, not fixed.
- [ ] **P7. No Aegis skills shipped here.** The orchestration skill lives in `packages/themis-plugin/skills/`. If `packages/aegis/skills/` contains any Themis skill, **STOP** (duplicate names break installs).

---

## Binding values (fixed; do not improvise)

| Token | Value |
|---|---|
| Package name | `@aegis-skills/themis-plugin` |
| Binary | `themis-mcp` |
| Version this phase | `1.1.0` (exact everywhere; Phase 7 bump rewrites) |
| MCP server name (in-protocol) | `themis` |
| `mcpName` | `io.github.drupadsachania/themis` |
| Workflow steps | `validate, decompose, schedule, fanout, guardrail, synthesise, audit` |
| Reasoning steps (host submits) | `decompose, fanout, guardrail, synthesise` |
| Deterministic steps (core auto-runs) | `validate, schedule, audit` |
| External tool namespace | `themis__<serverId>__<tool>` |
| `.mcp.json` pins | `aegis-skills@1.1.0`, `@aegis-skills/themis-plugin@1.1.0` (exact; never `^`/`~`) |

---

## File Structure

```
packages/themis-plugin/
├─ package.json  tsconfig.build.json  jest.config.js        Task 1
├─ .claude-plugin/plugin.json   .mcp.json   server.json     Task 9
├─ skills/themis-orchestrator/{SKILL.md,skill.json}         Task 7
├─ agents/{themis-subtask-runner.md,themis-guardrail-reviewer.md}  Task 8
├─ src/
│  ├─ index.ts            bin entry (stdio bootstrap)        Task 6
│  ├─ server.ts           createThemisMcpServer(deps)        Task 3
│  ├─ deps.ts             buildDeps(): store, versions, gatewayFor  Task 3
│  ├─ step-io.ts          zod schemas per reasoning step     Task 2
│  ├─ prompts.ts          pulls core prompt builders         Task 2
│  ├─ errors.ts           structured tool-error helper       Task 2
│  ├─ approval.ts         ONLY approval decider (elicitation) Task 5
│  └─ tools/
│     ├─ workflow-tools.ts   start_run/submit_step/get_run/list_runs  Task 4
│     ├─ capability-tools.ts validate_exposure/assess_risk/record_finding/get_report  Task 4b
│     └─ gateway-tools.ts    external_list/external_call      Task 5
└─ test/
   ├─ step-io.test.ts  server.test.ts  workflow-tools.test.ts
   ├─ capability-tools.test.ts  gateway-tools.test.ts
   ├─ approval-invariant.test.ts  workflow-e2e.test.ts  resume.test.ts   Tasks 2–10
```

Also modified: root `.claude-plugin/marketplace.json`; `scripts/check-deps-themis.js` (`APPROVAL_DECIDERS`); `scripts/check-layout.js`.

---

## Tasks

### Task 1 — Scaffold the package (executor: haiku)

**Files:** `packages/themis-plugin/{package.json,tsconfig.build.json,jest.config.js}`, placeholder `src/index.ts`

- [ ] **1.1** Create `packages/themis-plugin/package.json` exactly:
  ```json
  {
    "name": "@aegis-skills/themis-plugin",
    "version": "1.1.0",
    "description": "Governed MCP server that runs Themis security workflows on your own AI, with human-approved tool use.",
    "license": "(Apache-2.0 OR MIT)",
    "type": "commonjs",
    "engines": { "node": ">=22.13" },
    "bin": { "themis-mcp": "./dist/index.js" },
    "main": "./dist/server.js",
    "mcpName": "io.github.drupadsachania/themis",
    "files": ["dist/", "skills/", "agents/", ".claude-plugin/", ".mcp.json", "server.json"],
    "repository": { "type": "git", "url": "https://github.com/drupadsachania/aegis-skills", "directory": "packages/themis-plugin" },
    "scripts": { "build": "tsc -p tsconfig.build.json", "test": "jest" },
    "dependencies": {
      "@aegis-skills/themis-core": "1.1.0",
      "@aegis-skills/themis-gateway": "1.1.0",
      "@modelcontextprotocol/sdk": "1.31.0",
      "zod": "^3.23.8"
    }
  }
  ```
  SDK is `1.31.0` (repo version), not `1.1.0`. No `sqlite3`/`better-sqlite3`.
- [ ] **1.2** Create `tsconfig.build.json`:
  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": { "outDir": "./dist", "rootDir": "./src", "composite": false },
    "include": ["src/**/*"],
    "exclude": ["test/**/*", "dist/**/*"]
  }
  ```
  Do NOT override `module`/`moduleResolution` (inherit `node16`; contracts correction 2).
- [ ] **1.3** Create `jest.config.js`:
  ```js
  module.exports = {
    testEnvironment: 'node',
    transform: { '^.+\\.ts$': ['@swc/jest'] },
    testMatch: ['<rootDir>/test/**/*.test.ts'],
    moduleNameMapper: {
      '^@aegis-skills/themis-core$': '<rootDir>/../themis-core/src/index.ts',
      '^@aegis-skills/themis-gateway$': '<rootDir>/../themis-gateway/src/index.ts'
    }
  }
  ```
- [ ] **1.4** Create placeholder `src/index.ts` with `export {}` (filled in Task 6).
- [ ] **1.5** `git add packages/themis-plugin && git commit -m "feat(themis-plugin): scaffold package"`.

**STOP** if install pulls `@langchain/*` or any native module into this package.

---

### Task 2 — Errors, step I/O schemas, prompts (executor: sonnet)

**Files:** `src/errors.ts`, `src/step-io.ts`, `src/prompts.ts`, `test/step-io.test.ts`

- [ ] **2.1** Create `src/errors.ts` (complete):
  ```ts
  // A tool handler never throws across the MCP boundary; it returns a structured text result.
  export interface ToolError { ok: false; error: string; code: string }
  export function toolError(code: string, error: string): ToolError { return { ok: false, error, code } }
  export function textResult(payload: unknown) {
    return { content: [{ type: 'text' as const, text: JSON.stringify(payload) }] }
  }
  export function errorResult(code: string, error: string) {
    return { ...textResult(toolError(code, error)), isError: true }
  }
  ```
- [ ] **2.2 (TDD)** Write `test/step-io.test.ts` first (complete):
  ```ts
  import { parseStepInput } from '../src/step-io'

  describe('parseStepInput', () => {
    it('accepts a valid decompose payload', () => {
      const out = parseStepInput('decompose', { subTasks: [{ id: 's1', skill: 'attack-surface-mapping', task: 'enumerate', dependsOn: [] }] })
      expect(out.subTasks).toHaveLength(1)
    })
    it('rejects decompose with an unknown key', () => {
      expect(() => parseStepInput('decompose', { subTasks: [], extra: 1 })).toThrow()
    })
    it('rejects decompose with a non-string skill', () => {
      expect(() => parseStepInput('decompose', { subTasks: [{ id: 's1', skill: 5, task: 't' }] })).toThrow()
    })
    it('accepts a valid fanout payload (results for the ready stage)', () => {
      const out = parseStepInput('fanout', { results: [{ subTaskId: 's1', skill: 'attack-surface-mapping', output: 'x', guardrail: 'pass' }] })
      expect(out.results).toHaveLength(1)
    })
    it('accepts a valid guardrail payload', () => {
      const out = parseStepInput('guardrail', { verdicts: [{ subTaskId: 's1', verdict: 'pass' }] })
      expect(out.verdicts[0].verdict).toBe('pass')
    })
    it('accepts a valid synthesise payload', () => {
      const out = parseStepInput('synthesise', { report: { summary: 'ok', findings: [] } })
      expect(out.report.summary).toBe('ok')
    })
    it('rejects an unknown step name', () => {
      expect(() => parseStepInput('nope' as any, {})).toThrow(/unknown reasoning step/)
    })
  })
  ```
  Run: `npx jest --selectProjects themis-plugin step-io` → fails (module absent).
- [ ] **2.3** Create `src/step-io.ts` (complete). Import limits/types from core; keep the local zod shapes minimal and `.strict()`:
  ```ts
  import { z } from 'zod'
  import { MAX_SUBTASKS } from '@aegis-skills/themis-core'

  export type ReasoningStep = 'decompose' | 'fanout' | 'guardrail' | 'synthesise'

  const SubTask = z.object({
    id: z.string().min(1),
    skill: z.string().min(1),
    task: z.string().min(1),
    dependsOn: z.array(z.string()).optional().default([])
  }).strict()

  const GUARDRAIL = z.enum(['pass', 'warn', 'fail'])

  const SubTaskResult = z.object({
    subTaskId: z.string().min(1),
    skill: z.string().min(1),
    output: z.string(),
    guardrail: GUARDRAIL
  }).strict()

  const Report = z.object({
    summary: z.string().min(1),
    findings: z.array(z.any()).default([])
  }).passthrough() // core owns the full Finding shape; record_finding validates those strictly

  const SCHEMAS: Record<ReasoningStep, z.ZodType> = {
    decompose: z.object({ subTasks: z.array(SubTask).min(1).max(MAX_SUBTASKS) }).strict(),
    fanout: z.object({ results: z.array(SubTaskResult).min(1).max(MAX_SUBTASKS) }).strict(),
    guardrail: z.object({ verdicts: z.array(z.object({ subTaskId: z.string(), verdict: GUARDRAIL }).strict()).min(1) }).strict(),
    synthesise: z.object({ report: Report }).strict()
  }

  export function parseStepInput<K extends ReasoningStep>(step: K, raw: unknown) {
    const schema = SCHEMAS[step]
    if (!schema) throw new Error(`unknown reasoning step: ${step}`)
    return schema.parse(raw) as any
  }
  export function isReasoningStep(s: string): s is ReasoningStep {
    return s === 'decompose' || s === 'fanout' || s === 'guardrail' || s === 'synthesise'
  }
  ```
  > If core exports canonical `SubTask`/`SubTaskResult`/`Finding` zod schemas, import and reuse them instead of these local shapes, and update the test imports — note the swap in your report. The `skill` value is validated against the known-skill list in Task 4 (needs the gateway/skill-reader), not here.
- [ ] **2.4** Create `src/prompts.ts` (complete):
  ```ts
  import type { ReasoningStep } from './step-io'
  import * as core from '@aegis-skills/themis-core'

  // Pull the host-facing instruction for a reasoning step from core's prompt builders,
  // so Mode 1 and Mode 2 reason over identical text. No prompt text is authored here.
  const BUILDERS: Record<ReasoningStep, (run: any) => string> = {
    decompose: (run) => core.prompts.decompose(run),
    fanout: (run) => core.prompts.fanout(run),
    guardrail: (run) => core.prompts.guardrail(run),
    synthesise: (run) => core.prompts.synthesise(run)
  }

  export function promptFor(step: ReasoningStep, run: unknown): string {
    const b = BUILDERS[step]
    if (!b) throw new Error(`no prompt builder for step: ${step}`)
    return b(run)
  }
  ```
  > **Binding:** confirm core exposes `prompts.{decompose,fanout,guardrail,synthesise}` (Phase 2 put prompt builders in `core/src/prompts/*`). If the export path differs (e.g. `core.decomposePrompt`), use the real names and record it. If a builder is absent, **STOP** — do not author prompt text (it must match Mode 2).
- [ ] **2.5** Make 2.2 green. `git commit -m "feat(themis-plugin): errors, step I/O schemas, prompt wiring"`.

---

### Task 3 — Deps bundle and server skeleton (executor: sonnet)

**Files:** `src/deps.ts`, `src/server.ts`, `test/server.test.ts`

- [ ] **3.1** Create `src/deps.ts` (complete):
  ```ts
  import { openStore, themisHome, versionStamp, type ThemisStore, type VersionStamp } from '@aegis-skills/themis-core'
  import { createGateway, type Gateway } from '@aegis-skills/themis-gateway'

  export interface PluginDeps {
    store: ThemisStore
    versions: VersionStamp
    gatewayFor: (skill: string, runId: string) => Gateway
    close: () => void
  }

  export function buildDeps(opts: { storePath?: string } = {}): PluginDeps {
    const store = openStore(opts.storePath) // default `${themisHome()}/themis.db`; ':memory:' in tests
    const versions = versionStamp()
    const gateways = new Map<string, Gateway>()
    return {
      store, versions,
      gatewayFor(skill, runId) {
        const key = `${runId}::${skill}`
        let g = gateways.get(key)
        if (!g) { g = createGateway({ skill, runId, store }); gateways.set(key, g) }
        return g // one per (run,skill), kept in memory so executeApproved runs on the proposing instance
      },
      close() { for (const g of gateways.values()) { try { (g as any).close?.() } catch {} } try { store.close() } catch {} }
    }
  }
  ```
  Note `themisHome` is imported so the default path is unambiguous even though `openStore()` applies it.
- [ ] **3.2** Create `src/server.ts` (complete, under 60 lines):
  ```ts
  import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
  import type { PluginDeps } from './deps'
  import { registerWorkflowTools } from './tools/workflow-tools'
  import { registerCapabilityTools } from './tools/capability-tools'
  import { registerGatewayTools } from './tools/gateway-tools'

  const pkg = require('../package.json') as { version: string }

  export function createThemisMcpServer(deps: PluginDeps): McpServer {
    const server = new McpServer({ name: 'themis', version: pkg.version })
    registerWorkflowTools(server, deps)
    registerCapabilityTools(server, deps)
    registerGatewayTools(server, deps)
    return server
  }
  ```
- [ ] **3.3 (TDD)** Write `test/server.test.ts` (complete):
  ```ts
  import { createThemisMcpServer } from '../src/server'
  import { buildDeps } from '../src/deps'

  it('registers the workflow and capability tools', async () => {
    const deps = buildDeps({ storePath: ':memory:' })
    const server = createThemisMcpServer(deps)
    // McpServer keeps a registry; assert via the low-level server's listTools handler.
    const names = Object.keys((server as any)._registeredTools ?? {})
    for (const n of ['themis_start_run', 'themis_submit_step', 'themis_get_run', 'themis_list_runs',
                     'themis_validate_exposure', 'themis_assess_risk', 'themis_record_finding', 'themis_get_report',
                     'themis_external_list', 'themis_external_call']) {
      expect(names).toContain(n)
    }
    deps.close()
  })
  ```
  > If `_registeredTools` is not the SDK's internal field name in 1.31.0, discover the real accessor with `node -e "const {McpServer}=require('@modelcontextprotocol/sdk/server/mcp.js'); const s=new McpServer({name:'x',version:'0'}); s.tool('t','d',{},async()=>({content:[]})); console.log(Object.keys(s))"` and use it; record the field name. Run red → green across Tasks 4–5.
- [ ] **3.4** `git commit -m "feat(themis-plugin): deps bundle and server skeleton"`.

---

### Task 4 — Workflow driver tools (executor: sonnet)

**Files:** `src/tools/workflow-tools.ts`, `test/workflow-tools.test.ts`

Implements the P5 semantics: core `advance()` auto-runs deterministic steps; the plugin only submits reasoning outputs and reports the next reasoning step (or completion).

- [ ] **4.1 (TDD)** Write `test/workflow-tools.test.ts` (complete). It uses an in-memory store and a fake host that produces canned reasoning outputs, calling the registered handlers directly (not over MCP — that is Task 10's E2E):
  ```ts
  import { createThemisMcpServer } from '../src/server'
  import { buildDeps } from '../src/deps'

  // Helper: invoke a registered tool's handler directly.
  function handler(server: any, name: string) {
    const t = (server._registeredTools ?? {})[name]
    if (!t) throw new Error('no tool ' + name)
    return (args: any, extra: any = {}) => t.callback(args, extra)
  }
  const parse = (r: any) => JSON.parse(r.content[0].text)

  it('drives a full run: start → decompose → fanout → guardrail → synthesise → completed', async () => {
    const deps = buildDeps({ storePath: ':memory:' })
    const server: any = createThemisMcpServer(deps)
    const start = handler(server, 'themis_start_run')
    const submit = handler(server, 'themis_submit_step')

    let r = parse(await start({ task: 'assess the external perimeter' }))
    expect(r.step).toBe('decompose')             // validate auto-ran inside advance()
    expect(typeof r.prompt).toBe('string')
    const runId = r.runId

    r = parse(await submit({ runId, step: 'decompose', output: { subTasks: [
      { id: 's1', skill: 'attack-surface-mapping', task: 'enumerate hosts', dependsOn: [] }
    ] } }))
    expect(r.step).toBe('fanout')                // schedule auto-ran, dispatched s1
    expect(r.ready.map((x: any) => x.id)).toEqual(['s1'])

    r = parse(await submit({ runId, step: 'fanout', output: { results: [
      { subTaskId: 's1', skill: 'attack-surface-mapping', output: 'found 3 hosts', guardrail: 'pass' }
    ] } }))
    expect(r.step).toBe('guardrail')             // schedule join saw all ready done → guardrail

    r = parse(await submit({ runId, step: 'guardrail', output: { verdicts: [ { subTaskId: 's1', verdict: 'pass' } ] } }))
    expect(r.step).toBe('synthesise')

    r = parse(await submit({ runId, step: 'synthesise', output: { report: { summary: 'perimeter mapped', findings: [] } } }))
    expect(r.status).toBe('completed')
    expect(r.versions.themis).toBeTruthy()
    expect(r.versions.aegis).toBeTruthy()
    deps.close()
  })

  it('rejects a stale or out-of-order submit (idempotent)', async () => {
    const deps = buildDeps({ storePath: ':memory:' })
    const server: any = createThemisMcpServer(deps)
    const start = handler(server, 'themis_start_run'); const submit = handler(server, 'themis_submit_step')
    const { runId } = parse(await start({ task: 'x' }))
    const bad = parse(await submit({ runId, step: 'guardrail', output: { verdicts: [] } })) // current step is decompose
    expect(bad.code).toBe('stale_step')
    deps.close()
  })

  it('returns a structured error for an unknown runId', async () => {
    const deps = buildDeps({ storePath: ':memory:' })
    const server: any = createThemisMcpServer(deps)
    const got = parse(await handler(server, 'themis_get_run')({ runId: 'nope' }))
    expect(got.code).toBe('no_such_run')
    deps.close()
  })
  ```
  Run red.
- [ ] **4.2** Create `src/tools/workflow-tools.ts` (complete):
  ```ts
  /* advance() semantics (verified in P5):
   *  - startRun returns run at step 'validate' (deterministic start).
   *  - advance(run, completedStep, output) auto-runs any following deterministic steps
   *    and returns { run, next, error } where `next` is the next REASONING step id,
   *    or null when the run is complete (after 'audit').
   *  - At the 'schedule' join advance uses scheduleStage() to pick 'fanout' vs 'guardrail'.
   * If P5 showed different behaviour, STOP — do not patch around it here.
   */
  import { z } from 'zod'
  import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
  import {
    startRun, advance, redactDeep, auditEvent, readySubTasks, THEMIS_WORKFLOW
  } from '@aegis-skills/themis-core'
  import type { PluginDeps } from '../deps'
  import { parseStepInput, isReasoningStep } from '../step-io'
  import { promptFor } from '../prompts'
  import { textResult, errorResult } from '../errors'

  // Shape the handler returns when it pauses on a reasoning step.
  function pausePayload(run: any) {
    const base: any = { runId: run.runId, step: run.step, status: run.status, versions: run.versions, prompt: promptFor(run.step, run) }
    if (run.step === 'fanout') base.ready = readySubTasks(run).map((t: any) => ({ id: t.id, skill: t.skill, task: t.task }))
    return base
  }
  function donePayload(run: any) {
    return { runId: run.runId, status: 'completed', report: run.report, versions: run.versions }
  }

  // Drive core advance() from the current step until the run pauses on a reasoning step or completes.
  // `completedStep`/`output` apply to the FIRST advance only (the step the host just finished).
  function drive(deps: PluginDeps, run: any, completedStep: string, output: unknown) {
    let r = advance(run, completedStep, output)
    if (r.error) return { run: r.run, error: r.error }
    deps.store.saveRun(r.run)
    deps.store.appendAudit(auditEvent(r.run.runId, 'step', { step: r.run.step }, new Date().toISOString()))
    return { run: r.run, next: r.next ?? null }
  }

  export function registerWorkflowTools(server: McpServer, deps: PluginDeps) {
    server.tool('themis_start_run',
      'Start a governed Themis security run for a task. Returns the first step to reason over.',
      { task: z.string().min(1), context: z.record(z.any()).optional() },
      async ({ task, context }) => {
        try {
          const run = startRun(task, deps.versions, { context })
          deps.store.saveRun(run)
          deps.store.appendAudit(auditEvent(run.runId, 'step', { step: run.step, start: true }, new Date().toISOString()))
          const out = drive(deps, run, run.step, undefined) // auto-run leading deterministic steps (validate…)
          if (out.error) return textResult({ runId: run.runId, status: 'failed', error: out.error })
          return textResult(out.next === null ? donePayload(out.run) : pausePayload(out.run))
        } catch (e: any) { return errorResult('start_failed', e?.message ?? String(e)) }
      })

    server.tool('themis_submit_step',
      'Submit the host AI output for the current reasoning step and advance the run.',
      { runId: z.string(), step: z.string(), output: z.record(z.any()) },
      async ({ runId, step, output }) => {
        try {
          const run = deps.store.getRun(runId)
          if (!run) return textResult({ code: 'no_such_run', error: `no run ${runId}` })
          if (run.step !== step) return textResult({ code: 'stale_step', error: `run is at '${run.step}', not '${step}'`, step: run.step })
          if (!isReasoningStep(step)) return textResult({ code: 'not_reasoning', error: `'${step}' is not a reasoning step` })
          let parsed
          try { parsed = parseStepInput(step, output) }
          catch (e: any) { return textResult({ code: 'bad_output', error: e?.message ?? String(e) }) }
          const out = drive(deps, run, step, parsed)
          if (out.error) return textResult({ runId, step: out.run.step, code: 'guard_failed', error: out.error })
          return textResult(out.next === null ? donePayload(out.run) : pausePayload(out.run))
        } catch (e: any) { return errorResult('submit_failed', e?.message ?? String(e)) }
      })

    server.tool('themis_get_run', 'Get the current state of a run (redacted).',
      { runId: z.string() },
      async ({ runId }) => {
        const run = deps.store.getRun(runId)
        if (!run) return textResult({ code: 'no_such_run', error: `no run ${runId}` })
        return textResult(redactDeep(run))
      })

    server.tool('themis_list_runs', 'List recent runs.',
      { limit: z.number().int().positive().max(100).optional() },
      async ({ limit }) => textResult(deps.store.listRuns(limit ?? 20).map((r: any) =>
        ({ runId: r.runId, task: r.task, step: r.step, status: r.status, versions: r.versions }))))
  }
  ```
  > `THEMIS_WORKFLOW` is imported only to assert step names at build time if you add a dev check; it may be unused at runtime — if the linter flags it, drop the import.
- [ ] **4.3 Fan-out rule.** The `fanout` pause returns `ready` (the sub-tasks `scheduleStage` dispatched). The host runs them and submits **all** results in one `fanout` output. Core's `advance` applies them, returns to `schedule`, and the join picks `fanout` again (more ready) or `guardrail` (done). The plugin advances the join once per stage (finding 4.6) — it never calls `advance` per sub-task.
- [ ] **4.4** Make 4.1 green. `git commit -m "feat(themis-plugin): workflow driver tools"`.

**STOP** if P5 showed core does not auto-run deterministic steps inside `advance`.

---

### Task 4b — Deterministic capability tools (executor: sonnet)

**Files:** `src/tools/capability-tools.ts`, `test/capability-tools.test.ts`

Direct access to core's deterministic security capabilities — no workflow step, no model.

- [ ] **4b.1 (TDD)** Write `test/capability-tools.test.ts` (complete):
  ```ts
  import { createThemisMcpServer } from '../src/server'
  import { buildDeps } from '../src/deps'
  function handler(server: any, name: string) { const t = server._registeredTools[name]; return (a: any, x: any = {}) => t.callback(a, x) }
  const parse = (r: any) => JSON.parse(r.content[0].text)

  it('validate_exposure runs the CTEM state machine deterministically', async () => {
    const deps = buildDeps({ storePath: ':memory:' }); const s: any = createThemisMcpServer(deps)
    const r = parse(await handler(s, 'themis_validate_exposure')({
      evidence: { exposure: 'confirmed', exploitability: 'poc', businessCriticality: 'high' }
    }))
    expect(r).toHaveProperty('state')       // exposure report carries a resolved state
    deps.close()
  })
  it('record_finding persists to the run and get_report returns it stamped', async () => {
    const deps = buildDeps({ storePath: ':memory:' }); const s: any = createThemisMcpServer(deps)
    const start = handler(s, 'themis_start_run')
    const { runId } = parse(await start({ task: 't' }))
    const rec = parse(await handler(s, 'themis_record_finding')({ runId, finding: { title: 'open port', severity: 'medium' } }))
    expect(rec.ok).not.toBe(false)
    const rep = parse(await handler(s, 'themis_get_report')({ runId }))
    expect(rep.versions.aegis).toBeTruthy()
    deps.close()
  })
  ```
  > Match the `evidence`/`finding` shapes to core's real `EvidenceInput`/`Finding` types — read them from `@aegis-skills/themis-core` and adjust the test inputs before writing the handler. If the field names differ, use the real ones.
- [ ] **4b.2** Create `src/tools/capability-tools.ts` (complete):
  ```ts
  import { z } from 'zod'
  import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
  import * as core from '@aegis-skills/themis-core'
  import type { PluginDeps } from '../deps'
  import { textResult, errorResult } from '../errors'

  export function registerCapabilityTools(server: McpServer, deps: PluginDeps) {
    server.tool('themis_validate_exposure',
      'Run the deterministic CTEM exposure state machine over evidence (not the workflow validate step).',
      { evidence: z.record(z.any()) },
      async ({ evidence }) => {
        try { return textResult(core.validateExposure(evidence)) }   // BINDING: confirm core export name (Phase 2)
        catch (e: any) { return errorResult('exposure_failed', e?.message ?? String(e)) }
      })

    server.tool('themis_assess_risk', 'Score risk for a finding/context with the deterministic risk model.',
      { input: z.record(z.any()) },
      async ({ input }) => {
        try { return textResult(core.evaluateRisk(input)) }          // BINDING: confirm core export name
        catch (e: any) { return errorResult('risk_failed', e?.message ?? String(e)) }
      })

    server.tool('themis_record_finding', 'Record an analysis finding on a run (local store only).',
      { runId: z.string(), finding: z.record(z.any()) },
      async ({ runId, finding }) => {
        try {
          const run = deps.store.getRun(runId)
          if (!run) return textResult({ code: 'no_such_run', error: `no run ${runId}` })
          const f = core.parseFinding ? core.parseFinding(finding) : finding // BINDING: use core validator if present
          run.findings = [...(run.findings ?? []), f]
          run.updatedAt = new Date().toISOString()
          deps.store.saveRun(run)
          deps.store.appendAudit(core.auditEvent(runId, 'finding', core.redactDeep(f), run.updatedAt))
          return textResult({ ok: true, count: run.findings.length })
        } catch (e: any) { return errorResult('finding_failed', e?.message ?? String(e)) }
      })

    server.tool('themis_get_report', 'Get the stamped report for a run.',
      { runId: z.string() },
      async ({ runId }) => {
        const run = deps.store.getRun(runId)
        if (!run) return textResult({ code: 'no_such_run', error: `no run ${runId}` })
        return textResult({ report: run.report ?? null, findings: run.findings ?? [], versions: run.versions })
      })
  }
  ```
  > Each `// BINDING` line names a core function this plan assumes. Before writing, confirm the real names from Phase 2's export list (`validateExposure`/`evaluateRisk`/`parseFinding` may be `verify`/`assessRisk`/`Finding.parse`). If one is absent, **STOP** and report — do not reimplement core logic here.
- [ ] **4b.3** Make 4b.1 green. `git commit -m "feat(themis-plugin): deterministic capability tools"`.

---

### Task 5 — Governed external tools + human-only approval (executor: sonnet)

**Files:** `src/approval.ts`, `src/tools/gateway-tools.ts`, `test/approval-invariant.test.ts`, `test/gateway-tools.test.ts`

**Read `00-contracts.md` §6 "Approval invariant" and correction 7 before writing.** This is the security core of the phase.

- [ ] **5.1 (TDD — invariant FIRST)** Write `test/approval-invariant.test.ts` (complete):
  ```ts
  import { readFileSync, readdirSync } from 'node:fs'
  import { join } from 'node:path'
  import { createThemisMcpServer } from '../src/server'
  import { buildDeps } from '../src/deps'
  import { newApprovalRequest, canExecuteApproval } from '@aegis-skills/themis-core'

  function srcFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap(e =>
      e.isDirectory() ? srcFiles(join(dir, e.name)) : e.name.endsWith('.ts') ? [join(dir, e.name)] : [])
  }
  function handler(server: any, name: string) { const t = server._registeredTools[name]; return (a: any, x: any = {}) => t.callback(a, x) }
  const parse = (r: any) => JSON.parse(r.content[0].text)

  describe('approval invariant', () => {
    it('only src/approval.ts references store.decideApproval', () => {
      const offenders = srcFiles(join(__dirname, '..', 'src'))
        .filter(f => /\.decideApproval\s*\(/.test(readFileSync(f, 'utf8')))
        .filter(f => !f.endsWith(`approval.ts`))
      expect(offenders).toEqual([])
    })

    it('canExecuteApproval gates on approved + human', () => {
      const a = newApprovalRequest({ runId: 'r', serverId: 'osint', tool: 'create_ticket', toolClass: 'write', args: {}, reason: 'x' })
      expect(canExecuteApproval(a).ok).toBe(false)                                   // pending
      expect(canExecuteApproval({ ...a, status: 'approved', decidedBy: null }).ok).toBe(false)  // model/none
      expect(canExecuteApproval({ ...a, status: 'approved', decidedBy: 'human' }).ok).toBe(true)
    })

    it('a write with NO client elicitation stays pending and executes nothing', async () => {
      const deps = buildDeps({ storePath: ':memory:' })
      // Fake gateway: a write tool returns approval_required; executeApproved must never be reached.
      let executed = false
      const fakeGateway = {
        listTools: async () => [{ name: 'themis__osint__create_ticket', serverId: 'osint', tool: 'create_ticket', toolClass: 'write', disposition: 'approval', description: 'd', inputSchema: {} }],
        call: async () => ({ kind: 'approval_required', approvalId: mkApproval(deps) }),
        executeApproved: async () => { executed = true; return { kind: 'result', text: 'x' } },
        callCount: () => 0, close: async () => {}
      }
      ;(deps as any).gatewayFor = () => fakeGateway
      const s: any = createThemisMcpServer(deps)
      // No client capabilities set → server.getClientCapabilities() returns undefined/elicitation absent.
      const r = parse(await handler(s, 'themis_external_call')({ runId: 'r', skill: 'attack-surface-mapping', tool: 'themis__osint__create_ticket', args: { title: 't' }, reason: 'need record' }))
      expect(r.status).toBe('human_handoff')
      expect(executed).toBe(false)
      deps.close()

      function mkApproval(d: any) {
        const a = newApprovalRequest({ runId: 'r', serverId: 'osint', tool: 'create_ticket', toolClass: 'write', args: { title: 't' }, reason: 'need record' })
        d.store.putApproval(a); return a.id
      }
    })
  })
  ```
  Run red.
- [ ] **5.2** Create `src/approval.ts` (complete — the ONLY decider):
  ```ts
  import { canExecuteApproval } from '@aegis-skills/themis-core'
  import type { ThemisStore } from '@aegis-skills/themis-core'
  import type { Gateway, GatewayResult } from '@aegis-skills/themis-gateway'

  // The ONLY function in this package permitted to call store.decideApproval.
  // Reachable only from an elicitation RESPONSE (a human), never from a tool handler or model output.
  export async function decideFromHuman(
    store: ThemisStore, gateway: Gateway, approvalId: string, accept: boolean
  ): Promise<GatewayResult> {
    const decided = store.decideApproval(approvalId, accept ? 'approved' : 'rejected') // sets decidedBy:'human', audits
    if (!accept) return { kind: 'denied', reason: 'rejected by human' }
    if (!canExecuteApproval(decided).ok) return { kind: 'denied', reason: 'approval not executable' }
    return gateway.executeApproved(approvalId) // runs on the proposing gateway instance (holds un-redacted args)
  }
  ```
- [ ] **5.3** Create `src/tools/gateway-tools.ts` (complete). A single per-call dispatcher (not per-run tool registration, since the stdio server is built once):
  ```ts
  import { z } from 'zod'
  import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
  import type { PluginDeps } from '../deps'
  import { decideFromHuman } from '../approval'
  import { textResult, errorResult } from '../errors'

  function clientSupportsElicitation(server: McpServer): boolean {
    try { return !!(server.server.getClientCapabilities() as any)?.elicitation } catch { return false }
  }

  export function registerGatewayTools(server: McpServer, deps: PluginDeps) {
    server.tool('themis_external_list',
      'List the governed external security tools available to a run for a skill.',
      { runId: z.string(), skill: z.string() },
      async ({ runId, skill }) => {
        try {
          const tools = await deps.gatewayFor(skill, runId).listTools()
          return textResult(tools.map(t => ({ name: t.name, toolClass: t.toolClass, disposition: t.disposition, description: t.description, inputSchema: t.inputSchema })))
        } catch (e: any) { return errorResult('list_failed', e?.message ?? String(e)) }
      })

    server.tool('themis_external_call',
      'Call a governed external tool. Reads run immediately; writes/executes require human approval.',
      { runId: z.string(), skill: z.string(), tool: z.string(), args: z.record(z.any()), reason: z.string().optional() },
      async ({ runId, skill, tool, args, reason }) => {
        try {
          const gateway = deps.gatewayFor(skill, runId)
          const res = await gateway.call(tool, args, { reason })
          switch (res.kind) {
            case 'result': return textResult({ status: 'ok', output: res.text })
            case 'budget_exhausted': return textResult({ status: 'budget_exhausted' })
            case 'denied': return textResult({ status: 'denied', reason: res.reason })
            case 'error': return textResult({ status: 'error', error: res.message })
            case 'approval_required': {
              const approval = deps.store.getApproval(res.approvalId)
              if (clientSupportsElicitation(server)) {
                // Ask the HUMAN via the client's own prompt. Never sampling/createMessage.
                const elicited: any = await server.server.elicitInput({
                  message: `Approve ${approval?.toolClass ?? 'write'} tool "${approval?.tool}"? Reason: ${approval?.reason ?? reason ?? ''}`,
                  requestedSchema: { type: 'object', properties: { approve: { type: 'boolean', description: 'Approve this action' } }, required: ['approve'] }
                })
                const accept = elicited?.action === 'accept' && elicited?.content?.approve === true
                const out = await decideFromHuman(deps.store, gateway, res.approvalId, accept)
                return textResult(out.kind === 'result' ? { status: 'ok', output: out.text } : { status: out.kind, reason: (out as any).reason })
              }
              // No elicitation: hand back to the human. NEVER execute.
              return textResult({
                status: 'human_handoff',
                approvalId: res.approvalId,
                proposed: { tool, reason: reason ?? approval?.reason ?? '' },
                instruction: 'This write/execute action is not run by Themis. A human must perform it through the host’s own permission-gated tools.'
              })
            }
          }
        } catch (e: any) { return errorResult('call_failed', e?.message ?? String(e)) }
      })
  }
  ```
  > `elicitInput`'s return shape (`{action:'accept'|'decline'|'cancel', content?}`) is from the MCP SDK's elicitation result; confirm the exact field names against 1.31.0 in P4's probe and adjust the `accept` check if they differ. If the SDK throws when the client lacks the capability (instead of `getClientCapabilities` reporting it), wrap `elicitInput` in try/catch and fall through to `human_handoff`.
- [ ] **5.4** Write `test/gateway-tools.test.ts` (complete): a read tool returns `status:'ok'` with wrapped output and raises the gateway call count; a budget-exhausted call returns `status:'budget_exhausted'`; a write with a stub client advertising elicitation that *accepts* calls `executeApproved` exactly once and returns `ok`; a write with a client that *declines* returns `denied` and does not execute. (Use a fake gateway and a fake `server.server.getClientCapabilities`/`elicitInput` via a thin wrapper object.)
- [ ] **5.5** Add `packages/themis-plugin/src/approval.ts` to `APPROVAL_DECIDERS` in `scripts/check-deps-themis.js` (Phase 2's guard). Confirm `node scripts/check-deps-themis.js` passes.
- [ ] **5.6** Make 5.1 and 5.4 green. `git commit -m "feat(themis-plugin): governed external tools with human-only elicitation approval"`.

**STOP** if any path lets model output set an approval to `approved`; if `elicitInput`/`getClientCapabilities` behave unlike P4.

---

### Task 6 — Server bootstrap (executor: haiku)

**Files:** `src/index.ts`

- [ ] **6.1** Replace `src/index.ts` (complete):
  ```ts
  #!/usr/bin/env node
  import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
  import { createThemisMcpServer } from './server'
  import { buildDeps } from './deps'

  async function main() {
    const deps = buildDeps()
    const server = createThemisMcpServer(deps)
    const transport = new StdioServerTransport()
    const shutdown = async () => { try { await server.close() } catch {} try { deps.close() } catch {} process.exit(0) }
    process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown)
    await server.connect(transport)
    process.stderr.write('themis MCP server ready on stdio\n')
  }
  main().catch(e => { process.stderr.write(`themis MCP server failed: ${e?.message ?? e}\n`); process.exit(1) })
  ```
- [ ] **6.2** `npm run build -w @aegis-skills/themis-plugin`; confirm `dist/index.js` exists and `node packages/themis-plugin/dist/index.js </dev/null` prints the ready line to stderr then exits on EOF. `git commit -m "feat(themis-plugin): stdio bootstrap"`.

---

### Task 7 — Orchestration skill (executor: sonnet)

**Files:** `packages/themis-plugin/skills/themis-orchestrator/{SKILL.md,skill.json}`

- [ ] **7.1** Write `SKILL.md` (complete) in the open Agent Skills format (contracts §5):
  ```markdown
  ---
  name: themis-orchestrator
  description: >-
    Coordinates a governed, multi-step security workflow (validate → decompose →
    schedule → fan-out → guardrail → synthesise → audit) by driving the Themis MCP
    tools. Use when the user asks for a security assessment, exposure validation,
    threat hunt, or any task that should run under tool governance and an audit
    trail rather than ad-hoc tool calls.
  license: Apache-2.0 OR MIT
  metadata:
    version: "1.1.0"
    osk: "1.1"
    family: "orchestration"
  ---

  ## Scope and authorization
  - Purpose: run defensive security workflows under human-approved, audited tool use.
  - Use only on systems the operator owns or is explicitly authorized to assess.
  - Out of scope: executing actions against third-party systems without authorization; approving your own write/execute actions.

  ## The loop you MUST follow
  1. Call `themis_start_run` with the task. It returns `{ runId, step, prompt }`.
  2. Reason over `prompt` to produce the output for `step`, then call
     `themis_submit_step { runId, step, output }`. Output shapes:
     - `decompose` → `{ subTasks: [{ id, skill, task, dependsOn }] }`
     - `fanout` → `{ results: [{ subTaskId, skill, output, guardrail }] }` for every
       sub-task in the returned `ready` list — run them all, then submit together.
     - `guardrail` → `{ verdicts: [{ subTaskId, verdict }] }`
     - `synthesise` → `{ report: { summary, findings } }`
  3. Repeat until the response has `status: "completed"`. Then read the report with
     `themis_get_report { runId }`.

  ## Running sub-tasks (fan-out)
  - Where your host supports sub-agents, dispatch the `themis-subtask-runner` sub-agent
    per ready sub-task. Otherwise run them yourself, one at a time.
  - Submit ALL ready results in one `fanout` call; do not submit them one by one.

  ## Using external security tools
  - To use any registered security tool, call `themis_external_list { runId, skill }`,
    then `themis_external_call { runId, skill, tool, args, reason }`.
  - Never call those servers directly — only calls through `themis_external_call` are
    budgeted, redacted, audited, and (for writes) human-approved.

  ## Honest boundary
  - Tools you have connected directly to this host AI bypass Themis and are NOT
    governed or audited. Only tools invoked through `themis_external_call` are governed.

  ## Never self-approve
  - For a write/execute tool, approval comes from the human via your client's prompt,
    or the action is handed back for the human to run. Never attempt to approve it
    yourself or infer approval.
  ```
- [ ] **7.2** Write `skill.json` (osk 1.1, no phases, `family: "orchestration"`, matching Phase 1's sidecar shape).
- [ ] **7.3** `npm run lint:skills` passes for this skill (incl. the Scope-and-authorization check). `git commit -m "feat(themis-plugin): orchestration skill"`.

---

### Task 8 — Sub-agent definitions (executor: sonnet)

**Files:** `packages/themis-plugin/agents/{themis-subtask-runner.md,themis-guardrail-reviewer.md}`

- [ ] **8.1** Verify the Claude Code plugin sub-agent frontmatter format against current docs (name, description, tools, model). Record URL + date in a comment. If unverifiable, ship the files but mark the plugin.json `agents` wiring (Task 9.1) a STOP for the executor to confirm.
- [ ] **8.2** `themis-subtask-runner.md` (complete): frontmatter (name `themis-subtask-runner`, a description, a minimal tool allowlist incl. `themis_external_list`, `themis_external_call`, and the Aegis phase tools), body instructing it to execute one sub-task for a skill, route all external tool use through `themis_external_*`, and return a `{ subTaskId, skill, output, guardrail }` result.
- [ ] **8.3** `themis-guardrail-reviewer.md` (complete): reviews one sub-task result and returns `{ subTaskId, verdict }`.
- [ ] **8.4** Document the sequential fallback in the orchestration skill (already in 7.1) for Codex/Gemini. `git commit -m "feat(themis-plugin): sub-agent definitions"`.

---

### Task 9 — Manifests and marketplace entry (executor: haiku)

**Files:** `packages/themis-plugin/{.claude-plugin/plugin.json,.mcp.json,server.json}`, root `.claude-plugin/marketplace.json`

- [ ] **9.1** `.claude-plugin/plugin.json` (match Phase 1's plugin manifest key names):
  ```json
  {
    "name": "themis",
    "version": "1.1.0",
    "description": "Run Themis security workflows on your own AI, with human-approved, audited tool use.",
    "skills": ["./skills/themis-orchestrator"],
    "agents": ["./agents/themis-subtask-runner.md", "./agents/themis-guardrail-reviewer.md"],
    "mcpServers": "./.mcp.json"
  }
  ```
  If Phase 1's plugin.json uses a different `mcpServers` form (inline vs path), match it.
- [ ] **9.2** `.mcp.json` — exact pins, Windows-safe launch matching Phase 1's verified form:
  ```json
  {
    "mcpServers": {
      "themis": { "command": "npx", "args": ["-y", "@aegis-skills/themis-plugin@1.1.0", "themis-mcp"] },
      "aegis": { "command": "npx", "args": ["-y", "aegis-skills@1.1.0", "mcp"] }
    }
  }
  ```
  If Phase 1 wrapped Windows `npx` as `cmd /c npx …`, use the identical form. **Pre-publish testing:** wire `node packages/themis-plugin/dist/index.js` into the host's MCP config by absolute path manually — do not publish to test.
- [ ] **9.3** `server.json` (MCP Registry): `name` = `io.github.drupadsachania/themis`, `description` ≤100 chars, version `1.1.0`, package/transport matching Phase 1's `server.json` shape. Add a check asserting the description length.
- [ ] **9.4** Add the `themis` plugin to root `.claude-plugin/marketplace.json` (source `./packages/themis-plugin`, with the `version` field Phase 1/7 expect).
- [ ] **9.5** Update `scripts/check-layout.js` to register `packages/themis-plugin/**`. `git commit -m "feat(themis-plugin): plugin, mcp, registry manifests"`.

---

### Task 10 — End-to-end and resume tests (executor: sonnet)

**Files:** `test/workflow-e2e.test.ts`, `test/resume.test.ts`

- [ ] **10.1** `workflow-e2e.test.ts` (complete): connect a real MCP `Client` to the server over the in-memory transport and drive a full run with a mocked gateway, asserting the final report carries `versions.themis` and `versions.aegis`:
  ```ts
  import { Client } from '@modelcontextprotocol/sdk/client/index.js'
  import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
  import { createThemisMcpServer } from '../src/server'
  import { buildDeps } from '../src/deps'

  const text = (r: any) => JSON.parse(r.content[0].text)

  it('runs end to end over MCP and stamps versions', async () => {
    const deps = buildDeps({ storePath: ':memory:' })
    const server = createThemisMcpServer(deps)
    const [clientT, serverT] = InMemoryTransport.createLinkedPair()
    await server.connect(serverT)
    const client = new Client({ name: 'test-host', version: '0' }, { capabilities: {} })
    await client.connect(clientT)

    let r = text(await client.callTool({ name: 'themis_start_run', arguments: { task: 'assess perimeter' } }))
    const runId = r.runId
    r = text(await client.callTool({ name: 'themis_submit_step', arguments: { runId, step: 'decompose', output: { subTasks: [{ id: 's1', skill: 'attack-surface-mapping', task: 'enumerate', dependsOn: [] }] } } }))
    r = text(await client.callTool({ name: 'themis_submit_step', arguments: { runId, step: 'fanout', output: { results: [{ subTaskId: 's1', skill: 'attack-surface-mapping', output: 'ok', guardrail: 'pass' }] } } }))
    r = text(await client.callTool({ name: 'themis_submit_step', arguments: { runId, step: 'guardrail', output: { verdicts: [{ subTaskId: 's1', verdict: 'pass' }] } } }))
    r = text(await client.callTool({ name: 'themis_submit_step', arguments: { runId, step: 'synthesise', output: { report: { summary: 'done', findings: [] } } } }))
    expect(r.status).toBe('completed')
    expect(r.versions.themis).toBeTruthy(); expect(r.versions.aegis).toBeTruthy()
    await client.close(); deps.close()
  })
  ```
- [ ] **10.2** `resume.test.ts` (complete): start a run against a file-backed store in a `mkdtemp` dir; build a **fresh** `deps`/server on the same store path (simulated restart); `themis_get_run` returns the run at its last step and `themis_submit_step` continues it; an approval created before the restart is reported as needing re-proposal, not executed.
- [ ] **10.3** `npx jest --selectProjects themis-plugin` green. `git commit -m "test(themis-plugin): MCP e2e and resume"`.

---

### Task 11 — Manual host verification (executor: sonnet, then USER)

- [ ] **11.1** Write `packages/themis-plugin/docs/manual-verification.md`: build the workspace; register `node packages/themis-plugin/dist/index.js` in Claude Code's MCP config by absolute path; run the orchestrator skill on an `exposure-validation` task **with no API key**; confirm a write tool triggers an in-client approval prompt and that declining it blocks execution. This is the Mode 1 exit proof.
- [ ] **11.2** `git commit`, push, open the PR against `main` (contracts §8). Opening the PR is the executor's last step.

---

## Caveats & Pitfalls

- **Sampling is not approval.** `elicitation` (`elicitInput`) asks the human; `sampling`/`createMessage` asks the model. Approval must use elicitation only — otherwise the model can approve its own writes. (Verified 2026-10-08.)
- **stdout is sacred** — JSON-RPC only; diagnostics to stderr. No `console.log` in the server path.
- **Per-run gateways live in memory** — `executeApproved` hits the proposing instance (it holds un-redacted args). After a restart that instance is gone, so the approval is re-proposed, never executed from stored (redacted) args.
- **Idempotent submits** — hosts retry; `themis_submit_step` rejects a `step` ≠ the run's current step with `stale_step`.
- **`advance()` is sequential** — collect ready sub-task results and submit together; the schedule join advances once per stage (finding 4.6).
- **SDK internal field names** (`_registeredTools`, elicitation result shape) — confirm against 1.31.0 in P4/3.3 and adjust; do not hard-code a wrong field.
- **Windows `npx`** — match Phase 1's verified `.mcp.json` launch form.
- **No Aegis skills shipped here** — the orchestrator skill lives in this package.

## STOP conditions (in addition to contracts §1)

- P5 shows core does not auto-run deterministic steps inside `advance`.
- A `// BINDING` core function (Tasks 2.4, 4b.2) is absent or named differently and the real name can't be found.
- `elicitInput`/`getClientCapabilities` absent or shaped unlike P4.
- Any approval path reachable from a tool handler or model output (5.1 fails).
- Claude plugin `agents`/`skills` manifest keys unverifiable (Task 8/9).

## USER ACTIONS

1. **Manual host test (Task 11).**
2. **Merge the PR.**

## Out of scope (other phases)

- Autonomous LangGraph execution and the dashboard approval UI — Phase 4.
- Publishing to npm and the exact-pin bump — Phase 7.
- Directory listing of the Themis plugin — Phase 6 (waits on the Phase 7 publish, finding 6.2).

## Exit checklist

- [ ] `npm run build -w @aegis-skills/themis-plugin` succeeds; `dist/index.js` prints the ready line on stderr.
- [ ] `npx jest --selectProjects themis-plugin` green, including `approval-invariant.test.ts`.
- [ ] `node scripts/check-deps-themis.js` passes with `src/approval.ts` as the only approver.
- [ ] `node scripts/check-layout.js` passes.
- [ ] `npm run lint:skills` passes for `themis-orchestrator`.
- [ ] Root `marketplace.json` lists `themis`; `.mcp.json` uses exact `@1.1.0` pins.
- [ ] PR open against `main`; USER ACTIONS 1–2 handed over.
