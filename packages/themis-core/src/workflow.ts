// THEMIS_WORKFLOW — the single workflow definition both modes run.
// Derived from the LangGraph topology in apps/web/lib/themis/graph/index.ts:
//   validate → decompose → schedule ─┬→ fanout (skill-agent ×ready) → schedule …
//                                    └→ guardrail → synthesise → audit → END
// Mode 1 calls startRun/advance directly; mode 2 maps each step onto a LangGraph
// node (LANGGRAPH_NODE_BY_STEP). advance() is pure: it never mutates its input.
import { randomUUID } from 'node:crypto'
import { ValidationError, type GuardrailVerdict, type OrchestrateRequest, type SubTaskResult } from './types'
import type { GuardResult, RunState, StepDef, StepId, VersionStamp } from './contracts'
import { sanitiseTask, validateContext } from './sanitise'
import { MAX_SUBTASKS, coerceSubTasks, normaliseSubTasks } from './planning'
import { readySubTasks, scheduleStage } from './schedule'
import { GUARDRAIL_VERDICTS, precheckSecrets } from './guardrail'
import { redactSecrets } from './secrets'

export const WORKFLOW_VERSION = '1.0.0'
const OK: GuardResult = { ok: true }
const no = (reason: string): GuardResult => ({ ok: false, reason })

const STEPS: Record<StepId, StepDef> = {
  validate: { id: 'validate', kind: 'deterministic', next: ['decompose'] },
  decompose: { id: 'decompose', kind: 'reasoning', next: ['schedule'], guard: (r) => (r.task.length > 0 ? OK : no('task is empty after validation')) },
  schedule: { id: 'schedule', kind: 'deterministic', next: ['fanout', 'guardrail'], guard: (r) => (r.subTasks.length <= MAX_SUBTASKS ? OK : no(`plan exceeds ${MAX_SUBTASKS} sub-tasks`)) },
  fanout: { id: 'fanout', kind: 'reasoning', next: ['schedule'], guard: (r) => (readySubTasks(r).length > 0 ? OK : no('no sub-task is ready to run')) },
  guardrail: { id: 'guardrail', kind: 'reasoning', next: ['synthesise'], guard: (r) => (scheduleStage(r.subTasks, r.results).kind === 'complete' ? OK : no('sub-tasks are still pending')) },
  synthesise: { id: 'synthesise', kind: 'reasoning', next: ['audit'], guard: (r) => (r.results.every((x) => GUARDRAIL_VERDICTS.includes(x.guardrail)) ? OK : no('a result has no guardrail verdict')) },
  audit: { id: 'audit', kind: 'deterministic', next: [], guard: (r) => (r.report !== null ? OK : no('no report to audit')) },
}
for (const s of Object.values(STEPS)) { Object.freeze(s.next); Object.freeze(s) }

export const THEMIS_WORKFLOW: { version: string; start: StepId; steps: Record<StepId, StepDef> } =
  Object.freeze({ version: WORKFLOW_VERSION, start: 'validate' as StepId, steps: Object.freeze(STEPS) })

/** Which node of today's hand-written LangGraph implements each step. */
export const LANGGRAPH_NODE_BY_STEP: Readonly<Record<StepId, string>> = Object.freeze({
  validate: 'validate', decompose: 'decompose', schedule: 'schedule', fanout: 'skill-agent',
  guardrail: 'guardrail', synthesise: 'synthesise', audit: 'audit',
})

/** Malformed step output: the call is rejected, the run is unchanged (retryable). */
export class StepOutputError extends Error {
  constructor(message: string) { super(message); this.name = 'StepOutputError' }
}

export function startRun(
  task: string,
  versions: VersionStamp,
  opts: { runId?: string; context?: OrchestrateRequest['context']; now?: string } = {},
): RunState {
  if (typeof task !== 'string') throw new ValidationError('task must be a string')
  const at = opts.now ?? new Date().toISOString()
  return {
    runId: opts.runId ?? randomUUID(), task, step: THEMIS_WORKFLOW.start, status: 'running',
    subTasks: [], results: [], findings: [], approvals: [], versions: { ...versions },
    createdAt: at, updatedAt: at,
    context: opts.context ?? { environments: [], attackSurfaceTags: [] }, report: null, error: null,
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0)
const CONFIDENCE = new Set(['high', 'medium', 'low'])

function arrayField(output: unknown, key: string): unknown[] {
  if (!isRecord(output) || !Array.isArray(output[key])) throw new StepOutputError(`output.${key} must be an array`)
  return output[key] as unknown[]
}

function applyOutput(run: RunState, step: StepId, output: unknown): RunState {
  switch (step) {
    case 'validate': {
      const task = sanitiseTask(run.task)
      validateContext(run.context)
      return { ...run, task }
    }
    case 'decompose': {
      const raw = arrayField(output, 'subTasks')
      const slugs = arrayField(output, 'skillSlugs').filter((s): s is string => typeof s === 'string')
      let coerced: ReturnType<typeof coerceSubTasks>
      try { coerced = coerceSubTasks(raw) } catch (e) { throw new StepOutputError((e as Error).message) }
      return { ...run, subTasks: normaliseSubTasks(coerced, slugs) }
    }
    case 'schedule':
    case 'audit':
      return run
    case 'fanout': {
      const ready = new Map(readySubTasks(run).map((t) => [t.id, t]))
      const accepted: SubTaskResult[] = []
      for (const item of arrayField(output, 'results')) {
        if (!isRecord(item)) continue
        const task = ready.get(String(item.subTaskId))
        if (!task) continue
        ready.delete(task.id)
        accepted.push({
          subTaskId: task.id,
          skill: task.skill,
          findings: redactSecrets(typeof item.findings === 'string' ? item.findings : ''),
          confidence: CONFIDENCE.has(String(item.confidence)) ? (item.confidence as SubTaskResult['confidence']) : 'low',
          guardrail: 'PASS', // placeholder until the guardrail step, as skillAgentNode does
          inputTokens: num(item.inputTokens),
          outputTokens: num(item.outputTokens),
        })
      }
      if (accepted.length === 0) throw new StepOutputError('fanout output has no result for a ready sub-task')
      return { ...run, results: [...run.results, ...accepted] }
    }
    case 'guardrail': {
      const verdicts = new Map<string, Record<string, unknown>>()
      for (const item of arrayField(output, 'results')) {
        if (isRecord(item) && typeof item.subTaskId === 'string') verdicts.set(item.subTaskId, item)
      }
      const results = run.results.map((r) => {
        const v = verdicts.get(r.subTaskId)
        if (!v) throw new StepOutputError(`guardrail output is missing sub-task ${r.subTaskId}`)
        const pre = precheckSecrets(r)
        if (pre) return pre
        const verdict: GuardrailVerdict = GUARDRAIL_VERDICTS.includes(v.guardrail as GuardrailVerdict) ? (v.guardrail as GuardrailVerdict) : 'BLOCK'
        const reason = typeof v.guardrailReason === 'string' ? redactSecrets(v.guardrailReason) : undefined
        return { ...r, guardrail: verdict, guardrailReason: verdict !== 'PASS' ? reason : undefined }
      })
      return { ...run, results }
    }
    case 'synthesise': {
      if (!isRecord(output) || typeof output.report !== 'string') throw new StepOutputError('output.report must be a string')
      return { ...run, report: redactSecrets(output.report) }
    }
  }
}

function routeAfter(run: RunState, completed: StepId): StepId | null {
  if (completed === 'schedule') return scheduleStage(run.subTasks, run.results).kind === 'dispatch' ? 'fanout' : 'guardrail'
  return THEMIS_WORKFLOW.steps[completed].next[0] ?? null
}

export function advance(run: RunState, completed: StepId, output: unknown): { run: RunState; next: StepId | null; error?: string } {
  if (run.status !== 'running') return { run, next: null, error: `run ${run.runId} is ${run.status}` }
  if (completed !== run.step) return { run, next: run.step, error: `expected step "${run.step}", got "${completed}"` }
  const now = new Date().toISOString()
  let applied: RunState
  try {
    applied = applyOutput(run, completed, output)
  } catch (e) {
    if (e instanceof StepOutputError) return { run, next: run.step, error: e.message }
    const message = e instanceof ValidationError ? e.message : 'step output could not be applied'
    return { run: { ...run, status: 'failed', error: message, updatedAt: now }, next: null, error: message }
  }
  const next = routeAfter(applied, completed)
  if (next === null) return { run: { ...applied, status: 'completed', updatedAt: now }, next: null }
  const guard = THEMIS_WORKFLOW.steps[next].guard?.(applied) ?? OK
  if (!guard.ok) {
    const message = `cannot enter "${next}": ${guard.reason}`
    return { run: { ...applied, status: 'failed', error: message, updatedAt: now }, next: null, error: message }
  }
  return { run: { ...applied, step: next, updatedAt: now }, next }
}
