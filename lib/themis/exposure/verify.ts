import {
  EvidenceInput,
  ExploitabilityState,
  RemediationState,
  VerificationState,
} from './types'

export interface VerificationResult {
  remediation: RemediationState
  verification: VerificationState
  // The exploitability state AFTER remediation, derived from verification evidence.
  exploitabilityAfter: ExploitabilityState
  rationale: string
}

const APPLIED_RE = /\b(patched|patch applied|upgraded|fixed|remediated|config changed)\b/i
const INPROGRESS_RE = /\b(in progress|scheduled|pending patch|planned)\b/i
const COMPENSATING_RE = /\b(compensating control|mitigation|workaround|waf rule|blocked at)\b/i

const RETEST_PASS_RE = /\b(no longer (succeeds|exploitable)|retest (passed|clean)|proof (fails|no longer)|not reproducible)\b/i
const RETEST_FAIL_RE = /\b(still exploitable|still succeeds|retest failed|reproduced again|regressed)\b/i

/**
 * Determine remediation and verification state DETERMINISTICALLY from supplied
 * evidence. Closure requires a verification-type record showing the ORIGINAL
 * proof no longer succeeds — a remediation record alone ("ticket says patched")
 * is never sufficient to mark VERIFIED_CLOSED.
 */
export function verify(
  evidence: EvidenceInput[],
  exploitabilityBefore: ExploitabilityState,
): VerificationResult {
  const remediationEv = evidence.filter((e) => e.type === 'remediation')
  const verificationEv = evidence.filter((e) => e.type === 'verification')

  const remBlob = remediationEv.map((e) => e.summary).join(' \n ')
  const verBlob = verificationEv.map((e) => e.summary).join(' \n ')

  // Remediation state.
  let remediation: RemediationState = 'NONE'
  if (COMPENSATING_RE.test(remBlob) && !APPLIED_RE.test(remBlob)) remediation = 'COMPENSATING_CONTROL'
  else if (APPLIED_RE.test(remBlob)) remediation = 'APPLIED'
  else if (INPROGRESS_RE.test(remBlob)) remediation = 'IN_PROGRESS'

  // Verification state — requires verification evidence, not just remediation.
  let verification: VerificationState = 'NOT_VERIFIED'
  let exploitabilityAfter: ExploitabilityState = exploitabilityBefore
  let rationale = 'No verification evidence; closure not proven.'

  if (verificationEv.length > 0) {
    if (RETEST_FAIL_RE.test(verBlob)) {
      verification = 'FAILED'
      exploitabilityAfter = 'CONFIRMED'
      rationale = 'Retest shows the original proof still succeeds — reopen.'
    } else if (RETEST_PASS_RE.test(verBlob)) {
      if (remediation === 'COMPENSATING_CONTROL') {
        verification = 'PARTIAL'
        exploitabilityAfter = 'NOT_VALIDATED'
        rationale = 'Compensating control in place; underlying weakness remains (CONTROLLED).'
      } else {
        verification = 'VERIFIED_CLOSED'
        exploitabilityAfter = 'NOT_EXPLOITABLE'
        rationale = 'Retest confirms the original proof no longer succeeds.'
      }
    } else {
      verification = 'PARTIAL'
      exploitabilityAfter = 'NOT_VALIDATED'
      rationale = 'Verification evidence present but inconclusive on the original proof.'
    }
  } else if (remediation === 'APPLIED') {
    // Remediation claimed but not verified — explicitly not closed.
    verification = 'NOT_VERIFIED'
    rationale = 'Remediation reported applied but not verified by retest — not closed.'
  }

  return { remediation, verification, exploitabilityAfter, rationale }
}
