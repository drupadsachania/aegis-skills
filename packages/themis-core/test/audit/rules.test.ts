import { selectStandards } from '../../src/audit/standards'
import { score } from '../../src/audit/scorer'
import type { AuditRequest, Finding } from '../../src/audit/types'

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
