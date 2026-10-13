import { randomUUID } from 'node:crypto'
import type { AuditEvent } from './contracts'
import { redactDeep } from './redact'

export function auditEvent(runId: string, kind: AuditEvent['kind'], data: unknown, at: string = new Date().toISOString()): AuditEvent {
  return { id: randomUUID(), runId, at, kind, data: redactDeep(data) }
}
