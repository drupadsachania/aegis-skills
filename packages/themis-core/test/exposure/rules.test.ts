import { authorize } from '../../src/exposure/policy'
import { evaluateRisk, threatLikelihoodFrom, type RiskContext } from '../../src/exposure/risk'
import { assessDetection } from '../../src/exposure/detection'
import { verify } from '../../src/exposure/verify'
import { capabilitiesWithinDepth, CAPABILITY_REGISTRY } from '../../src/exposure/capabilities'
import type { AuthorizationContext, EvidenceInput } from '../../src/exposure/types'

const fullAuth: AuthorizationContext = {
  authorized: true,
  scopeConfirmed: true,
  targetIdentityVerified: true,
  maintenanceWindow: true,
  approver: 'secops-lead',
}

describe('policy.authorize', () => {
  it('DENIES when not authorized', () => {
    const r = authorize({ authorized: false, scopeConfirmed: true, targetIdentityVerified: true }, 'PASSIVE', 'low')
    expect(r.decision).toBe('DENY')
    expect(r.highestDepthPermitted).toBe('PASSIVE')
  })

  it('DENIES when scope not confirmed', () => {
    const r = authorize({ authorized: true, scopeConfirmed: false, targetIdentityVerified: true }, 'PASSIVE', 'low')
    expect(r.decision).toBe('DENY')
  })

  it('DENIES when authorization expired', () => {
    const r = authorize(
      { authorized: true, scopeConfirmed: true, targetIdentityVerified: true, expiresAt: '2000-01-01T00:00:00Z' },
      'PASSIVE', 'low',
    )
    expect(r.decision).toBe('DENY')
    expect(r.reasons.join(' ')).toMatch(/expired/i)
  })

  it('REQUIRES target confirmation for non-passive when identity unverified', () => {
    const r = authorize(
      { authorized: true, scopeConfirmed: true, targetIdentityVerified: false, maintenanceWindow: true, approver: 'x' },
      'CONTROLLED_EXECUTION', 'low',
    )
    expect(r.decision).toBe('REQUIRE_TARGET_CONFIRMATION')
    expect(r.highestDepthPermitted).toBe('PASSIVE')
  })

  it('REQUIRES approval for controlled execution on a crown jewel without approver', () => {
    const r = authorize(
      { authorized: true, scopeConfirmed: true, targetIdentityVerified: true, maintenanceWindow: true },
      'CONTROLLED_EXECUTION', 'crown-jewel',
    )
    expect(r.decision).toBe('REQUIRE_APPROVAL')
  })

  it('REQUIRES change window for controlled execution without one', () => {
    const r = authorize(
      { authorized: true, scopeConfirmed: true, targetIdentityVerified: true, approver: 'x' },
      'CONTROLLED_EXECUTION', 'low',
    )
    expect(r.decision).toBe('REQUIRE_CHANGE_WINDOW')
  })

  it('ALLOWS low-impact on a low-criticality asset with full auth', () => {
    const r = authorize(fullAuth, 'LOW_IMPACT', 'low')
    expect(r.decision).toBe('ALLOW')
  })
})

describe('risk.evaluateRisk', () => {
  const base: RiskContext = {
    threatLikelihood: 1,
    exposure: 'VALIDATION_REQUIRED',
    exploitability: 'CONFIRMED',
    exploitabilityConfidence: 'high',
    criticality: 'crown-jewel',
    impact: 'CROWN_JEWEL_REACHABLE',
    detection: 'MISSED',
  }

  it('scores a confirmed crown-jewel exposure high', () => {
    const r = evaluateRisk(base)
    expect(r.score).toBeGreaterThan(60)
    expect(r.band).toBe('critical')
    expect(r.confidence).toBe('high')
  })

  it('collapses the score when the vulnerability is not applicable', () => {
    const r = evaluateRisk({ ...base, exposure: 'NOT_APPLICABLE' })
    expect(r.score).toBe(0)
  })

  it('collapses the score when proven not exploitable', () => {
    const r = evaluateRisk({ ...base, exploitability: 'NOT_EXPLOITABLE' })
    expect(r.score).toBeLessThan(10)
  })

  it('caps confidence to unknown when exploitability confidence is unknown', () => {
    const r = evaluateRisk({ ...base, exploitabilityConfidence: 'unknown' })
    expect(r.confidence).toBe('unknown')
    expect(r.band).toBe('unknown')
  })

  it('KEV dominates threat likelihood', () => {
    expect(threatLikelihoodFrom(true, 0.01)).toBe(1.0)
    expect(threatLikelihoodFrom(false, 0.4)).toBe(0.4)
    expect(threatLikelihoodFrom(false, undefined)).toBe(0.3)
  })
})

describe('capabilities', () => {
  it('passive ceiling yields only passive capabilities', () => {
    const caps = capabilitiesWithinDepth('PASSIVE')
    expect(caps.every((c) => c.depth === 'PASSIVE')).toBe(true)
    expect(caps.length).toBeGreaterThan(0)
  })

  it('every capability prohibits dangerous follow-on actions at controlled depth', () => {
    const controlled = CAPABILITY_REGISTRY.filter((c) => c.depth === 'CONTROLLED_EXECUTION')
    for (const c of controlled) {
      expect(c.prohibited).toEqual(expect.arrayContaining(['persistence']))
    }
  })
})

describe('detection.assessDetection', () => {
  it('returns NOT_TESTED with no telemetry evidence', () => {
    expect(assessDetection([]).state).toBe('NOT_TESTED')
  })
  it('returns PREVENTED when evidence says blocked', () => {
    const ev: EvidenceInput[] = [{ type: 'edr', summary: 'technique blocked by agent', source: 'edr' }]
    expect(assessDetection(ev).state).toBe('PREVENTED')
  })
  it('returns LOGGED_ONLY when telemetry present but no alert', () => {
    const ev: EvidenceInput[] = [{ type: 'siem', summary: 'event logged to siem', source: 'siem' }]
    expect(assessDetection(ev).state).toBe('LOGGED_ONLY')
  })
  it('returns MISSED when evidence says undetected', () => {
    const ev: EvidenceInput[] = [{ type: 'telemetry', summary: 'no alert, undetected', source: 't' }]
    expect(assessDetection(ev).state).toBe('MISSED')
  })
})

describe('verify', () => {
  it('does not close on remediation evidence alone', () => {
    const ev: EvidenceInput[] = [{ type: 'remediation', summary: 'patch applied', source: 'itsm' }]
    const r = verify(ev, 'CONFIRMED')
    expect(r.remediation).toBe('APPLIED')
    expect(r.verification).toBe('NOT_VERIFIED')
  })
  it('closes when retest shows the proof no longer succeeds', () => {
    const ev: EvidenceInput[] = [
      { type: 'remediation', summary: 'patch applied', source: 'itsm' },
      { type: 'verification', summary: 'retest passed, no longer exploitable', source: 'lab' },
    ]
    const r = verify(ev, 'CONFIRMED')
    expect(r.verification).toBe('VERIFIED_CLOSED')
    expect(r.exploitabilityAfter).toBe('NOT_EXPLOITABLE')
  })
  it('reopens when retest still succeeds', () => {
    const ev: EvidenceInput[] = [{ type: 'verification', summary: 'still exploitable after patch', source: 'lab' }]
    const r = verify(ev, 'CONFIRMED')
    expect(r.verification).toBe('FAILED')
  })
  it('is PARTIAL/CONTROLLED when only a compensating control is verified', () => {
    const ev: EvidenceInput[] = [
      { type: 'remediation', summary: 'compensating control: waf rule added', source: 'waf' },
      { type: 'verification', summary: 'retest passed via the waf rule', source: 'lab' },
    ]
    const r = verify(ev, 'CONFIRMED')
    expect(r.verification).toBe('PARTIAL')
  })
})
