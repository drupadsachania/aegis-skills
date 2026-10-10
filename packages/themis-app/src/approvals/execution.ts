import type { ApprovalRequest, ThemisStore } from '@aegis-skills/themis-core'

/**
 * What happened to an approval after the decision. Recorded by the schedule step
 * as an AuditEvent { kind: 'step', data: { approvalOutcome: { approvalId, state } } }.
 */
export type ExecutionState = 'not_run' | 'executed' | 'failed' | 'needs_reproposal' | 'not_executed'

export function executionState(store: ThemisStore, a: ApprovalRequest): ExecutionState {
  let state: ExecutionState = 'not_run'
  for (const e of store.listAudit(a.runId)) {
    const d = e.data as { approvalOutcome?: { approvalId?: string; state?: ExecutionState } } | null
    if (e.kind === 'step' && d?.approvalOutcome?.approvalId === a.id && d.approvalOutcome.state) state = d.approvalOutcome.state
  }
  return state
}
