import { canExecuteApproval, type ThemisStore } from '@aegis-skills/themis-core'
import type { Gateway, GatewayResult } from '@aegis-skills/themis-gateway'

// The ONLY function in this package permitted to call store.decideApproval.
// Reachable only from an elicitation RESPONSE (a human), never from a tool handler's
// own arguments or model output.
export async function decideFromHuman(
  store: ThemisStore, gateway: Gateway, approvalId: string, accept: boolean,
): Promise<GatewayResult> {
  const decided = store.decideApproval(approvalId, accept ? 'approved' : 'rejected') // sets decidedBy:'human', audits
  if (!accept) return { kind: 'denied', reason: 'rejected by human' }
  if (!canExecuteApproval(decided).ok) return { kind: 'denied', reason: 'approval not executable' }
  return gateway.executeApproved(approvalId) // runs on the proposing gateway instance (holds un-redacted args)
}
