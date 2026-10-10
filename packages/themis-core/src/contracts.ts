// Shared Themis contracts — docs/superpowers/plans/restructure/00-contracts.md §6.
// Fields marked "Phase 2" are additions Phases 3 and 4 must adopt. Types only.
import type { OrchestrateRequest, SubTask, SubTaskResult } from './types'
import type { Finding } from './audit/types'

export type StepId = 'validate' | 'decompose' | 'schedule' | 'fanout' | 'guardrail' | 'synthesise' | 'audit'
export type StepKind = 'deterministic' | 'reasoning'

export interface GuardResult { ok: boolean; reason?: string }

export interface StepDef {
  id: StepId
  kind: StepKind
  next: StepId[]
  guard?: (run: RunState) => GuardResult   // checked before entering the step
}

export interface VersionStamp { themis: string; aegis: string; osk: string }

export interface RunState {
  runId: string
  task: string
  step: StepId
  status: 'running' | 'awaiting_approval' | 'completed' | 'failed'
  subTasks: SubTask[]
  results: SubTaskResult[]
  findings: Finding[]
  approvals: string[]            // ApprovalRequest ids
  versions: VersionStamp
  createdAt: string
  updatedAt: string
  /** Phase 2: request context checked by the validate step. */
  context: OrchestrateRequest['context']
  /** Phase 2: redacted report written by the synthesise step. */
  report: string | null
  /** Phase 2: why the run failed (status === 'failed'). */
  error: string | null
}

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
  /** Phase 2: records NEW pending requests only; throws otherwise. */
  putApproval(a: ApprovalRequest): void
  getApproval(id: string): ApprovalRequest | null
  listApprovals(filter?: { runId?: string; status?: ApprovalRequest['status'] }): ApprovalRequest[]
  /** Sets decidedBy:'human'. Phase 2: only from 'pending'; appends an approval_decided event. */
  decideApproval(id: string, decision: 'approved' | 'rejected'): ApprovalRequest
  close(): void
}
