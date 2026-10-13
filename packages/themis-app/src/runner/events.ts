import { EventEmitter } from 'node:events'
import type { RunState, StepId } from '@aegis-skills/themis-core'

/** SSE payloads. Metadata only: never findings, reports or tool output. */
export type RunEvent =
  | { type: 'step'; step: StepId; status: 'started' | 'completed' | 'error' }
  | { type: 'subtask'; subTaskId: string; skill: string; status: 'started' | 'completed' }
  | { type: 'approval'; approvalId: string; status: string; execution?: string }
  | { type: 'status'; status: RunState['status']; reportId?: string; error?: string }
  | { type: 'notice'; message: string }

export interface StampedEvent { seq: number; at: string; event: RunEvent }

const MAX_PER_RUN = 500

export class RunEvents {
  private readonly buf = new Map<string, StampedEvent[]>()
  private readonly em = new EventEmitter()
  private seq = 0
  constructor() { this.em.setMaxListeners(0) }

  emit(runId: string, event: RunEvent): void {
    const e: StampedEvent = { seq: ++this.seq, at: new Date().toISOString(), event }
    const list = this.buf.get(runId) ?? []
    list.push(e)
    if (list.length > MAX_PER_RUN) list.shift()
    this.buf.set(runId, list)
    this.em.emit(runId, e)
  }

  history(runId: string): StampedEvent[] { return [...(this.buf.get(runId) ?? [])] }

  subscribe(runId: string, fn: (e: StampedEvent) => void): () => void {
    this.em.on(runId, fn)
    return () => { this.em.off(runId, fn) }
  }
}
