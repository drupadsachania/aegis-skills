// In-memory ThemisStore with the same semantics as the sqlite store. Used by
// tests and by apps/web's LangChain adapter (no node:sqlite on the website).
import type { ApprovalRequest, AuditEvent, RunState, ThemisStore } from '../contracts'
import { auditEvent } from '../audit-log'
import { redactDeep } from '../redact'
import { assertDecision, assertNewApproval, assertRun, clampLimit } from './rules'

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

export function createMemoryStore(): ThemisStore {
  const runs = new Map<string, string>()   // JSON, mirrors the sqlite serialisation
  const audit: AuditEvent[] = []
  const approvals = new Map<string, ApprovalRequest>()
  let closed = false
  const live = (): void => { if (closed) throw new Error('store is closed') }

  return {
    saveRun(run) { live(); assertRun(run); runs.set(run.runId, JSON.stringify(run)) },
    getRun(runId) { live(); const s = runs.get(runId); return s ? (JSON.parse(s) as RunState) : null },
    listRuns(limit) {
      live()
      return [...runs.values()].map((s) => JSON.parse(s) as RunState)
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : a.runId.localeCompare(b.runId)))
        .slice(0, clampLimit(limit))
    },
    appendAudit(e) {
      live()
      if (audit.some((x) => x.id === e.id)) throw new Error(`audit event ${e.id} already exists`)
      audit.push({ id: e.id, runId: e.runId, at: e.at, kind: e.kind, data: clone(redactDeep(e.data) ?? null) })
    },
    listAudit(runId) { live(); return audit.filter((e) => e.runId === runId).map(clone) },
    putApproval(a) {
      live()
      assertNewApproval(a)
      if (approvals.has(a.id)) throw new Error(`approval ${a.id} already exists`)
      approvals.set(a.id, { ...clone(a), args: clone(redactDeep(a.args) ?? null), status: 'pending', decidedBy: null, decidedAt: null })
    },
    getApproval(id) { live(); const a = approvals.get(id); return a ? clone(a) : null },
    listApprovals(filter = {}) {
      live()
      return [...approvals.values()]
        .filter((a) => (!filter.runId || a.runId === filter.runId) && (!filter.status || a.status === filter.status))
        .map(clone)
    },
    decideApproval(id, decision) {
      live()
      assertDecision(decision)
      const a = approvals.get(id)
      if (!a || a.status !== 'pending') throw new Error(`approval ${id} is not pending or does not exist`)
      const at = new Date().toISOString()
      const next: ApprovalRequest = { ...a, status: decision, decidedBy: 'human', decidedAt: at }
      approvals.set(id, next)
      audit.push(auditEvent(a.runId, 'approval_decided', { approvalId: id, decision, decidedBy: 'human' }, at))
      return clone(next)
    },
    close() { closed = true },
  }
}
