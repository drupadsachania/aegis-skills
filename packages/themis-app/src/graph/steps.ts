import { interrupt, Send } from '@langchain/langgraph'
import {
  advance, auditEvent, buildDebriefRecord, readySubTasks, redactSecrets, summariseGuardrail, synthesisableResults,
  type ApprovalRequest, type RunState, type StepId, type SubTaskResult, type ThemisStore,
} from '@aegis-skills/themis-core'
import type { ThemisState } from './state'
import { isApprovalOutcome } from './state'
import { withProvider } from '../providers/llm'
import type { ProviderId } from '../providers/catalog'
import { decompose } from '../reasoning/decompose'
import { applyGuardrail } from '../reasoning/guardrail'
import { synthesise } from '../reasoning/synthesise'
import { enabledSkillSlugs } from '../skills/aegis'
import { runSkillAgent, type ToolMode } from './skill-agent'
import type { RunGateways } from './run-gateways'
import type { RunEvents } from '../runner/events'
import { executionState, type ExecutionState } from '../approvals/execution'
import { themisMarkdown, type ReportsRepo } from '../store/reports'

export interface StepContext {
  store: ThemisStore
  reports: ReportsRepo
  events: RunEvents
  gateways: RunGateways
  toolMode(provider: ProviderId): ToolMode
}
export type StepImpl = (state: ThemisState, ctx: StepContext) => Promise<Partial<ThemisState>>

export class StepFailedError extends Error {
  constructor(readonly step: StepId, message: string) { super(message); this.name = 'StepFailedError' }
}

export function mustRun(ctx: StepContext, runId: string): RunState {
  const r = ctx.store.getRun(runId)
  if (!r) throw new StepFailedError('validate', `run ${runId} not found`)
  return r
}

/** The ONLY way steps move the workflow: core advance(), persisted, audited, streamed. */
export function advanceAndSave(ctx: StepContext, runId: string, step: StepId, output: unknown): RunState {
  const run = mustRun(ctx, runId)
  const r = advance(run, step, output)
  if (r.run !== run) ctx.store.saveRun(r.run)
  ctx.store.appendAudit(auditEvent(runId, 'step', { step, next: r.next, error: r.error ?? null }))
  ctx.events.emit(runId, { type: 'step', step, status: r.error ? 'error' : 'completed' })
  if (r.error) throw new StepFailedError(step, r.error)
  return r.run
}

const validateStep: StepImpl = async (s, ctx) => {
  const run = advanceAndSave(ctx, s.runId, 'validate', undefined)
  return { task: run.task, context: run.context, startTime: Date.now() }
}

const decomposeStep: StepImpl = async (s, ctx) => {
  const subTasks = await withProvider(s.provider, () => decompose({ task: s.task, context: s.context }))
  advanceAndSave(ctx, s.runId, 'decompose', { subTasks, skillSlugs: enabledSkillSlugs() })
  return {}
}

function recordApproval(ctx: StepContext, runId: string, id: string): void {
  const run = ctx.store.getRun(runId)
  if (run && !run.approvals.includes(id)) ctx.store.saveRun({ ...run, approvals: [...run.approvals, id], updatedAt: new Date().toISOString() })
  ctx.events.emit(runId, { type: 'approval', approvalId: id, status: 'pending' })
}

/** Runs (or records the non-execution of) one decided approval. Never decides anything. */
async function settleApproval(a: ApprovalRequest, s: ThemisState, ctx: StepContext): Promise<SubTaskResult> {
  const label = `${a.serverId}/${a.tool}`
  let state: ExecutionState
  let findings: string
  if (a.status === 'approved') {
    const r = await ctx.gateways.get(s.runId, s.approvalSkills[a.id] ?? '').executeApproved(a.id)
    if (r.kind === 'result') {
      state = 'executed'
      findings = r.text
    } else if (r.kind === 'denied' && /re-propose/i.test(r.reason)) {
      state = 'needs_reproposal'
      findings = `Approved action ${label} was not run: Themis restarted after it was proposed and its original arguments are no longer available. It must be proposed again in a new run.`
    } else {
      state = 'failed'
      const why = r.kind === 'denied' ? r.reason : r.kind === 'error' ? r.message : r.kind
      findings = `Approved action ${label} did not run (${why}).`
    }
  } else {
    state = 'not_executed'
    findings = `Proposed ${a.toolClass} action ${label} was rejected by a human reviewer and was not executed.`
  }
  ctx.store.appendAudit(auditEvent(s.runId, 'step', { approvalOutcome: { approvalId: a.id, state } }))
  ctx.events.emit(s.runId, { type: 'approval', approvalId: a.id, status: a.status, execution: state })
  return {
    subTaskId: `approval-${a.id}`, skill: `external:${a.serverId}`, findings: redactSecrets(findings),
    confidence: 'medium', guardrail: 'PASS', inputTokens: 0, outputTokens: 0,
  }
}

/** The join point between stages. It may re-run from the top when the run resumes. */
const scheduleStep: StepImpl = async (s, ctx) => {
  let run = mustRun(ctx, s.runId)
  if (run.step === 'fanout') {
    const have = new Set(run.results.map((r) => r.subTaskId))
    const fresh = s.stageResults.filter((r) => !isApprovalOutcome(r) && !have.has(r.subTaskId))
    run = advanceAndSave(ctx, s.runId, 'fanout', {
      results: fresh.map(({ subTaskId, findings, confidence, inputTokens, outputTokens }) => ({ subTaskId, findings, confidence, inputTokens, outputTokens })),
    })
  }
  const pending = ctx.store.listApprovals({ runId: s.runId, status: 'pending' })
  if (pending.length > 0) {
    ctx.store.saveRun({ ...run, status: 'awaiting_approval', updatedAt: new Date().toISOString() })
    ctx.events.emit(s.runId, { type: 'status', status: 'awaiting_approval' })
    interrupt({ approvalIds: pending.map((a) => a.id) }) // throws GraphInterrupt; never caught here
  }
  const settled = new Set(s.settledApprovals)
  const decided = ctx.store.listApprovals({ runId: s.runId }).filter((a) => a.status !== 'pending' && !settled.has(a.id))
  const outcomes: SubTaskResult[] = []
  for (const a of decided) outcomes.push(await settleApproval(a, s, ctx))
  advanceAndSave(ctx, s.runId, 'schedule', undefined)
  return { stageResults: outcomes, settledApprovals: decided.map((a) => a.id) }
}

/** Node "skill-agent". Never calls advance(): the next schedule node joins the stage. */
const fanoutStep: StepImpl = async (s, ctx) => {
  const sub = s.currentSubTask
  if (!sub) throw new StepFailedError('fanout', 'skill-agent node received no sub-task')
  ctx.events.emit(s.runId, { type: 'subtask', subTaskId: sub.id, skill: sub.skill, status: 'started' })
  const run = mustRun(ctx, s.runId)
  const out = await withProvider(s.provider, () => runSkillAgent(
    { runId: s.runId, provider: s.provider, mode: ctx.toolMode(s.provider), subTask: sub, priorResults: run.results },
    {
      gateways: ctx.gateways,
      onApproval: (runId, id) => recordApproval(ctx, runId, id),
      onNotice: (runId, message) => ctx.events.emit(runId, { type: 'notice', message }),
    }))
  ctx.events.emit(s.runId, { type: 'subtask', subTaskId: sub.id, skill: sub.skill, status: 'completed' })
  return {
    stageResults: [out.result], skillTrace: [sub.skill],
    totalInputTokens: out.inputTokens, totalOutputTokens: out.outputTokens, approvalSkills: out.approvalSkills,
  }
}

const guardrailStep: StepImpl = async (s, ctx) => {
  const run = mustRun(ctx, s.runId)
  const outcomes = s.stageResults.filter(isApprovalOutcome)
  const checked = await withProvider(s.provider, () => Promise.all([...run.results, ...outcomes].map((r) => applyGuardrail(r))))
  advanceAndSave(ctx, s.runId, 'guardrail', {
    results: checked.filter((r) => !isApprovalOutcome(r)).map(({ subTaskId, guardrail, guardrailReason }) => ({ subTaskId, guardrail, guardrailReason })),
  })
  return { guardedOutcomes: checked.filter(isApprovalOutcome) }
}

const synthesiseStep: StepImpl = async (s, ctx) => {
  const run = mustRun(ctx, s.runId)
  const report = await withProvider(s.provider, () => synthesise(run.task, synthesisableResults([...run.results, ...s.guardedOutcomes])))
  advanceAndSave(ctx, s.runId, 'synthesise', { report })
  return {}
}

const auditStep: StepImpl = async (s, ctx) => {
  const run = mustRun(ctx, s.runId)
  const summary = summariseGuardrail(run.results)
  const durationMs = Date.now() - (s.startTime || Date.now())
  const approvals = ctx.store.listApprovals({ runId: s.runId })
  const createdAt = new Date().toISOString()
  // Save the report first: if this throws the run fails with its findings still in the store.
  ctx.reports.save({
    id: s.runId, kind: 'themis', runId: s.runId, title: run.task.slice(0, 120), createdAt, versions: run.versions,
    markdown: themisMarkdown({
      runId: s.runId, task: run.task, report: run.report ?? '', guardrailSummary: summary,
      approvals: approvals.map((a) => ({ id: a.id, serverId: a.serverId, tool: a.tool, toolClass: a.toolClass, status: `${a.status} / ${executionState(ctx.store, a)}` })),
      versions: run.versions, durationMs, createdAt,
    }),
    body: {
      runId: s.runId, task: run.task, report: run.report, results: run.results, approvalOutcomes: s.guardedOutcomes,
      guardrailSummary: summary, skillTrace: s.skillTrace, approvals,
      totalInputTokens: s.totalInputTokens, totalOutputTokens: s.totalOutputTokens, durationMs, versions: run.versions,
    },
  })
  ctx.store.appendAudit(auditEvent(s.runId, 'step', {
    step: 'audit',
    debrief: buildDebriefRecord({ task: run.task, environmentProfile: run.context.environments, skills: s.skillTrace, results: run.results, guardrailVerdicts: summary, durationMs }),
  }))
  advanceAndSave(ctx, s.runId, 'audit', undefined)
  await ctx.gateways.closeRun(s.runId)
  return {}
}

export const STEP_IMPLS: Record<StepId, StepImpl> = {
  validate: validateStep, decompose: decomposeStep, schedule: scheduleStep, fanout: fanoutStep,
  guardrail: guardrailStep, synthesise: synthesiseStep, audit: auditStep,
}

export function makeRouter(ctx: StepContext, fanoutNode: string, exitNode: string) {
  return (s: ThemisState): Send[] | string => {
    const run = mustRun(ctx, s.runId)
    return run.step === 'fanout' ? readySubTasks(run).map((t) => new Send(fanoutNode, { ...s, currentSubTask: t })) : exitNode
  }
}
