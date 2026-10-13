import { setup, tool, parse } from './helpers'

const auth = { authorized: true, scopeConfirmed: true, targetIdentityVerified: true }

it('validate_exposure applies the deterministic CTEM rules and never infers states', async () => {
  const { deps, server } = setup()
  const r = parse(await tool(server, 'themis_validate_exposure')({
    authorization: auth, exposure: 'VALIDATION_REQUIRED', criticality: 'crown-jewel', kevListed: true,
    evidence: [{ type: 'asset', summary: 'web-01 runs nginx', source: 'cmdb' }],
  }))
  expect(r.policy.decision).toBeDefined()
  expect(r.exploitability).toMatchObject({ state: 'NOT_VALIDATED', failure: 'NO_EXECUTION_LAYER' })
  expect(r.risk.proven).toBe(false)
  expect(r.risk.before.score).toBeGreaterThan(0)
  deps.close()
})

it('validate_exposure denies without authorization and redacts evidence secrets', async () => {
  const { deps, server } = setup()
  const r = parse(await tool(server, 'themis_validate_exposure')({
    authorization: { authorized: false, scopeConfirmed: false, targetIdentityVerified: false }, exposure: 'POTENTIAL_EXPOSURE',
    evidence: [{ type: 'configuration', summary: 'key AKIAIOSFODNN7EXAMPLE', source: 'scan' }],
  }))
  expect(r.policy.decision).toBe('DENY')
  expect(JSON.stringify(r)).not.toContain('AKIAIOSFODNN7EXAMPLE')
  deps.close()
})

it('assess_risk scores deterministically', async () => {
  const { deps, server } = setup()
  const input = { threatLikelihood: 0.9, exposure: 'VALIDATION_REQUIRED', exploitability: 'CONFIRMED', exploitabilityConfidence: 'high', criticality: 'crown-jewel', impact: 'CROWN_JEWEL_REACHABLE', detection: 'MISSED' }
  const a = parse(await tool(server, 'themis_assess_risk')({ input }))
  const b = parse(await tool(server, 'themis_assess_risk')({ input }))
  expect(a).toEqual(b)
  expect(a.score).toBeGreaterThan(50)
  deps.close()
})

it('record_finding persists to the run (redacted) and get_report returns it stamped', async () => {
  const { deps, server } = setup()
  const { runId } = parse(await tool(server, 'themis_start_run')({ task: 't' }))
  const rec = parse(await tool(server, 'themis_record_finding')({ runId, finding: {
    controlId: 'CIS-1', standard: 'cis-l1', severity: 'medium', title: 'open port', evidence: 'token AKIAIOSFODNN7EXAMPLE', recommendation: 'close it', reference: 'cis 1.1',
  } }))
  expect(rec).toEqual({ ok: true, count: 1 })
  const rep = parse(await tool(server, 'themis_get_report')({ runId }))
  expect(rep.versions.aegis).toBeTruthy()
  expect(rep.findings).toHaveLength(1)
  expect(JSON.stringify(rep)).not.toContain('AKIAIOSFODNN7EXAMPLE')
  expect(parse(await tool(server, 'themis_record_finding')({ runId: 'nope', finding: {
    controlId: 'c', standard: 'cis-l1', severity: 'low', title: 't', evidence: '', recommendation: '', reference: '' } })).code).toBe('no_such_run')
  deps.close()
})
