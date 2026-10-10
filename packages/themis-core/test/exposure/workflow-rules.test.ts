import { coerceEdges, coerceExposure } from '../../src/exposure/coerce'
import { parseCorrelation, correlationFallback, correlationContext } from '../../src/exposure/correlate-rules'
import { deniedPlan, finalisePlan, parsePlannerResponse, passiveFallbackSteps } from '../../src/exposure/planner-rules'
import { parseImpact, impactFallback, attackPathContext } from '../../src/exposure/attackpath-rules'
import { caseFacts } from '../../src/exposure/report-rules'
import { parseExposureClassification, anchorExposureSkill } from '../../src/exposure/ingest-rules'
import { caseIdFrom, determineExploitability, deriveWorkflowState, riskDelta, noExposureImpact } from '../../src/exposure/lifecycle'
import { capabilitiesWithinDepth } from '../../src/exposure/capabilities'
import { correlateUserMessage, exposureReportUserMessage, plannerUserMessage, attackPathUserMessage, correlateSystemPrompt, plannerSystemPrompt, attackPathSystemPrompt, exposureClassifySystemPrompt, exposureReportSystemPrompt } from '../../src/prompts'
import type { ExposureRequest, PolicyResult } from '../../src/exposure/types'
import type { RiskContext } from '../../src/exposure/risk'

const req: ExposureRequest = {
  input: 'x', cve: 'CVE-1', authorization: { authorized: true, scopeConfirmed: true, targetIdentityVerified: true },
  context: { assetId: 'web-01', environments: ['cloud'], businessCriticality: 'crown-jewel' },
}
const allow: PolicyResult = { decision: 'ALLOW', reasons: ['ok'], highestDepthPermitted: 'LOW_IMPACT' }

it('coerces exposure states and caps edges at 12, defaulting evidenced=false', () => {
  expect(coerceExposure('NOPE')).toBeNull()
  const edges = coerceEdges(Array.from({ length: 20 }, () => ({ from: 'a', to: 'b' })))
  expect(edges).toHaveLength(12)
  expect(edges[0]).toEqual({ from: 'a', to: 'b', relationship: 'REACHES', confidence: 'unknown', evidenced: false })
})
it('parseCorrelation validates state, redacts rationale; fallback is conservative', () => {
  const out = parseCorrelation('{"exposure":"BAD","confidence":"high","reachable":true,"rationale":"r"}', (s) => `<${s}>`)
  expect(out).toEqual({ exposure: 'POTENTIAL_EXPOSURE', confidence: 'high', rationale: '<r>', reachable: true, affectedVersionPresent: 'unknown' })
  expect(correlationFallback().exposure).toBe('VALIDATION_REQUIRED')
  expect(correlationContext(req, '')).toEqual({ cve: 'CVE-1', product: 'unspecified', systemType: 'generic', environments: ['cloud'] })
})
it('planner keeps only allowed capability ids and gates by policy', () => {
  const allowed = capabilitiesWithinDepth('LOW_IMPACT')
  const parsed = parsePlannerResponse('{"capabilityIds":["REACHABILITY-CHECK-001","MADE-UP"]}', 'claim', allowed)
  expect(parsed.steps.map((s) => s.capabilityId)).toEqual(['REACHABILITY-CHECK-001'])
  expect(parsed.claim).toBe('claim')
  expect(finalisePlan('c', parsed.steps, allow)).toMatchObject({ blocked: false, depth: 'PASSIVE', approvalRequirements: [] })
  expect(finalisePlan('c', [], { ...allow, decision: 'REQUIRE_APPROVAL' })).toMatchObject({ blocked: true, requiresApproval: true })
  expect(deniedPlan('c', { ...allow, decision: 'DENY', reasons: ['no auth'] })).toMatchObject({ blocked: true, steps: [], blockReason: 'Policy denied: no auth' })
  expect(passiveFallbackSteps(allowed).every((s) => allowed.find((c) => c.id === s.capabilityId)?.depth === 'PASSIVE')).toBe(true)
})
it('impact: asserted crown jewel upgrades UNKNOWN; fallback never claims CONTAINED', () => {
  expect(parseImpact('{"impact":"UNKNOWN"}', true).state).toBe('CROWN_JEWEL_REACHABLE')
  expect(parseImpact('{"impact":"LIMITED","earliestBreakableEdge":"  "}', false)).toMatchObject({ state: 'LIMITED', earliestBreakableEdge: undefined })
  expect(impactFallback(false).state).toBe('UNKNOWN')
  expect(attackPathContext(req)).toEqual({ assetId: 'web-01', crownJewelAsset: true, environments: ['cloud'] })
})
it('ingest rules anchor the exposure-validation skill', () => {
  expect(parseExposureClassification('{"affectedProduct":"nginx"}', 'gen')).toEqual({ systemType: 'gen', affectedProduct: 'nginx', applicableSkills: [] })
  expect(anchorExposureSkill(['a', 'b', 'c', 'd'])).toEqual(['exposure-validation', 'a', 'b', 'c'])
  expect(anchorExposureSkill(['exposure-validation'])).toEqual(['exposure-validation'])
})
it('exploitability is CONFIRMED only with exploitation evidence', () => {
  expect(determineExploitability({ providedEvidence: [] })).toEqual({ state: 'NOT_VALIDATED', confidence: 'unknown', failure: 'NO_EXECUTION_LAYER' })
  const ev = { type: 'exploitation' as const, summary: 's', source: 'lab' }
  expect(determineExploitability({ providedEvidence: [ev] })).toEqual({ state: 'CONFIRMED', confidence: 'medium' })
  expect(determineExploitability({ providedEvidence: [ev, ev] })).toEqual({ state: 'CONFIRMED', confidence: 'high' })
})
it('derives the lifecycle state', () => {
  expect(deriveWorkflowState('NOT_APPLICABLE', 'UNKNOWN', 'NOT_VERIFIED', 'ALLOW', 'UNKNOWN')).toBe('ASSESSED')
  expect(deriveWorkflowState('POTENTIAL_EXPOSURE', 'UNKNOWN', 'FAILED', 'ALLOW', 'UNKNOWN')).toBe('REOPENED')
  expect(deriveWorkflowState('POTENTIAL_EXPOSURE', 'NOT_VALIDATED', 'NOT_VERIFIED', 'DENY', 'UNKNOWN')).toBe('BLOCKED')
  expect(deriveWorkflowState('POTENTIAL_EXPOSURE', 'NOT_VALIDATED', 'NOT_VERIFIED', 'ALLOW', 'UNKNOWN')).toBe('VALIDATION_PENDING')
})
it('risk delta is proven only by a verified-closed retest', () => {
  const ctx: RiskContext = { threatLikelihood: 1, exposure: 'VALIDATION_REQUIRED', exploitability: 'CONFIRMED', exploitabilityConfidence: 'high', criticality: 'crown-jewel', impact: 'CROWN_JEWEL_REACHABLE', detection: 'MISSED' }
  const closed = riskDelta(ctx, { remediation: 'APPLIED', verification: 'VERIFIED_CLOSED', exploitabilityAfter: 'NOT_EXPLOITABLE', rationale: '' }, 'VALIDATION_REQUIRED')
  expect(closed.proven).toBe(true)
  expect(closed.delta).toBeGreaterThan(0)
  expect(riskDelta(ctx, { remediation: 'NONE', verification: 'NOT_VERIFIED', exploitabilityAfter: 'CONFIRMED', rationale: '' }, 'VALIDATION_REQUIRED')).toMatchObject({ after: null, delta: null, proven: false })
})
it('case id is a stable hash; no-exposure impact is CONTAINED', () => {
  expect(caseIdFrom('a')).toMatch(/^exp-[0-9a-f]{16}$/)
  expect(caseIdFrom('a')).toBe(caseIdFrom('a'))
  expect(noExposureImpact()).toEqual({ state: 'CONTAINED', path: [], reachesCrownJewel: false, notes: 'No exposure — no onward path.' })
})
it('report facts carry the deterministic states only', () => {
  const facts = caseFacts({
    case: { caseId: 'c', workflowState: 'ASSESSED', states: { exposure: 'NO_EXPOSURE', exploitability: 'UNKNOWN', impact: 'CONTAINED', detection: 'NOT_TESTED', remediation: 'NONE', verification: 'NOT_VERIFIED' }, exploitabilityConfidence: 'low' },
    plan: { claim: 'c', steps: [], depth: 'PASSIVE', requiresApproval: false, approvalRequirements: [], blocked: false },
    impact: noExposureImpact(),
    risk: { before: { score: 1, band: 'informational', factors: { threatLikelihood: 0, exposure: 0, exploitability: 0, businessCriticality: 0, attackPathImpact: 0, controlWeakness: 0 }, confidence: 'low', rationale: [] }, after: null, delta: null, proven: false },
    correlationRationale: 'SECRET RATIONALE',
  })
  expect(Object.keys(facts)).toEqual(['workflowState', 'states', 'exploitabilityConfidence', 'validationFailure', 'riskBefore', 'riskAfter', 'riskBand', 'riskProven', 'impact', 'reachesCrownJewel', 'planBlocked', 'planDepth'])
  expect(JSON.stringify(facts)).not.toContain('SECRET RATIONALE')
})
it('exposure prompts mark embedded content as data', () => {
  for (const p of [exposureClassifySystemPrompt(), correlateSystemPrompt(), plannerSystemPrompt(), attackPathSystemPrompt(), exposureReportSystemPrompt()]) {
    expect(p).toMatch(/untrusted|not instructions/i)
  }
})
it('exposure user messages embed JSON context and the response contract', () => {
  expect(correlateUserMessage({ a: 1 }, 'in')).toMatch(/^<asset_context>\{"a":1\}<\/asset_context>\n<exposure_input>\nin\n<\/exposure_input>\n\nRespond with JSON:.*affectedVersionPresent/)
  expect(plannerUserMessage('c', [], 'in')).toContain('<claim>c</claim>\n<catalogue>[]</catalogue>\n')
  expect(attackPathUserMessage({ x: 1 }, 'in')).toContain('earliestBreakableEdge')
  expect(exposureReportUserMessage({ x: 1 })).toBe('<case_facts>{"x":1}</case_facts>\n\nWrite the executive summary now.')
})
