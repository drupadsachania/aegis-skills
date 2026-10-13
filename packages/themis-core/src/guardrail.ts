// Deterministic guardrail rules. The model gives a verdict; these functions
// decide everything else (secret pre-check, parsing, fail-closed defaults).
import type { GuardrailVerdict, SubTaskResult } from './types'
import { redactSecrets } from './secrets'

export const GUARDRAIL_VERDICTS: readonly GuardrailVerdict[] = ['PASS', 'FLAG', 'BLOCK']

/** Secrets in a finding force BLOCK before any model sees it. Null = go to the model. */
export function precheckSecrets(result: SubTaskResult): SubTaskResult | null {
  const redacted = redactSecrets(result.findings)
  if (redacted === result.findings) return null
  return { ...result, findings: redacted, guardrail: 'BLOCK', guardrailReason: 'Sensitive data detected in finding' }
}

/** Parse the guardrail model response; anything unexpected is BLOCK. */
export function parseGuardrailVerdict(result: SubTaskResult, content: string): SubTaskResult {
  let verdict: GuardrailVerdict = 'BLOCK'
  let reason: string | undefined
  try {
    const parsed = JSON.parse(content)
    const v = parsed?.verdict
    if (v === 'PASS' || v === 'FLAG' || v === 'BLOCK') {
      verdict = v
      reason = typeof parsed?.reason === 'string' ? parsed.reason : undefined
    }
  } catch {
    verdict = 'BLOCK'
    reason = 'Guardrail response could not be parsed'
  }
  return { ...result, guardrail: verdict, guardrailReason: verdict !== 'PASS' ? reason : undefined }
}

/** Model call failed → BLOCK for safety. */
export function guardrailFailure(result: SubTaskResult): SubTaskResult {
  return { ...result, guardrail: 'BLOCK', guardrailReason: 'Guardrail check failed' }
}

export function summariseGuardrail(results: SubTaskResult[]): { passed: number; flagged: number; blocked: number } {
  return {
    passed: results.filter((r) => r.guardrail === 'PASS').length,
    flagged: results.filter((r) => r.guardrail === 'FLAG').length,
    blocked: results.filter((r) => r.guardrail === 'BLOCK').length,
  }
}

/** Only non-BLOCKed results may reach synthesis. */
export function synthesisableResults(results: SubTaskResult[]): SubTaskResult[] {
  return results.filter((r) => r.guardrail !== 'BLOCK')
}
