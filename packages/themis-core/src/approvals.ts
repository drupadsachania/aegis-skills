// Approval primitives. Creating a request is open to any caller; DECIDING one
// is only ThemisStore.decideApproval, reachable from the human channels listed
// in contracts §6 (enforced by scripts/check-deps-themis.js).
import { randomUUID } from 'node:crypto'
import type { ApprovalRequest, GuardResult } from './contracts'
import { redactDeep } from './redact'
import { redactSecrets } from './secrets'

export const MAX_APPROVAL_REASON_CHARS = 1000

export function newApprovalRequest(
  input: { runId: string; serverId: string; tool: string; toolClass: 'write' | 'execute'; args: unknown; reason: string },
  now: string = new Date().toISOString(),
): ApprovalRequest {
  return {
    id: randomUUID(),
    runId: input.runId,
    serverId: input.serverId,
    tool: input.tool,
    toolClass: input.toolClass,
    args: redactDeep(input.args),
    reason: redactSecrets(String(input.reason ?? '')).slice(0, MAX_APPROVAL_REASON_CHARS),
    status: 'pending',
    decidedBy: null,
    createdAt: now,
    decidedAt: null,
  }
}

/** The single rule every executor must apply before running a write/execute action. */
export function canExecuteApproval(a: ApprovalRequest): GuardResult {
  if (a.status !== 'approved') return { ok: false, reason: `Approval is ${a.status}; only a human-approved request can run.` }
  if (a.decidedBy !== 'human') return { ok: false, reason: 'Approval was not decided by a human.' }
  return { ok: true }
}
