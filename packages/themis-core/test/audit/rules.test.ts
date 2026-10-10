import { selectStandards } from '../../src/audit/standards'
import { score } from '../../src/audit/scorer'
import type { AuditRequest, Finding } from '../../src/audit/types'
import { parseAuditClassification } from '../../src/audit/ingest-rules'
import { parseAssessorFindings } from '../../src/audit/assessor-rules'
import { auditClassifySystemPrompt, auditClassifyUserMessage, auditAssessSystemPrompt, auditAssessUserMessage, auditReportSystemPrompt, auditReportUserMessage } from '../../src/prompts'

function makeAuditRequest(overrides: Partial<AuditRequest> = {}): AuditRequest {
  return { input: 'Check SSH configuration for CIS compliance', inputType: 'config', standards: [], context: { environments: [] }, ...overrides }
}

describe('selectStandards', () => {
  test('empty standards with ot-network systemType returns array including iec-62443', () => {
    const req = makeAuditRequest({ standards: [] })
    const result = selectStandards(req, 'ot-network')
    expect(result).toContain('iec-62443')
  })

  test('empty standards with k8s-cluster systemType returns array including cis-l1 and nist-csf', () => {
    const req = makeAuditRequest({ standards: [] })
    const result = selectStandards(req, 'k8s-cluster')
    expect(result).toContain('cis-l1')
    expect(result).toContain('nist-csf')
  })

  test('empty standards with payment systemType returns array including pci-dss', () => {
    const req = makeAuditRequest({ standards: [] })
    const result = selectStandards(req, 'payment-processor')
    expect(result).toContain('pci-dss')
  })

  test('empty standards with health systemType returns array including hipaa', () => {
    const req = makeAuditRequest({ standards: [] })
    const result = selectStandards(req, 'health-records')
    expect(result).toContain('hipaa')
  })

  test('non-empty standards filters out invalid values', () => {
    const req = makeAuditRequest({ standards: ['cis-l1', 'not-a-standard' as never, 'hipaa'] })
    const result = selectStandards(req, 'generic')
    expect(result).toContain('cis-l1')
    expect(result).toContain('hipaa')
    expect(result).not.toContain('not-a-standard')
  })

  test('result is always capped at 4', () => {
    // Provide 5 valid standards
    const req = makeAuditRequest({
      standards: ['cis-l1', 'cis-l2', 'nist-csf', 'iso27001', 'soc2'],
    })
    const result = selectStandards(req, 'generic')
    expect(result.length).toBeLessThanOrEqual(4)
  })

  test('auto-detected result is always capped at 4', () => {
    // systemType that triggers multiple additions
    const req = makeAuditRequest({ standards: [] })
    const result = selectStandards(req, 'k8s-aws-payment-health')
    expect(result.length).toBeLessThanOrEqual(4)
  })

  test('default systemType always includes cis-l1 and nist-csf', () => {
    const req = makeAuditRequest({ standards: [] })
    const result = selectStandards(req, 'generic')
    expect(result).toContain('cis-l1')
    expect(result).toContain('nist-csf')
  })
})

describe('score', () => {
  test('counts map correctly to severity buckets', () => {
    const findings: Finding[] = [
      { controlId: '1', standard: 'cis-l1', severity: 'critical', title: '', evidence: '', recommendation: '', reference: '' },
      { controlId: '2', standard: 'cis-l1', severity: 'critical', title: '', evidence: '', recommendation: '', reference: '' },
      { controlId: '3', standard: 'cis-l1', severity: 'high', title: '', evidence: '', recommendation: '', reference: '' },
      { controlId: '4', standard: 'cis-l1', severity: 'medium', title: '', evidence: '', recommendation: '', reference: '' },
      { controlId: '5', standard: 'cis-l1', severity: 'low', title: '', evidence: '', recommendation: '', reference: '' },
      { controlId: '6', standard: 'cis-l1', severity: 'informational', title: '', evidence: '', recommendation: '', reference: '' },
    ]

    const result = score(findings)
    expect(result.critical).toBe(2)
    expect(result.high).toBe(1)
    expect(result.medium).toBe(1)
    expect(result.low).toBe(1)
    expect(result.informational).toBe(1)
    expect(result.passed).toBe(0)
  })

  test('pass findings increment passed not any severity bucket', () => {
    const findings: Finding[] = [
      { controlId: '1', standard: 'cis-l1', severity: 'pass', title: '', evidence: '', recommendation: '', reference: '' },
      { controlId: '2', standard: 'cis-l1', severity: 'pass', title: '', evidence: '', recommendation: '', reference: '' },
    ]

    const result = score(findings)
    expect(result.passed).toBe(2)
    expect(result.critical).toBe(0)
    expect(result.high).toBe(0)
    expect(result.medium).toBe(0)
    expect(result.low).toBe(0)
    expect(result.informational).toBe(0)
  })

  test('empty findings returns all zeros', () => {
    const result = score([])
    expect(result).toEqual({ critical: 0, high: 0, medium: 0, low: 0, informational: 0, passed: 0 })
  })
})

describe('audit parsers', () => {
  it('parseAuditClassification keeps valid fields and caps skills at 4', () => {
    expect(parseAuditClassification('{"systemType":"k8s","applicableSkills":["a","b",3,"c","d","e"]}', 'generic'))
      .toEqual({ systemType: 'k8s', applicableSkills: ['a', 'b', 'c', 'd'] })
    expect(parseAuditClassification('{}', 'fallback')).toEqual({ systemType: 'fallback', applicableSkills: [] })
    expect(() => parseAuditClassification('nope', 'x')).toThrow()
  })
  it('parseAssessorFindings redacts evidence and recommendation; non-arrays yield []', () => {
    const redact = jest.fn((s: string) => s.toUpperCase())
    const out = parseAssessorFindings('[{"controlId":"1","evidence":"e","recommendation":"r"}]', redact)
    expect(out[0]).toMatchObject({ controlId: '1', evidence: 'E', recommendation: 'R' })
    expect(parseAssessorFindings('{"a":1}')).toEqual([])
    expect(() => parseAssessorFindings('nope')).toThrow()
  })
})

describe('audit prompts', () => {
  it('flags embedded content as untrusted', () => {
    for (const p of [auditClassifySystemPrompt(), auditAssessSystemPrompt('cis-l1'), auditReportSystemPrompt()]) {
      expect(p).toMatch(/untrusted|not commands/i)
    }
  })
  it('interpolates the standard and its Aegis skills', () => {
    const p = auditAssessSystemPrompt('cis-l1')
    expect(p).toContain('against the cis-l1 standard')
    expect(p).toContain('Relevant Aegis skills for this assessment: application-security, network-security, endpoint-security')
  })
  it('wraps inputs and findings', () => {
    expect(auditAssessUserMessage('x')).toBe('<audit_input>\nx\n</audit_input>')
    expect(auditClassifyUserMessage('x')).toContain('<audit_input>\nx\n</audit_input>\n\nRespond with JSON:')
    expect(auditReportUserMessage([], ['cis-l1'])).toBe('<audit_findings>\n[]\n</audit_findings>\n\nStandards assessed: cis-l1. Write the executive summary now.')
  })
})
