/* How core's advance() steps (verified against themis-core, Phase 2):
 *  - startRun() returns a run at 'validate'.
 *  - advance(run, completedStep, output) completes ONE step and returns { run, next, error? }.
 *    It does not run the next step itself. `next` is the next step id (deterministic or
 *    reasoning) or null once 'audit' completes the run.
 *  - Malformed output returns { error } with the run UNCHANGED (retryable). A validation or
 *    guard failure returns { error } with run.status === 'failed'.
 *  The plugin therefore loops: it auto-runs the deterministic steps (validate, schedule,
 *  audit) and pauses on the reasoning steps (decompose, fanout, guardrail, synthesise),
 *  handing the host the prompt for that step.
 */
import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  startRun, advance, redactDeep, auditEvent, readySubTasks, THEMIS_WORKFLOW,
  type RunState, type StepId,
} from '@aegis-skills/themis-core'
import type { PluginDeps } from '../deps'
import { parseStepInput, isReasoningStep } from '../step-io'
import { promptFor } from '../prompts'
import { textResult, errorResult } from '../errors'

type Driven =
  | { kind: 'paused'; run: RunState }
  | { kind: 'completed'; run: RunState }
  | { kind: 'failed'; run: RunState; error: string }
  | { kind: 'bad_output'; run: RunState; error: string }

function pausePayload(deps: PluginDeps, run: RunState) {
  const step = run.step
  if (!isReasoningStep(step)) throw new Error(`run paused on non-reasoning step ${step}`)
  const base: Record<string, unknown> = {
    runId: run.runId, step, status: run.status, versions: run.versions, prompt: promptFor(step, run, deps.skillSlugs()),
  }
  if (step === 'fanout') base.ready = readySubTasks(run).map((t) => ({ id: t.id, skill: t.skill, description: t.description }))
  return base
}

function donePayload(run: RunState) {
  return { runId: run.runId, status: 'completed', report: run.report, findings: run.findings, versions: run.versions }
}

function persist(deps: PluginDeps, run: RunState, extra: Record<string, unknown> = {}) {
  deps.store.saveRun(run)
  deps.store.appendAudit(auditEvent(run.runId, 'step', { step: run.step, status: run.status, ...extra }))
}

// Run `completed` with `output`, then auto-run deterministic steps until the run pauses on a
// reasoning step or ends. Only a fully applied transition is persisted.
function drive(deps: PluginDeps, run: RunState, completed: StepId, output: unknown): Driven {
  let r = advance(run, completed, output)
  if (r.error) {
    if (r.run.status === 'failed') { persist(deps, r.run, { error: r.error }); return { kind: 'failed', run: r.run, error: r.error } }
    return { kind: 'bad_output', run: r.run, error: r.error }
  }
  persist(deps, r.run)
  while (r.next !== null && THEMIS_WORKFLOW.steps[r.next].kind === 'deterministic') {
    r = advance(r.run, r.next, undefined)
    if (r.error) {
      persist(deps, r.run, { error: r.error })
      return { kind: 'failed', run: r.run, error: r.error }
    }
    persist(deps, r.run)
  }
  return r.next === null ? { kind: 'completed', run: r.run } : { kind: 'paused', run: r.run }
}

function respond(deps: PluginDeps, d: Driven) {
  switch (d.kind) {
    case 'paused': return textResult(pausePayload(deps, d.run))
    case 'completed': return textResult(donePayload(d.run))
    case 'failed': return textResult({ runId: d.run.runId, status: 'failed', code: 'run_failed', error: d.error })
    case 'bad_output': return textResult({ runId: d.run.runId, step: d.run.step, code: 'bad_output', error: d.error })
  }
}

const Context = z.object({
  environments: z.array(z.string()).max(20).default([]),
  attackSurfaceTags: z.array(z.string()).max(20).default([]),
}).strict()

export function registerWorkflowTools(server: McpServer, deps: PluginDeps) {
  server.tool('themis_start_run',
    'Start a governed Themis security run for a task. Returns the first reasoning step and its instructions.',
    { task: z.string().min(1), context: Context.optional() },
    async ({ task, context }) => {
      try {
        const run = startRun(task, deps.versions, { context })
        persist(deps, run, { start: true })
        return respond(deps, drive(deps, run, run.step, undefined)) // auto-runs validate
      } catch (e) { return errorResult('start_failed', e instanceof Error ? e.message : String(e)) }
    })

  server.tool('themis_submit_step',
    'Submit the host AI output for the current reasoning step and advance the run.',
    { runId: z.string(), step: z.string(), output: z.record(z.any()) },
    async ({ runId, step, output }) => {
      try {
        const run = deps.store.getRun(runId)
        if (!run) return textResult({ code: 'no_such_run', error: `no run ${runId}` })
        if (run.status !== 'running') return textResult({ code: 'run_not_running', error: `run is ${run.status}`, status: run.status })
        if (run.step !== step) return textResult({ code: 'stale_step', error: `run is at '${run.step}', not '${step}'`, step: run.step })
        if (!isReasoningStep(step)) return textResult({ code: 'not_reasoning', error: `'${step}' is not a reasoning step` })

        let core: unknown
        try {
          const parsed = parseStepInput(step, output)
          if (step === 'decompose') {
            const slugs = deps.skillSlugs()
            const subTasks = (parsed as { subTasks: { skill: string }[] }).subTasks
            if (slugs.length > 0 && !subTasks.some((t) => slugs.includes(t.skill))) {
              return textResult({ code: 'bad_output', error: `no sub-task uses a known skill. Valid skills: ${slugs.join(', ')}`, step })
            }
            core = { skillSlugs: slugs, subTasks }
          } else {
            core = parsed
          }
        } catch (e) {
          return textResult({ code: 'bad_output', error: e instanceof Error ? e.message : String(e), step })
        }
        return respond(deps, drive(deps, run, step, core))
      } catch (e) { return errorResult('submit_failed', e instanceof Error ? e.message : String(e)) }
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
    async ({ limit }) => textResult(deps.store.listRuns(limit ?? 20).map((r) =>
      ({ runId: r.runId, task: r.task, step: r.step, status: r.status, versions: r.versions }))))
}
