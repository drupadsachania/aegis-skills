import { createHash, randomUUID } from 'node:crypto'
import {
  auditEvent, redactSecrets,
  type AuditRequest, type BusinessCriticality, type EvidenceInput, type EvidenceType, type ExposureRequest, type Standard,
} from '@aegis-skills/themis-core'
import type { Router } from '../router'
import { HttpError, asObject, sendJson } from '../respond'
import { auditMarkdown, exposureMarkdown } from '../../store/reports'

const CTRL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g
const SLUG_RE = /^[a-z0-9\-_]+$/
const CVE_RE = /^CVE-\d{4}-\d{4,}$/i
const VALID_STANDARDS: Standard[] = ['cis-l1', 'cis-l2', 'nist-csf', 'iso27001', 'soc2', 'pci-dss', 'hipaa', 'iec-62443', 'nist-800-53']
const VALID_INPUT_TYPES = ['config', 'policy', 'description', 'evidence-package'] as const
const VALID_EVIDENCE_TYPES: EvidenceType[] = ['asset', 'network', 'configuration', 'software', 'vulnerability', 'exploitation', 'telemetry', 'edr', 'siem', 'remediation', 'verification']
const VALID_CRITICALITY: BusinessCriticality[] = ['crown-jewel', 'high', 'medium', 'low', 'unknown']

const slugs = (v: unknown, max: number): string[] => (Array.isArray(v) ? v : [])
  .filter((e): e is string => typeof e === 'string' && e.length > 0 && e.length <= max && SLUG_RE.test(e))
const optSlug = (v: unknown): string | undefined => (typeof v === 'string' && v.length > 0 && v.length <= 100 && SLUG_RE.test(v) ? v : undefined)

function cleanInput(v: unknown): string {
  if (typeof v !== 'string') throw new HttpError(400, 'Request invalid')
  const input = redactSecrets(v).replace(CTRL, '')
  if (input.length > 12000) throw new HttpError(400, 'Request invalid')
  return input
}

export function parseAuditRequest(b: Record<string, unknown>): AuditRequest {
  const input = cleanInput(b.input)
  const inputType = (VALID_INPUT_TYPES as readonly string[]).includes(String(b.inputType)) ? (b.inputType as AuditRequest['inputType']) : 'description'
  const standards = (Array.isArray(b.standards) ? b.standards : []).filter((s): s is Standard => VALID_STANDARDS.includes(s as Standard))
  const ctx = typeof b.context === 'object' && b.context !== null ? (b.context as Record<string, unknown>) : {}
  return { input, inputType, standards, context: { systemType: optSlug(ctx.systemType), environments: slugs(ctx.environments, 50) } }
}

function parseEvidence(raw: unknown): EvidenceInput[] {
  return (Array.isArray(raw) ? raw : []).map((e): EvidenceInput | null => {
    if (typeof e !== 'object' || e === null) return null
    const o = e as Record<string, unknown>
    if (typeof o.type !== 'string' || !VALID_EVIDENCE_TYPES.includes(o.type as EvidenceType)) return null
    if (typeof o.summary !== 'string' || typeof o.source !== 'string') return null
    return { type: o.type as EvidenceType, summary: redactSecrets(o.summary).replace(CTRL, '').slice(0, 1000), source: o.source.replace(CTRL, '').slice(0, 120) }
  }).filter((e): e is EvidenceInput => e !== null).slice(0, 20)
}

export function parseExposureRequest(b: Record<string, unknown>): ExposureRequest {
  const input = cleanInput(b.input)
  const a = typeof b.authorization === 'object' && b.authorization !== null ? (b.authorization as Record<string, unknown>) : {}
  const ctx = typeof b.context === 'object' && b.context !== null ? (b.context as Record<string, unknown>) : {}
  return {
    input,
    cve: typeof b.cve === 'string' && CVE_RE.test(b.cve) ? b.cve.toUpperCase() : undefined,
    kevListed: b.kevListed === true,
    epss: typeof b.epss === 'number' && b.epss >= 0 && b.epss <= 1 ? b.epss : undefined,
    providedEvidence: parseEvidence(b.providedEvidence),
    authorization: {
      authorized: a.authorized === true,
      scopeConfirmed: a.scopeConfirmed === true,
      targetIdentityVerified: a.targetIdentityVerified === true,
      maintenanceWindow: a.maintenanceWindow === true,
      approver: typeof a.approver === 'string' && a.approver.length > 0 && a.approver.length <= 120 ? a.approver.replace(CTRL, '') : undefined,
      expiresAt: typeof a.expiresAt === 'string' && !Number.isNaN(Date.parse(a.expiresAt)) ? a.expiresAt : undefined,
    },
    context: {
      assetId: optSlug(ctx.assetId),
      systemType: optSlug(ctx.systemType),
      businessCriticality: VALID_CRITICALITY.includes(ctx.businessCriticality as BusinessCriticality) ? (ctx.businessCriticality as BusinessCriticality) : undefined,
      environments: slugs(ctx.environments, 50),
      crownJewel: ctx.crownJewel === true,
    },
  }
}

const sha256 = (s: string): string => createHash('sha256').update(s).digest('hex')

export function registerPipelineRoutes(r: Router): void {
  r.add('POST', '/api/audit', async ({ res, body, deps }) => {
    const b = asObject(await body())
    const req = parseAuditRequest(b)
    const provider = deps.resolveProvider(typeof b.provider === 'string' ? b.provider : undefined)
    const report = await deps.runAudit(req, provider)
    const id = randomUUID()
    const createdAt = new Date().toISOString()
    deps.reports.save({ id, kind: 'audit', runId: null, title: `Audit: ${report.standardsApplied.join(', ') || 'auto-detected'}`, createdAt, versions: deps.versions, markdown: auditMarkdown(report, deps.versions, createdAt), body: report })
    deps.store.appendAudit(auditEvent(id, 'step', { pipeline: 'audit', inputHash: sha256(req.input), standards: report.standardsApplied, severityCounts: report.summary, skills: report.skillTrace, durationMs: report.durationMs }))
    sendJson(res, 200, { ...report, reportId: id, versions: deps.versions })
  })

  r.add('POST', '/api/exposure', async ({ res, body, deps }) => {
    const b = asObject(await body())
    const req = parseExposureRequest(b)
    const provider = deps.resolveProvider(typeof b.provider === 'string' ? b.provider : undefined)
    const report = await deps.runExposure(req, provider)
    const id = randomUUID()
    const createdAt = new Date().toISOString()
    deps.reports.save({ id, kind: 'exposure', runId: null, title: `Exposure: ${report.case.cve ?? report.case.caseId}`, createdAt, versions: deps.versions, markdown: exposureMarkdown(report, deps.versions, createdAt), body: report })
    deps.store.appendAudit(auditEvent(id, 'step', { pipeline: 'exposure', caseId: report.case.caseId, workflowState: report.case.workflowState, states: report.case.states, policyDecision: report.policy.decision, riskBefore: report.risk.before.score, riskAfter: report.risk.after?.score ?? null, durationMs: report.durationMs }))
    sendJson(res, 200, { ...report, reportId: id, versions: deps.versions })
  })
}
