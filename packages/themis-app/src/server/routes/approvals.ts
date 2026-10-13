import type { ApprovalRequest } from '@aegis-skills/themis-core'
import type { Router } from '../router'
import type { AppDeps } from '../deps'
import { HttpError, ID_RE, asObject, sendJson } from '../respond'
import { executionState } from '../../approvals/execution'

const STATUSES = ['pending', 'approved', 'rejected', 'expired'] as const

export function approvalView(deps: AppDeps, a: ApprovalRequest) {
  const argsRedacted = JSON.stringify(a.args ?? null).includes('[REDACTED]')
  const argsInMemory = deps.gateways.holdsArgs(a.id)
  return { ...a, execution: executionState(deps.store, a), argsInMemory, argsRedacted, willNeedReproposal: a.status === 'pending' && argsRedacted && !argsInMemory }
}

export function registerApprovalRoutes(r: Router): void {
  r.add('GET', '/api/approvals', ({ res, query, deps }) => {
    const filter: { runId?: string; status?: ApprovalRequest['status'] } = {}
    const status = query.get('status')
    const runId = query.get('runId')
    if (status !== null) {
      if (!(STATUSES as readonly string[]).includes(status)) throw new HttpError(400, 'Request invalid')
      filter.status = status as ApprovalRequest['status']
    }
    if (runId !== null) {
      if (!ID_RE.test(runId)) throw new HttpError(400, 'Request invalid')
      filter.runId = runId
    }
    sendJson(res, 200, { approvals: deps.store.listApprovals(filter).map((a) => approvalView(deps, a)) })
  })

  r.add('POST', '/api/approvals/:id/decision', async ({ res, params, body, deps }) => {
    if (!ID_RE.test(params.id)) throw new HttpError(400, 'Request invalid')
    const decision = asObject(await body()).decision
    if (decision !== 'approved' && decision !== 'rejected') throw new HttpError(400, 'Request invalid')
    const existing = deps.store.getApproval(params.id)
    if (!existing) throw new HttpError(404, 'Not found')
    if (existing.status !== 'pending') throw new HttpError(409, `Approval is already ${existing.status}`)

    // APPROVAL INVARIANT (contracts section 6): the ONLY decideApproval call in themis-app.
    // http.ts has already verified the Host allowlist, the session cookie and the Origin.
    const approval = deps.store.decideApproval(params.id, decision)

    deps.events.emit(approval.runId, { type: 'approval', approvalId: approval.id, status: approval.status })
    let runResumed = false
    const run = deps.store.getRun(approval.runId)
    if (run?.status === 'awaiting_approval' && !deps.runner.isActive(run.runId)
      && deps.store.listApprovals({ runId: run.runId, status: 'pending' }).length === 0) {
      const { done } = await deps.runner.resume(run.runId)
      done.catch(() => undefined)
      runResumed = true
    }
    sendJson(res, 200, { approval: approvalView(deps, approval), runResumed })
  })
}
