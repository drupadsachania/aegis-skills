import type { ApprovalRequest, RunState } from '../contracts'

const TOOL_CLASSES = new Set(['write', 'execute'])

export function assertRun(run: RunState): void {
  if (!run || typeof run.runId !== 'string' || run.runId.length === 0) throw new Error('RunState.runId is required')
}

export function assertNewApproval(a: ApprovalRequest): void {
  if (!a || typeof a.id !== 'string' || a.id.length === 0) throw new Error('ApprovalRequest.id is required')
  if (a.status !== 'pending' || a.decidedBy !== null || a.decidedAt !== null) {
    throw new Error('putApproval only records new pending requests; decisions go through decideApproval')
  }
  if (!TOOL_CLASSES.has(a.toolClass)) throw new Error('ApprovalRequest.toolClass must be write or execute')
}

export function assertDecision(d: string): void {
  if (d !== 'approved' && d !== 'rejected') throw new Error(`invalid decision: ${d}`)
}

export function clampLimit(limit: number | undefined): number {
  const n = typeof limit === 'number' && Number.isFinite(limit) ? Math.floor(limit) : 50
  return Math.max(1, Math.min(1000, n))
}
