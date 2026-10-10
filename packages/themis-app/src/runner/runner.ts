import { Command, isGraphInterrupt } from '@langchain/langgraph'
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint'
import {
  auditEvent, startRun, ProviderUnavailableError, ValidationError,
  type OrchestrateRequest, type RunState, type VersionStamp,
} from '@aegis-skills/themis-core'
import { buildThemisGraph, THEMIS_RECURSION_LIMIT, type CompiledThemisGraph } from '../graph/build'
import { StepFailedError, type StepContext } from '../graph/steps'
import type { ProviderId } from '../providers/catalog'

export class BusyError extends Error { constructor() { super('Too many concurrent runs'); this.name = 'BusyError' } }
export class ConflictError extends Error { constructor(m: string) { super(m); this.name = 'ConflictError' } }
export class NotFoundError extends Error { constructor(m = 'Not found') { super(m); this.name = 'NotFoundError' } }

export interface StartInput { task: string; context?: OrchestrateRequest['context']; provider?: string }
export interface RunnerOptions {
  ctx: StepContext
  checkpointer: BaseCheckpointSaver
  versions: () => VersionStamp
  maxConcurrentRuns: () => number
  resolveProvider: (requested?: string) => ProviderId
}

/** Message safe to show in the dashboard (never model output or stack traces). */
export function publicError(e: unknown): string {
  if (e instanceof StepFailedError) return e.message
  if (e instanceof ValidationError) return 'Request invalid'
  if (e instanceof ProviderUnavailableError) return 'AI providers unavailable'
  return 'Run failed'
}

export class Runner {
  private readonly active = new Map<string, Promise<RunState>>()
  private readonly graph: CompiledThemisGraph

  constructor(private readonly o: RunnerOptions) {
    this.graph = buildThemisGraph(o.ctx, o.checkpointer)
  }

  isActive(runId: string): boolean { return this.active.has(runId) }

  /** Validation of the task text happens in the validate step (core advance). */
  start(input: StartInput): { runId: string; done: Promise<RunState> } {
    if (this.active.size >= this.o.maxConcurrentRuns()) throw new BusyError()
    const provider = this.o.resolveProvider(input.provider)
    const context = input.context ?? { environments: [], attackSurfaceTags: [] }
    const run = startRun(input.task, this.o.versions(), { context })
    this.o.ctx.store.saveRun(run)
    this.o.ctx.store.appendAudit(auditEvent(run.runId, 'step', { started: true, provider }))
    if (this.o.ctx.toolMode(provider) === 'no-tools') {
      this.o.ctx.events.emit(run.runId, { type: 'notice', message: 'This model has no verified tool calling: sub-agents run without tools and external MCP tools are disabled for this run.' })
    }
    const done = this.launch(run.runId, { runId: run.runId, provider, task: run.task, context })
    return { runId: run.runId, done }
  }

  async resume(runId: string): Promise<{ done: Promise<RunState> }> {
    if (this.active.has(runId)) throw new ConflictError('Run is already executing')
    const run = this.o.ctx.store.getRun(runId)
    if (!run) throw new NotFoundError()
    if (run.status === 'completed') throw new ConflictError('Run is already completed')
    if (this.o.ctx.store.listApprovals({ runId, status: 'pending' }).length > 0) throw new ConflictError('Run still has pending approvals')
    const snap = await this.graph.getState(this.config(runId))
    if (snap.next.length === 0) throw new ConflictError('Nothing to resume')
    if (this.active.size >= this.o.maxConcurrentRuns()) throw new BusyError()
    const interrupted = snap.tasks.some((t) => t.interrupts.length > 0)
    this.o.ctx.store.saveRun({ ...run, status: 'running', error: null, updatedAt: new Date().toISOString() })
    return { done: this.launch(runId, interrupted ? new Command({ resume: 'decided' }) : null) }
  }

  private config(runId: string): Record<string, unknown> {
    return { configurable: { thread_id: runId }, recursionLimit: THEMIS_RECURSION_LIMIT }
  }

  private launch(runId: string, input: unknown): Promise<RunState> {
    const p = this.execute(runId, input).finally(() => this.active.delete(runId))
    this.active.set(runId, p)
    return p
  }

  private async execute(runId: string, input: unknown): Promise<RunState> {
    const { store, events } = this.o.ctx
    events.emit(runId, { type: 'status', status: 'running' })
    try {
      await this.graph.invoke(input, this.config(runId))
    } catch (e) {
      if (!isGraphInterrupt(e)) return this.fail(runId, e)
    }
    const snap = await this.graph.getState(this.config(runId))
    const run = store.getRun(runId) as RunState
    if (snap.tasks.some((t) => t.interrupts.length > 0)) {
      const waiting: RunState = run.status === 'awaiting_approval' ? run : { ...run, status: 'awaiting_approval', updatedAt: new Date().toISOString() }
      store.saveRun(waiting)
      events.emit(runId, { type: 'status', status: 'awaiting_approval' })
      return waiting
    }
    if (run.status !== 'completed') return this.fail(runId, new StepFailedError(run.step, 'Run stopped before completion'))
    events.emit(runId, { type: 'status', status: 'completed', reportId: runId })
    return run
  }

  private fail(runId: string, e: unknown): RunState {
    const { store, events } = this.o.ctx
    const run = store.getRun(runId) as RunState
    const error = run.error ?? publicError(e)
    const failed: RunState = { ...run, status: 'failed', error, updatedAt: new Date().toISOString() }
    store.saveRun(failed)
    store.appendAudit(auditEvent(runId, 'error', { error, kind: e instanceof Error ? e.name : 'Error' }))
    events.emit(runId, { type: 'status', status: 'failed', error })
    return failed // gateways stay alive: a failed run can be resumed in this process
  }
}
