import { newApprovalRequest, canExecuteApproval } from '../src/approvals'
import { auditEvent } from '../src/audit-log'

const base = { runId: 'r1', serverId: 'osint', tool: 'create_ticket', toolClass: 'write' as const, args: { password: 'hunter2', note: 'AKIAIOSFODNN7EXAMPLE' }, reason: 'mail bob@example.com' }

it('new approvals are pending, undecided and redacted', () => {
  const a = newApprovalRequest(base, '2026-10-07T00:00:00.000Z')
  expect(a).toMatchObject({ runId: 'r1', status: 'pending', decidedBy: null, decidedAt: null, createdAt: '2026-10-07T00:00:00.000Z' })
  expect(a.id).toMatch(/^[0-9a-f-]{36}$/)
  expect(JSON.stringify(a)).not.toMatch(/hunter2|AKIA|bob@/)
})
it('only a human-approved request may execute', () => {
  const a = newApprovalRequest(base)
  expect(canExecuteApproval(a).ok).toBe(false)
  expect(canExecuteApproval({ ...a, status: 'approved', decidedBy: null }).ok).toBe(false)
  expect(canExecuteApproval({ ...a, status: 'rejected', decidedBy: 'human' }).ok).toBe(false)
  expect(canExecuteApproval({ ...a, status: 'approved', decidedBy: 'human' })).toEqual({ ok: true })
})
it('caps the reason length', () => {
  expect(newApprovalRequest({ ...base, reason: 'x'.repeat(5000) }).reason).toHaveLength(1000)
})
it('audit events get an id, timestamp and redacted data', () => {
  const e = auditEvent('r1', 'tool_call', { token: 'abc', q: 'AKIAIOSFODNN7EXAMPLE' })
  expect(e).toMatchObject({ runId: 'r1', kind: 'tool_call' })
  expect(Date.parse(e.at)).not.toBeNaN()
  expect(JSON.stringify(e.data)).not.toMatch(/abc|AKIA/)
})
